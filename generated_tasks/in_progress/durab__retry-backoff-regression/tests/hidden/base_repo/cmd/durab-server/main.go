package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/vishaljakhar/durab/internal/api"
	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/metrics"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/internal/ui"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "durab-server:", err)
		os.Exit(1)
	}
}

func run() error {
	var (
		addr     = flag.String("addr", ":7233", "HTTP listen address")
		dbPath   = flag.String("db", "durab.db", "sqlite db path; use ':memory:' for ephemeral")
		logLevel = flag.String("log", "info", "log level: debug|info|warn|error")
	)
	flag.Parse()

	lg := log.New(os.Stderr, parseLevel(*logLevel))

	store, err := storage.OpenSQLite(*dbPath)
	if err != nil {
		return fmt.Errorf("open store: %w", err)
	}
	defer store.Close()

	eng := engine.New(store, clock.System{}, lg)

	reg := metrics.New()
	eng.SetMetrics(engine.MetricsHooks{
		WorkflowsStarted:   reg.NewCounter("durab_workflows_started_total", "workflows started"),
		WorkflowsCompleted: reg.NewCounter("durab_workflows_completed_total", "workflows completed"),
		WorkflowsFailed:    reg.NewCounter("durab_workflows_failed_total", "workflows failed"),
		SignalsTotal:       reg.NewCounter("durab_signals_total", "signals received"),
		TasksEnqueued:      reg.NewCounter("durab_tasks_enqueued_total", "tasks enqueued"),
	})

	srv := api.New(eng, lg)

	mux := http.NewServeMux()
	mux.Handle("/metrics", reg.Handler())
	mux.Handle("/ui/", http.StripPrefix("/ui/", ui.Handler()))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			http.Redirect(w, r, "/ui/", http.StatusFound)
			return
		}
		srv.Handler().ServeHTTP(w, r)
	})

	hs := &http.Server{
		Addr:              *addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	errCh := make(chan error, 2)
	go func() {
		lg.Info(ctx, "durab-server listening", "addr", *addr, "db", *dbPath)
		if err := hs.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- fmt.Errorf("http: %w", err)
		}
	}()
	go func() {
		if err := eng.TickLoop(ctx, 100*time.Millisecond); err != nil && !errors.Is(err, context.Canceled) {
			errCh <- fmt.Errorf("tick: %w", err)
		}
	}()
	go func() {
		if err := eng.ScheduleLoop(ctx, time.Second); err != nil && !errors.Is(err, context.Canceled) {
			errCh <- fmt.Errorf("schedule: %w", err)
		}
	}()
	go func() {
		if err := eng.TimeoutLoop(ctx, 5*time.Second); err != nil && !errors.Is(err, context.Canceled) {
			errCh <- fmt.Errorf("timeout: %w", err)
		}
	}()
	go func() {
		if err := eng.ActivityTimeoutLoop(ctx, 5*time.Second); err != nil && !errors.Is(err, context.Canceled) {
			errCh <- fmt.Errorf("activity timeout: %w", err)
		}
	}()

	select {
	case <-ctx.Done():
		lg.Info(context.Background(), "shutting down")
	case err := <-errCh:
		lg.Error(context.Background(), "server error", "err", err)
	}

	shCtx, shCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shCancel()
	return hs.Shutdown(shCtx)
}

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
