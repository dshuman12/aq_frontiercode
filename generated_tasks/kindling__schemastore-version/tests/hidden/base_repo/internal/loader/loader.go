// Package loader reads log files (JSONL or plain text) into records.
package loader

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/dleblanc/kindling/internal/record"
)

// Format selects the loader.
type Format int

const (
	// FormatAuto tries JSONL first then falls back to plain.
	FormatAuto Format = iota
	// FormatJSONL is one JSON object per line.
	FormatJSONL
	// FormatText is plain-text (one record per line, level inferred).
	FormatText
)

// ParseFormat returns the Format for s, falling back to FormatAuto.
func ParseFormat(s string) Format {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "jsonl", "json":
		return FormatJSONL
	case "text", "plain":
		return FormatText
	default:
		return FormatAuto
	}
}

// LoadFile reads path and returns the records.
func LoadFile(path string, format Format) ([]*record.Record, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return Load(f, format)
}

// Load reads from r and returns the records.
func Load(r io.Reader, format Format) ([]*record.Record, error) {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 64*1024), 4*1024*1024)
	var out []*record.Record
	lineno := 0
	for scanner.Scan() {
		lineno++
		line := scanner.Text()
		if line == "" {
			continue
		}
		rec, err := parseLine(line, format)
		if err != nil {
			return nil, fmt.Errorf("line %d: %w", lineno, err)
		}
		out = append(out, rec)
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func parseLine(line string, format Format) (*record.Record, error) {
	if format == FormatAuto {
		if strings.HasPrefix(line, "{") {
			return parseJSONLine(line)
		}
		return parseTextLine(line), nil
	}
	if format == FormatJSONL {
		return parseJSONLine(line)
	}
	return parseTextLine(line), nil
}

func parseJSONLine(line string) (*record.Record, error) {
	var raw map[string]any
	if err := json.Unmarshal([]byte(line), &raw); err != nil {
		return nil, err
	}
	rec := &record.Record{Fields: map[string]string{}}
	for k, v := range raw {
		switch k {
		case "ts", "timestamp", "time":
			rec.Timestamp = parseTimestamp(fmt.Sprintf("%v", v))
		case "level", "lvl", "severity":
			rec.Level = strings.ToLower(fmt.Sprintf("%v", v))
		case "msg", "message":
			rec.Message = fmt.Sprintf("%v", v)
		case "service", "svc", "component":
			rec.Service = fmt.Sprintf("%v", v)
		default:
			rec.Fields[k] = fmt.Sprintf("%v", v)
		}
	}
	return rec, nil
}

func parseTextLine(line string) *record.Record {
	rec := &record.Record{Message: line}
	lower := strings.ToLower(line)
	switch {
	case strings.Contains(lower, "error") || strings.Contains(lower, "err:"):
		rec.Level = "error"
	case strings.Contains(lower, "warn"):
		rec.Level = "warn"
	case strings.Contains(lower, "debug"):
		rec.Level = "debug"
	default:
		rec.Level = "info"
	}
	return rec
}

func parseTimestamp(s string) time.Time {
	for _, layout := range []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02",
	} {
		if t, err := time.Parse(layout, s); err == nil {
			return t.UTC()
		}
	}
	return time.Time{}
}
