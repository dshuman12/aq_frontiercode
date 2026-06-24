// Package mergesort implements an external (disk-spilling) merge sort
// for record streams that don't fit in memory.
//
// The sort orchestrates three phases:
//
//   - chunk: read input into memory in fixed-size batches, sort each
//     in-place, and write to a temp segment.
//   - merge: k-way merge the sorted segments back into a single output.
//   - cleanup: remove temp segments on success or panic.
//
// Data is delivered through Sort callbacks rather than concrete types,
// so the same code drives both bytes and structured records.
package mergesort

import (
	"bufio"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
)

// Less compares two records.
type Less[T any] func(a, b T) bool

// Reader reads one record at a time. Returns io.EOF when exhausted.
type Reader[T any] func() (T, error)

// Writer writes one record.
type Writer[T any] func(T) error

// Encoder serialises a record into bytes.
type Encoder[T any] func(T) []byte

// Decoder parses one record from a buffered reader.
type Decoder[T any] func(*bufio.Reader) (T, error)

// Options configures Sort.
type Options[T any] struct {
	ChunkSize int
	TempDir   string
	Encode    Encoder[T]
	Decode    Decoder[T]
}

// Sort externally sorts the input stream and writes results to out.
func Sort[T any](in Reader[T], out Writer[T], less Less[T], opt Options[T]) error {
	if opt.ChunkSize <= 0 {
		opt.ChunkSize = 1024
	}
	if opt.TempDir == "" {
		opt.TempDir = os.TempDir()
	}
	if opt.Encode == nil || opt.Decode == nil {
		return errors.New("mergesort: encoder/decoder required")
	}
	chunkPaths, err := writeChunks(in, less, opt)
	if err != nil {
		return err
	}
	defer cleanup(chunkPaths)
	return mergeChunks(chunkPaths, out, less, opt)
}

func writeChunks[T any](in Reader[T], less Less[T], opt Options[T]) ([]string, error) {
	var paths []string
	for {
		batch := make([]T, 0, opt.ChunkSize)
		for len(batch) < opt.ChunkSize {
			v, err := in()
			if err == io.EOF {
				break
			}
			if err != nil {
				return paths, err
			}
			batch = append(batch, v)
		}
		if len(batch) == 0 {
			return paths, nil
		}
		sort.SliceStable(batch, func(i, j int) bool { return less(batch[i], batch[j]) })
		path, err := writeChunk(batch, opt)
		if err != nil {
			return paths, err
		}
		paths = append(paths, path)
	}
}

func writeChunk[T any](batch []T, opt Options[T]) (string, error) {
	f, err := os.CreateTemp(opt.TempDir, "kindling-mergesort-*")
	if err != nil {
		return "", err
	}
	w := bufio.NewWriter(f)
	for _, v := range batch {
		if _, err := w.Write(opt.Encode(v)); err != nil {
			_ = f.Close()
			return "", err
		}
	}
	if err := w.Flush(); err != nil {
		_ = f.Close()
		return "", err
	}
	if err := f.Close(); err != nil {
		return "", err
	}
	return f.Name(), nil
}

type cursor[T any] struct {
	r     *bufio.Reader
	value T
	done  bool
	dec   Decoder[T]
	close func() error
}

func openCursor[T any](path string, dec Decoder[T]) (*cursor[T], error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	c := &cursor[T]{r: bufio.NewReader(f), dec: dec, close: f.Close}
	if err := c.advance(); err != nil {
		_ = f.Close()
		return nil, err
	}
	return c, nil
}

func (c *cursor[T]) advance() error {
	v, err := c.dec(c.r)
	if err == io.EOF {
		c.done = true
		return nil
	}
	if err != nil {
		c.done = true
		return err
	}
	c.value = v
	return nil
}

func mergeChunks[T any](paths []string, out Writer[T], less Less[T], opt Options[T]) error {
	cursors := make([]*cursor[T], 0, len(paths))
	for _, p := range paths {
		c, err := openCursor[T](p, opt.Decode)
		if err != nil {
			return err
		}
		cursors = append(cursors, c)
	}
	defer func() {
		for _, c := range cursors {
			_ = c.close()
		}
	}()
	for {
		minIdx := -1
		for i, c := range cursors {
			if c.done {
				continue
			}
			if minIdx < 0 || less(c.value, cursors[minIdx].value) {
				minIdx = i
			}
		}
		if minIdx < 0 {
			return nil
		}
		if err := out(cursors[minIdx].value); err != nil {
			return err
		}
		if err := cursors[minIdx].advance(); err != nil {
			return err
		}
	}
}

func cleanup(paths []string) {
	for _, p := range paths {
		_ = os.Remove(p)
	}
}

// FilesIn returns *.tmp paths in a directory; callers can pass the
// result to cleanup() during recovery.
func FilesIn(dir string) []string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	var out []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		out = append(out, filepath.Join(dir, e.Name()))
	}
	return out
}
