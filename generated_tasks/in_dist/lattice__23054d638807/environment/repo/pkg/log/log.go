// Package log provides the structured logger implementation that
// satisfies types.Logger. It's a thin wrapper around the standard
// library's slog with a few opinions baked in:
//
//   - Default output is line-formatted (text) for human readability.
//     Set LATTICE_LOG_FORMAT=json to switch to JSON.
//   - Default level is Info. -v on the CLI bumps to Debug.
//   - The "time" field is omitted in test runs (LATTICE_LOG_NO_TIME=1)
//     so golden-file tests don't churn.
package log

import (
	"log/slog"
	"os"

	"github.com/manojgowda/lattice/pkg/types"
)

// New returns a Logger writing to stderr at the given level. fmt is
// either "text" or "json"; an unrecognized value falls back to text.
func New(level types.Level, format string) types.Logger {
	opts := &slog.HandlerOptions{Level: toSlogLevel(level)}
	if os.Getenv("LATTICE_LOG_NO_TIME") == "1" {
		opts.ReplaceAttr = stripTime
	}
	var handler slog.Handler
	switch format {
	case "json":
		handler = slog.NewJSONHandler(os.Stderr, opts)
	default:
		handler = slog.NewTextHandler(os.Stderr, opts)
	}
	return &slogAdapter{l: slog.New(handler)}
}

// slogAdapter implements types.Logger over a *slog.Logger.
type slogAdapter struct {
	l *slog.Logger
}

func (s *slogAdapter) Log(level types.Level, msg string, fields map[string]any) {
	attrs := make([]slog.Attr, 0, len(fields))
	for k, v := range fields {
		attrs = append(attrs, slog.Any(k, v))
	}
	s.l.LogAttrs(nil, toSlogLevel(level), msg, attrs...)
}

func (s *slogAdapter) With(fields map[string]any) types.Logger {
	args := make([]any, 0, len(fields)*2)
	for k, v := range fields {
		args = append(args, k, v)
	}
	return &slogAdapter{l: s.l.With(args...)}
}

func toSlogLevel(level types.Level) slog.Level {
	switch level {
	case types.LevelDebug:
		return slog.LevelDebug
	case types.LevelInfo:
		return slog.LevelInfo
	case types.LevelWarn:
		return slog.LevelWarn
	case types.LevelError:
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func stripTime(_ []string, attr slog.Attr) slog.Attr {
	if attr.Key == slog.TimeKey {
		return slog.Attr{}
	}
	return attr
}
