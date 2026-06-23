package log

import (
	"context"
	"io"
	"log/slog"
	"os"
)

type Logger struct{ s *slog.Logger }

func New(w io.Writer, lvl slog.Level) *Logger {
	if w == nil {
		w = os.Stderr
	}
	return &Logger{s: slog.New(slog.NewJSONHandler(w, &slog.HandlerOptions{Level: lvl}))}
}

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
