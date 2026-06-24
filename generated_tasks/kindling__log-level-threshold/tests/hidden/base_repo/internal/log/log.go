// Package log is a tiny structured logger used by kindling.
//
// It writes one record per Log call to the configured sink (default
// stderr) in either text or JSON form. There is no global mutable
// state; callers hold their own *Logger.
package log

import (
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"
)

// Level is the severity of a record.
type Level int

const (
	LevelDebug Level = 10
	LevelInfo  Level = 20
	LevelWarn  Level = 30
	LevelError Level = 40
)

// ParseLevel returns the Level matching s. Unknown values fall back
// to LevelInfo.
func ParseLevel(s string) Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return LevelDebug
	case "info":
		return LevelInfo
	case "warn", "warning":
		return LevelWarn
	case "error", "err":
		return LevelError
	default:
		return LevelInfo
	}
}

// Tag returns a 4-character padded label for l.
func (l Level) Tag() string {
	switch l {
	case LevelDebug:
		return "DEBG"
	case LevelInfo:
		return "INFO"
	case LevelWarn:
		return "WARN"
	case LevelError:
		return "ERRO"
	default:
		return "????"
	}
}

// Format selects text or JSON output.
type Format int

const (
	FormatText Format = iota
	FormatJSON
)

// ParseFormat returns FormatJSON when s is "json", otherwise FormatText.
func ParseFormat(s string) Format {
	if strings.EqualFold(strings.TrimSpace(s), "json") {
		return FormatJSON
	}
	return FormatText
}

// Field is a structured key/value pair.
type Field struct {
	Key   string
	Value any
}

// F is a shorthand to construct a Field.
func F(key string, value any) Field {
	return Field{Key: key, Value: value}
}

// Logger renders one record per Log call to its sink.
type Logger struct {
	mu     sync.Mutex
	level  Level
	format Format
	sink   io.Writer
	now    func() time.Time
}

// New returns a Logger writing to w with the given level + format.
func New(w io.Writer, level Level, format Format) *Logger {
	if w == nil {
		w = os.Stderr
	}
	return &Logger{level: level, format: format, sink: w, now: time.Now}
}

// SetNow replaces the clock used for timestamps. Tests use this.
func (l *Logger) SetNow(now func() time.Time) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.now = now
}

// Level returns the current level threshold.
func (l *Logger) Level() Level {
	return l.level
}

// SetLevel changes the level threshold.
func (l *Logger) SetLevel(level Level) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.level = level
}

// Log emits a record if level >= the current threshold.
func (l *Logger) Log(level Level, msg string, fields ...Field) {
	if level <= l.level {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	ts := l.now().UTC().Format(time.RFC3339Nano)
	switch l.format {
	case FormatJSON:
		writeJSON(l.sink, ts, level, msg, fields)
	default:
		writeText(l.sink, ts, level, msg, fields)
	}
}

// Debug, Info, Warn, Error are level convenience wrappers.
func (l *Logger) Debug(msg string, fields ...Field) { l.Log(LevelDebug, msg, fields...) }
func (l *Logger) Info(msg string, fields ...Field)  { l.Log(LevelInfo, msg, fields...) }
func (l *Logger) Warn(msg string, fields ...Field)  { l.Log(LevelWarn, msg, fields...) }
func (l *Logger) Error(msg string, fields ...Field) { l.Log(LevelError, msg, fields...) }

func writeText(w io.Writer, ts string, level Level, msg string, fields []Field) {
	var sb strings.Builder
	sb.WriteString(ts)
	sb.WriteByte(' ')
	sb.WriteString(level.Tag())
	sb.WriteByte(' ')
	sb.WriteString(msg)
	for _, f := range fields {
		sb.WriteByte(' ')
		sb.WriteString(f.Key)
		sb.WriteByte('=')
		sb.WriteString(formatValue(f.Value))
	}
	sb.WriteByte('\n')
	_, _ = w.Write([]byte(sb.String()))
}

func writeJSON(w io.Writer, ts string, level Level, msg string, fields []Field) {
	var sb strings.Builder
	sb.WriteByte('{')
	sb.WriteString(`"ts":`)
	writeJSONString(&sb, ts)
	sb.WriteString(`,"level":`)
	writeJSONString(&sb, strings.ToLower(level.Tag()))
	sb.WriteString(`,"msg":`)
	writeJSONString(&sb, msg)
	for _, f := range fields {
		sb.WriteByte(',')
		writeJSONString(&sb, f.Key)
		sb.WriteByte(':')
		writeJSONValue(&sb, f.Value)
	}
	sb.WriteByte('}')
	sb.WriteByte('\n')
	_, _ = w.Write([]byte(sb.String()))
}

func formatValue(v any) string {
	s := fmt.Sprintf("%v", v)
	for _, r := range s {
		if r == ' ' || r == '"' || r == '=' {
			return fmt.Sprintf("%q", s)
		}
	}
	return s
}

func writeJSONString(sb *strings.Builder, s string) {
	sb.WriteByte('"')
	for _, r := range s {
		switch r {
		case '"':
			sb.WriteString(`\"`)
		case '\\':
			sb.WriteString(`\\`)
		case '\n':
			sb.WriteString(`\n`)
		case '\r':
			sb.WriteString(`\r`)
		case '\t':
			sb.WriteString(`\t`)
		default:
			if r < 0x20 {
				fmt.Fprintf(sb, `\u%04x`, r)
			} else {
				sb.WriteRune(r)
			}
		}
	}
	sb.WriteByte('"')
}

func writeJSONValue(sb *strings.Builder, v any) {
	switch x := v.(type) {
	case string:
		writeJSONString(sb, x)
	case bool:
		if x {
			sb.WriteString("true")
		} else {
			sb.WriteString("false")
		}
	case nil:
		sb.WriteString("null")
	case int, int32, int64, uint, uint32, uint64, float32, float64:
		fmt.Fprintf(sb, "%v", x)
	default:
		writeJSONString(sb, fmt.Sprintf("%v", x))
	}
}
