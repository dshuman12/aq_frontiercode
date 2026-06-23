package cache

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// extractTarball reads a gzipped tar at blobPath and writes its entries
// under destRoot. File permissions are preserved; symlinks are skipped
// (the cache never captures symlinks — outputs are always real files).
func extractTarball(blobPath, destRoot string) error {
	if blobPath == "" {
		return nil
	}
	f, err := os.Open(blobPath)
	if err != nil {
		return fmt.Errorf("restore: open blob: %w", err)
	}
	defer f.Close()

	gz, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("restore: gzip reader: %w", err)
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("restore: tar next: %w", err)
		}
		// Reject entries that try to escape destRoot via path traversal.
		clean := filepath.Clean(hdr.Name)
		if filepath.IsAbs(clean) || hasParentTraversal(clean) {
			return fmt.Errorf("restore: refusing unsafe path %q", hdr.Name)
		}
		dest := filepath.Join(destRoot, clean)

		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(dest, os.FileMode(hdr.Mode)|0o700); err != nil {
				return fmt.Errorf("restore: mkdir %s: %w", dest, err)
			}
		case tar.TypeReg, tar.TypeRegA:
			if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
				return fmt.Errorf("restore: mkdir parent: %w", err)
			}
			f, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(hdr.Mode))
			if err != nil {
				return fmt.Errorf("restore: open %s: %w", dest, err)
			}
			if _, err := io.Copy(f, tr); err != nil {
				_ = f.Close()
				return fmt.Errorf("restore: copy %s: %w", dest, err)
			}
			if err := f.Close(); err != nil {
				return fmt.Errorf("restore: close %s: %w", dest, err)
			}
		default:
			// Skip symlinks, hardlinks, devices. The cache never writes
			// these; if we see one, the blob was tampered with.
			continue
		}
	}
	return nil
}

// hasParentTraversal reports whether a cleaned path contains ".." as a
// segment. Used to reject paths that try to escape the destination.
func hasParentTraversal(clean string) bool {
	for _, seg := range filepath.SplitList(clean) {
		if seg == ".." {
			return true
		}
	}
	// SplitList only splits on os.PathListSeparator; for our case we
	// also need slash-aware splitting.
	for _, seg := range splitSegments(clean) {
		if seg == ".." {
			return true
		}
	}
	return false
}

func splitSegments(p string) []string {
	var out []string
	cur := ""
	for _, r := range p {
		if r == '/' || r == filepath.Separator {
			if cur != "" {
				out = append(out, cur)
				cur = ""
			}
			continue
		}
		cur += string(r)
	}
	if cur != "" {
		out = append(out, cur)
	}
	return out
}

// CreateTarball is the inverse of extractTarball. The scheduler calls it
// after a successful task to package the task's output files.
//
// Outputs are recorded relative to projectRoot so the cached blob can be
// restored into a different working directory later. Skips files that
// don't exist (a task can declare an output it didn't produce — that
// becomes a warning, not a failure).
func CreateTarball(blobPath, projectRoot string, outputs []string) error {
	if blobPath == "" {
		return fmt.Errorf("CreateTarball: empty blob path")
	}
	if len(outputs) == 0 {
		// No declared outputs — nothing to capture. The scheduler still
		// records the entry; restoring it later is a no-op.
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(blobPath), 0o755); err != nil {
		return fmt.Errorf("CreateTarball: mkdir parent: %w", err)
	}

	f, err := os.Create(blobPath)
	if err != nil {
		return fmt.Errorf("CreateTarball: create %s: %w", blobPath, err)
	}
	defer f.Close()

	gz := gzip.NewWriter(f)
	defer gz.Close()

	tw := tar.NewWriter(gz)
	defer tw.Close()

	files, err := expandGlobs(projectRoot, outputs)
	if err != nil {
		return fmt.Errorf("CreateTarball: expand outputs: %w", err)
	}

	for _, abs := range files {
		rel, err := filepath.Rel(projectRoot, abs)
		if err != nil {
			rel = abs
		}
		info, err := os.Stat(abs)
		if err != nil {
			// Output declared but not produced — skip.
			continue
		}
		hdr, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return fmt.Errorf("CreateTarball: header for %s: %w", abs, err)
		}
		hdr.Name = rel
		if err := tw.WriteHeader(hdr); err != nil {
			return fmt.Errorf("CreateTarball: write header: %w", err)
		}
		if !info.IsDir() {
			rf, err := os.Open(abs)
			if err != nil {
				return fmt.Errorf("CreateTarball: open %s: %w", abs, err)
			}
			if _, err := io.Copy(tw, rf); err != nil {
				_ = rf.Close()
				return fmt.Errorf("CreateTarball: copy %s: %w", abs, err)
			}
			_ = rf.Close()
		}
	}
	return nil
}
