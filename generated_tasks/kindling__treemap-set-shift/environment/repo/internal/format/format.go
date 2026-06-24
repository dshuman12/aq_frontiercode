// Package format renders records and aggregations as text, JSON, CSV.
package format

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/dleblanc/kindling/internal/bucket"
	"github.com/dleblanc/kindling/internal/group"
	"github.com/dleblanc/kindling/internal/record"
)

// TextRecords formats records as one line each (RFC3339 ts | level |
// service | message | fields).
func TextRecords(recs []*record.Record) string {
	var sb strings.Builder
	for _, r := range recs {
		sb.WriteString(r.Timestamp.UTC().Format(time.RFC3339))
		sb.WriteString(" | ")
		sb.WriteString(padOr(r.Level, "info", 5))
		sb.WriteString(" | ")
		sb.WriteString(padOr(r.Service, "-", 12))
		sb.WriteString(" | ")
		sb.WriteString(r.Message)
		for _, k := range r.FieldNames() {
			if k == "level" || k == "service" || k == "message" {
				continue
			}
			sb.WriteByte(' ')
			sb.WriteString(k)
			sb.WriteByte('=')
			sb.WriteString(r.Fields[k])
		}
		sb.WriteByte('\n')
	}
	return sb.String()
}

func padOr(s, fallback string, width int) string {
	if s == "" {
		s = fallback
	}
	if len(s) >= width {
		return s
	}
	return s + strings.Repeat(" ", width-len(s))
}

// JSONRecords renders records as JSON-line output.
func JSONRecords(recs []*record.Record) (string, error) {
	var sb strings.Builder
	for _, r := range recs {
		row := map[string]any{
			"ts":      r.Timestamp.UTC().Format(time.RFC3339),
			"level":   r.Level,
			"service": r.Service,
			"msg":     r.Message,
		}
		for k, v := range r.Fields {
			if _, taken := row[k]; !taken {
				row[k] = v
			}
		}
		bytes, err := json.Marshal(row)
		if err != nil {
			return "", err
		}
		sb.Write(bytes)
		sb.WriteByte('\n')
	}
	return sb.String(), nil
}

// CSVRecords renders records as a CSV with a header row.
func CSVRecords(recs []*record.Record) string {
	var sb strings.Builder
	sb.WriteString("ts,level,service,message\n")
	for _, r := range recs {
		sb.WriteString(r.Timestamp.UTC().Format(time.RFC3339))
		sb.WriteByte(',')
		sb.WriteString(escapeCSV(r.Level))
		sb.WriteByte(',')
		sb.WriteString(escapeCSV(r.Service))
		sb.WriteByte(',')
		sb.WriteString(escapeCSV(r.Message))
		sb.WriteByte('\n')
	}
	return sb.String()
}

func escapeCSV(s string) string {
	if !strings.ContainsAny(s, ",\"\n") {
		return s
	}
	return "\"" + strings.ReplaceAll(s, "\"", "\"\"") + "\""
}

// TextGroups renders group buckets as a fixed-width table.
func TextGroups(buckets []group.Bucket) string {
	var sb strings.Builder
	sb.WriteString("count    key\n")
	sb.WriteString("-----    ---\n")
	for _, b := range buckets {
		fmt.Fprintf(&sb, "%-8d %s\n", b.Count, b.Key)
	}
	return sb.String()
}

// JSONGroups renders group buckets as a JSON array.
func JSONGroups(buckets []group.Bucket) (string, error) {
	rows := make([]map[string]any, 0, len(buckets))
	for _, b := range buckets {
		rows = append(rows, map[string]any{
			"key":   b.Key,
			"count": b.Count,
		})
	}
	bytes, err := json.Marshal(rows)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// TextBuckets renders time-bucket cells as a sparkline-style table.
func TextBuckets(cells []bucket.Cell) string {
	var sb strings.Builder
	sb.WriteString("time                       count\n")
	sb.WriteString("------------------------   -----\n")
	for _, c := range cells {
		fmt.Fprintf(&sb, "%-25s %d\n", c.BucketStart.UTC().Format(time.RFC3339), c.Count)
	}
	return sb.String()
}
