// Package log wraps slog so callers don't import slog directly. Reasons:
// 1) every workflow/activity attribute needs a stable key — we centralise
// them here; 2) we want the option to swap out the handler without touching
// every call site; 3) workflow code MUST log through the host shim (which
// goes through Logger), never through fmt.Print, so we keep this surface
// small.
package log

import (
	"context"
	"io"
	"log/slog"
	"os"
)

type Logger struct{ s *slog.Logger }

// New returns a Logger writing JSON to w at level lvl.
func New(w io.Writer, lvl slog.Level) *Logger {
	if w == nil {
		w = os.Stderr
	}
	return &Logger{s: slog.New(slog.NewJSONHandler(w, &slog.HandlerOptions{Level: lvl}))}
}

// Default is the package-global Logger; tests should construct their own.
var Default = New(os.Stderr, slog.LevelInfo)

func (l *Logger) Debug(ctx context.Context, msg string, kv ...any) {
	l.s.LogAttrs(ctx, slog.LevelDebug, msg, toAttrs(kv)...)
}
func (l *Logger) Info(ctx context.Context, msg string, kv ...any) {
	l.s.LogAttrs(ctx, slog.LevelInfo, msg, toAttrs(kv)...)
}
func (l *Logger) Warn(ctx context.Context, msg string, kv ...any) {
	l.s.LogAttrs(ctx, slog.LevelWarn, msg, toAttrs(kv)...)
}
func (l *Logger) Error(ctx context.Context, msg string, kv ...any) {
	l.s.LogAttrs(ctx, slog.LevelError, msg, toAttrs(kv)...)
}

// With returns a child logger that carries kv as default attrs.
func (l *Logger) With(kv ...any) *Logger {
	return &Logger{s: l.s.With(kv...)}
}

func toAttrs(kv []any) []slog.Attr {
	if len(kv)%2 != 0 {
		kv = append(kv, "<missing>")
	}
	out := make([]slog.Attr, 0, len(kv)/2)
	for i := 0; i < len(kv); i += 2 {
		k, _ := kv[i].(string)
		out = append(out, slog.Any(k, kv[i+1]))
	}
	return out
}
