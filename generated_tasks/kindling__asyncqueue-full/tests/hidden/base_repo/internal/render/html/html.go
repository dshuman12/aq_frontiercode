// Package html is the HTML renderer for kindling reports.
package html

import (
	"fmt"
	"strings"

	"github.com/dleblanc/kindling/internal/group"
	"github.com/dleblanc/kindling/internal/record"
)

// Document wraps body in a minimal HTML page.
func Document(title, body string) string {
	return fmt.Sprintf("<!doctype html>\n<html><head><meta charset='utf-8'><title>%s</title>%s</head>"+
		"<body>%s</body></html>\n", EscapeText(title), defaultStyle, body)
}

const defaultStyle = `<style>
body { font: 14px/1.4 -apple-system, sans-serif; max-width: 64em; margin: 1em auto; padding: 0 1em; color: #222; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ccc; padding: 0.4em 0.6em; text-align: left; }
th { background: #f4f4f4; }
tr:nth-child(even) { background: #fafafa; }
</style>`

// EscapeText escapes &, <, >, ", ' for HTML text content.
func EscapeText(s string) string {
	var sb strings.Builder
	for _, r := range s {
		switch r {
		case '&':
			sb.WriteString("&amp;")
		case '<':
			sb.WriteString("&lt;")
		case '>':
			sb.WriteString("&gt;")
		case '"':
			sb.WriteString("&quot;")
		case '\'':
			sb.WriteString("&#39;")
		default:
			sb.WriteRune(r)
		}
	}
	return sb.String()
}

// Records renders records as an HTML table.
func Records(recs []*record.Record) string {
	var sb strings.Builder
	sb.WriteString("<table><thead><tr>")
	for _, h := range []string{"ts", "level", "service", "message"} {
		fmt.Fprintf(&sb, "<th>%s</th>", h)
	}
	sb.WriteString("</tr></thead><tbody>")
	for _, r := range recs {
		sb.WriteString("<tr>")
		fmt.Fprintf(&sb, "<td>%s</td>", EscapeText(r.Timestamp.UTC().Format("2006-01-02T15:04:05Z")))
		fmt.Fprintf(&sb, "<td>%s</td>", EscapeText(r.Level))
		fmt.Fprintf(&sb, "<td>%s</td>", EscapeText(r.Service))
		fmt.Fprintf(&sb, "<td>%s</td>", EscapeText(r.Message))
		sb.WriteString("</tr>")
	}
	sb.WriteString("</tbody></table>")
	return sb.String()
}

// Groups renders group buckets as an HTML table.
func Groups(buckets []group.Bucket) string {
	var sb strings.Builder
	sb.WriteString("<table><thead><tr><th>key</th><th>count</th></tr></thead><tbody>")
	for _, b := range buckets {
		fmt.Fprintf(&sb, "<tr><td>%s</td><td>%d</td></tr>", EscapeText(b.Key), b.Count)
	}
	sb.WriteString("</tbody></table>")
	return sb.String()
}
