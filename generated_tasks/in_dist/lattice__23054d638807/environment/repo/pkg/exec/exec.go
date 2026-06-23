// Package exec runs a single task as a subprocess. It is intentionally
// minimal: env merging, command spawning, output capture, signal
// forwarding. The scheduler is responsible for parallelism and caching;
// this package is a thin wrapper over os/exec.
package exec

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	osexec "os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"sync"
	"syscall"
	"time"

	"github.com/manojgowda/lattice/pkg/types"
)

// Runner spawns subprocesses for tasks. A single Runner is safe for
// concurrent use from many goroutines — every Run call gets its own
// subprocess.
type Runner struct {
	// Shell is the shell binary to use for command interpretation.
	// Empty string means "/bin/sh" on Unix and "cmd" on Windows.
	Shell string

	// LogDir is where captured stdout/stderr files are written. The
	// scheduler points this at the project's cache stdout/stderr dirs.
	LogDir string
}

// New creates a Runner with sensible defaults.
func New(shell, logDir string) *Runner {
	if shell == "" {
		if runtime.GOOS == "windows" {
			shell = "cmd"
		} else {
			shell = "/bin/sh"
		}
	}
	return &Runner{Shell: shell, LogDir: logDir}
}

// Options tunes a single Run call.
type Options struct {
	// ProjectRoot is the absolute path of the project. Used as the
	// subprocess working directory if Task.Dir is empty.
	ProjectRoot string

	// ProjectEnv is the project-level env layer. Merged onto os.Environ
	// before task-level env is applied.
	ProjectEnv map[string]string

	// Stdout/Stderr are where we tee live output. Either or both can be
	// nil (we always also write to disk for the cache layer).
	Stdout io.Writer
	Stderr io.Writer
}

// ExecResult is returned by Run. The scheduler combines this with
// timing/cache info to produce the user-visible types.Result.
type ExecResult struct {
	ExitCode     int
	StdoutPath   string
	StderrPath   string
	OutputHashes map[string]string
}

// Run executes a single task. Returns an ExecResult and a non-nil error
// only if the subprocess failed to start or was killed by a signal.
// Non-zero exit codes are reported in ExecResult.ExitCode but do NOT
// produce an error — the caller decides what to do with them.
func (r *Runner) Run(ctx context.Context, task *types.Task, opts Options) (ExecResult, error) {
	if task == nil {
		return ExecResult{}, errors.New("exec.Run: nil task")
	}
	if task.Command == "" {
		return ExecResult{}, errors.New("exec.Run: empty command")
	}

	// Resolve working directory.
	wd := opts.ProjectRoot
	if task.Dir != "" {
		if filepath.IsAbs(task.Dir) {
			wd = task.Dir
		} else {
			wd = filepath.Join(opts.ProjectRoot, task.Dir)
		}
	}
	if wd == "" {
		var err error
		wd, err = os.Getwd()
		if err != nil {
			return ExecResult{}, fmt.Errorf("exec.Run: getwd: %w", err)
		}
	}

	// Build env. OS first, then project, then task. Later layers
	// overwrite earlier ones. We do this here rather than calling into
	// pkg/env because pkg/env handles the broader CLI override and
	// .env-file layering — by the time we get here the higher layers
	// are baked into ProjectEnv.
	env := mergeEnv(os.Environ(), opts.ProjectEnv, task.Env)

	// Apply timeout.
	cmdCtx := ctx
	if task.Timeout > 0 {
		var cancel context.CancelFunc
		cmdCtx, cancel = context.WithTimeout(ctx, task.Timeout)
		defer cancel()
	}

	// Construct the command.
	shell := r.Shell
	if shell == "" {
		shell = "/bin/sh"
	}
	var args []string
	if runtime.GOOS == "windows" {
		args = []string{"/c", task.Command}
	} else {
		args = []string{"-c", task.Command}
	}
	cmd := osexec.CommandContext(cmdCtx, shell, args...)
	cmd.Dir = wd
	cmd.Env = env

	// Open log files for cache capture, and tee to opts.Stdout/Stderr.
	stdoutPath, stderrPath, err := r.openLogFiles(task.Name)
	if err != nil {
		return ExecResult{}, err
	}
	stdoutF, _ := os.OpenFile(stdoutPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	stderrF, _ := os.OpenFile(stderrPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	defer func() {
		if stdoutF != nil {
			_ = stdoutF.Close()
		}
		if stderrF != nil {
			_ = stderrF.Close()
		}
	}()

	stdoutW := io.Writer(stdoutF)
	stderrW := io.Writer(stderrF)
	if opts.Stdout != nil {
		stdoutW = io.MultiWriter(stdoutF, opts.Stdout)
	}
	if opts.Stderr != nil {
		stderrW = io.MultiWriter(stderrF, opts.Stderr)
	}
	cmd.Stdout = stdoutW
	cmd.Stderr = stderrW

	// Put the subprocess in its own process group so we can signal the
	// whole tree. NOTE: only sets the pgid for the immediate child; it
	// does NOT recurse into grandchildren that double-fork. This is the
	// signal-propagation gap (architecture.md bug #5). Catching every
	// stray descendant requires PR_SET_CHILD_SUBREAPER on Linux or a
	// session leader, which we don't do here.
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	// Wire signal forwarding: when the parent context is canceled (the
	// scheduler stopping the run), send SIGTERM to our process group.
	if err := cmd.Start(); err != nil {
		return ExecResult{}, fmt.Errorf("exec.Run: start: %w", err)
	}

	done := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		select {
		case <-cmdCtx.Done():
			// Signal the process group. Negative pid targets the group.
			pgid, err := syscall.Getpgid(cmd.Process.Pid)
			if err == nil {
				_ = syscall.Kill(-pgid, syscall.SIGTERM)
				// Give it a moment to exit cleanly, then SIGKILL.
				select {
				case <-done:
				case <-time.After(500 * time.Millisecond):
					_ = syscall.Kill(-pgid, syscall.SIGKILL)
				}
			}
		case <-done:
		}
	}()

	waitErr := cmd.Wait()
	close(done)
	wg.Wait()

	exitCode := 0
	if waitErr != nil {
		var ee *osexec.ExitError
		if errors.As(waitErr, &ee) {
			exitCode = ee.ExitCode()
		} else {
			return ExecResult{
				StdoutPath: stdoutPath,
				StderrPath: stderrPath,
			}, fmt.Errorf("exec.Run: wait: %w", waitErr)
		}
	}

	// Hash declared outputs so the cache layer can detect drift.
	hashes := make(map[string]string, len(task.Outputs))
	for _, pat := range task.Outputs {
		// Outputs may be glob patterns or literal paths. We do a plain
		// expansion for hashing — this is best-effort, not a guarantee.
		paths, _ := filepath.Glob(filepath.Join(opts.ProjectRoot, pat))
		for _, p := range paths {
			info, err := os.Stat(p)
			if err != nil || info.IsDir() {
				continue
			}
			h, err := sha256File(p)
			if err != nil {
				continue
			}
			rel, _ := filepath.Rel(opts.ProjectRoot, p)
			hashes[rel] = h
		}
	}

	return ExecResult{
		ExitCode:     exitCode,
		StdoutPath:   stdoutPath,
		StderrPath:   stderrPath,
		OutputHashes: hashes,
	}, nil
}

// mergeEnv layers env sources. Later layers overwrite earlier ones for
// the same key. Returns a slice of "KEY=VALUE" strings ready to assign
// to *exec.Cmd.Env.
func mergeEnv(base []string, layers ...map[string]string) []string {
	merged := make(map[string]string, len(base))
	for _, kv := range base {
		for i := 0; i < len(kv); i++ {
			if kv[i] == '=' {
				merged[kv[:i]] = kv[i+1:]
				break
			}
		}
	}
	for _, layer := range layers {
		for k, v := range layer {
			merged[k] = v
		}
	}
	keys := make([]string, 0, len(merged))
	for k := range merged {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make([]string, 0, len(keys))
	for _, k := range keys {
		out = append(out, k+"="+merged[k])
	}
	return out
}

// openLogFiles returns paths for the task's stdout and stderr capture
// files, creating their parent directory if needed.
func (r *Runner) openLogFiles(taskName string) (string, string, error) {
	if r.LogDir == "" {
		// No log dir configured — write to a temp location.
		dir, err := os.MkdirTemp("", "lattice-exec-")
		if err != nil {
			return "", "", err
		}
		r.LogDir = dir
	}
	if err := os.MkdirAll(r.LogDir, 0o755); err != nil {
		return "", "", err
	}
	safe := safeName(taskName)
	stdoutPath := filepath.Join(r.LogDir, safe+".stdout.log")
	stderrPath := filepath.Join(r.LogDir, safe+".stderr.log")
	return stdoutPath, stderrPath, nil
}

// safeName makes a task name safe for use as a filename: only
// alphanumerics, dashes, and underscores survive.
func safeName(name string) string {
	out := make([]byte, 0, len(name))
	prevWasUnderscore := false
	for i := 0; i < len(name); i++ {
		c := name[i]
		switch {
		case c >= 'a' && c <= 'z',
			c >= 'A' && c <= 'Z',
			c >= '0' && c <= '9',
			c == '-' || c == '_':
			out = append(out, c)
			prevWasUnderscore = c == '_'
		default:
			// Collapse runs of unsafe characters to a single underscore
			// so "lint::go" becomes "lint_go" rather than "lint__go".
			if !prevWasUnderscore {
				out = append(out, '_')
				prevWasUnderscore = true
			}
		}
	}
	if len(out) == 0 {
		return "task"
	}
	return string(out)
}

// sha256File returns the hex SHA-256 digest of a file's contents.
func sha256File(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}
