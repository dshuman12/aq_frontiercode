// Package md is a Markdown renderer for kindling reports.
package md

import (
	"fmt"
	"strings"

	"github.com/dleblanc/kindling/internal/group"
	"github.com/dleblanc/kindling/internal/record"
)

// Records renders records as a markdown table.
func Records(recs []*record.Record) string {
	var sb strings.Builder
	sb.WriteString("| ts | level | service | message |\n")
	sb.WriteString("| --- | --- | --- | --- |\n")
	for _, r := range recs {
		fmt.Fprintf(&sb, "| %s | %s | %s | %s |\n",
			r.Timestamp.UTC().Format("2006-01-02T15:04:05Z"),
			r.Level, r.Service, r.Message)
	}
	return sb.String()
}

// Groups renders group buckets as a markdown table.
func Groups(buckets []group.Bucket) string {
	var sb strings.Builder
	sb.WriteString("| key | count |\n")
	sb.WriteString("| --- | --- |\n")
	for _, b := range buckets {
		fmt.Fprintf(&sb, "| %s | %d |\n", b.Key, b.Count)
	}
	return sb.String()
}

// Heading renders a level-N heading.
func Heading(level int, text string) string {
	if level < 1 {
		level = 1
	}
	if level > 6 {
		level = 6
	}
	return strings.Repeat("#", level) + " " + text + "\n"
}
