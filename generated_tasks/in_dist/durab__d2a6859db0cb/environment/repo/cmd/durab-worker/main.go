package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/internal/wasm"
	"github.com/vishaljakhar/durab/internal/worker"
	"github.com/vishaljakhar/durab/pkg/types"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "durab-worker:", err)
		os.Exit(1)
	}
}

func run() error {
	var (
		dbPath     = flag.String("db", "durab.db", "shared sqlite path with the server")
		queue      = flag.String("queue", "default", "task queue to poll")
		workerID   = flag.String("id", "", "worker id; auto-generated if empty")
		workflows  multiPath
		activities multiPath
		logLevel   = flag.String("log", "info", "log level")
		interval   = flag.Duration("interval", 100*time.Millisecond, "idle poll interval")
		concurrency = flag.Int("concurrency", 1, "parallel pollers (>=1)")
	)
	flag.Var(&workflows, "wf", "workflow_type=path.wasm (repeatable)")
	flag.Var(&activities, "act", "activity_type=path.wasm (repeatable)")
	flag.Parse()

	lg := log.New(os.Stderr, parseLevel(*logLevel))

	store, err := storage.OpenSQLite(*dbPath)
	if err != nil {
		return fmt.Errorf("open store: %w", err)
	}
	defer store.Close()

	eng := engine.New(store, clock.System{}, lg)

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	rt := wasm.NewRuntime(ctx, lg)
	defer rt.Close(ctx)

	w := worker.New(eng, rt, worker.Options{ID: *workerID, Log: lg, Clock: clock.System{}})

	for _, spec := range workflows {
		typ, path, err := parseSpec(spec)
		if err != nil {
			return err
		}
		mod, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read workflow module %s: %w", path, err)
		}
		if err := w.RegisterWorkflow(ctx, typ, mod); err != nil {
			return fmt.Errorf("register workflow %s: %w", typ, err)
		}
		lg.Info(ctx, "registered workflow", "type", typ, "path", filepath.Base(path))
	}
	for _, spec := range activities {
		typ, path, err := parseSpec(spec)
		if err != nil {
			return err
		}
		mod, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read activity module %s: %w", path, err)
		}
		if err := w.RegisterActivity(ctx, typ, mod); err != nil {
			return fmt.Errorf("register activity %s: %w", typ, err)
		}
		lg.Info(ctx, "registered activity", "type", typ, "path", filepath.Base(path))
	}

	lg.Info(ctx, "durab-worker starting", "queue", *queue, "id", w.DescribeID(), "concurrency", *concurrency)
	if err := w.RunPool(ctx, types.TaskQueue(*queue), *concurrency, *interval); err != nil && !errors.Is(err, context.Canceled) {
		return err
	}
	return nil
}

func parseSpec(s string) (typ, path string, err error) {
	i := strings.IndexByte(s, '=')
	if i <= 0 {
		return "", "", fmt.Errorf("bad spec %q: want type=path.wasm", s)
	}
	return s[:i], s[i+1:], nil
}

// multiPath is a flag.Value that accumulates repeated flag uses.
type multiPath []string

func (m *multiPath) String() string     { return strings.Join(*m, ",") }
func (m *multiPath) Set(v string) error { *m = append(*m, v); return nil }

func parseLevel(s string) slog.Level {
	switch s {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	}
	return slog.LevelInfo
}
