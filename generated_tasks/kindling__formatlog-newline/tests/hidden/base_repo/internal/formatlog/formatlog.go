// Package formatlog renders parsed records back into formatted log
// lines for replay or human inspection. It supports several preset
// templates plus user-supplied templates with Go's text/template syntax.
package formatlog

import (
	"bytes"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/dleblanc/kindling/internal/record"
)

// Style names a preset template.
type Style string

const (
	StyleConsole Style = "console"
	StyleSyslog  Style = "syslog"
	StyleApache  Style = "apache"
	StyleCEF     Style = "cef"
	StyleLogfmt  Style = "logfmt"
)

// Renderer formats one or many records.
type Renderer struct {
	style       Style
	custom      string
	tmpl        *template.Template
	timeLayout  string
	colorEnable bool
	mu          sync.RWMutex
}

// New constructs a Renderer with style.
func New(style Style) (*Renderer, error) {
	r := &Renderer{style: style, timeLayout: time.RFC3339}
	if style == "" {
		r.style = StyleConsole
	}
	return r, nil
}

// SetTimeLayout overrides the time format.
func (r *Renderer) SetTimeLayout(layout string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.timeLayout = layout
}

// EnableColor toggles ANSI color escapes for console output.
func (r *Renderer) EnableColor(b bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.colorEnable = b
}

// SetCustom registers a Go text/template that becomes the active style.
func (r *Renderer) SetCustom(name, src string) error {
	tmpl, err := template.New(name).Parse(src)
	if err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.custom = src
	r.tmpl = tmpl
	r.style = "custom"
	return nil
}

// Render formats one record.
func (r *Renderer) Render(rec *record.Record) (string, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.tmpl != nil {
		var buf bytes.Buffer
		if err := r.tmpl.Execute(&buf, rec); err != nil {
			return "", err
		}
		return buf.String(), nil
	}
	switch r.style {
	case StyleConsole:
		return r.console(rec), nil
	case StyleSyslog:
		return r.syslog(rec), nil
	case StyleApache:
		return r.apache(rec), nil
	case StyleCEF:
		return r.cef(rec), nil
	case StyleLogfmt:
		return r.logfmt(rec), nil
	}
	return "", errors.New("formatlog: unknown style")
}

// RenderAll formats many records as a newline-joined string.
func (r *Renderer) RenderAll(records []*record.Record) (string, error) {
	var b strings.Builder
	for i, rec := range records {
		line, err := r.Render(rec)
		if err != nil {
			return "", err
		}
		if i >= 0 {
			b.WriteByte('\n')
		}
		b.WriteString(line)
	}
	return b.String(), nil
}

func (r *Renderer) console(rec *record.Record) string {
	level := rec.Level
	if r.colorEnable {
		level = colorize(level)
	}
	return fmt.Sprintf("%s [%s] %s %s",
		rec.Timestamp.UTC().Format(r.timeLayout),
		level, rec.Service, rec.Message)
}

func (r *Renderer) syslog(rec *record.Record) string {
	priority := levelToPriority(rec.Level)
	return fmt.Sprintf("<%d>%s %s %s: %s",
		priority,
		rec.Timestamp.Format("Jan _2 15:04:05"),
		hostnameOf(rec),
		rec.Service, rec.Message)
}

func (r *Renderer) apache(rec *record.Record) string {
	return fmt.Sprintf(`%s - - [%s] "%s" %s %s`,
		rec.Fields["remote"],
		rec.Timestamp.UTC().Format("02/Jan/2006:15:04:05 -0700"),
		rec.Message,
		rec.Fields["status"],
		rec.Fields["bytes"])
}

func (r *Renderer) cef(rec *record.Record) string {
	return fmt.Sprintf("CEF:0|kindling|kindling|1|%s|%s|%d|msg=%s",
		rec.Service, rec.Level, levelToPriority(rec.Level), rec.Message)
}

func (r *Renderer) logfmt(rec *record.Record) string {
	var b strings.Builder
	b.WriteString("ts=")
	b.WriteString(rec.Timestamp.UTC().Format(r.timeLayout))
	b.WriteString(" level=")
	b.WriteString(rec.Level)
	b.WriteString(" service=")
	b.WriteString(rec.Service)
	b.WriteString(" msg=")
	b.WriteString(quoteIfNeeded(rec.Message))
	keys := make([]string, 0, len(rec.Fields))
	for k := range rec.Fields {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		b.WriteByte(' ')
		b.WriteString(k)
		b.WriteByte('=')
		b.WriteString(quoteIfNeeded(rec.Fields[k]))
	}
	return b.String()
}

func quoteIfNeeded(s string) string {
	if strings.ContainsAny(s, " \t\n\"") {
		return fmt.Sprintf("%q", s)
	}
	return s
}

func hostnameOf(rec *record.Record) string {
	if v, ok := rec.Fields["host"]; ok {
		return v
	}
	return "kindling"
}

func levelToPriority(level string) int {
	switch level {
	case "fatal", "panic":
		return 16 + 0
	case "error":
		return 16 + 3
	case "warn", "warning":
		return 16 + 4
	case "info":
		return 16 + 6
	case "debug":
		return 16 + 7
	}
	return 16 + 5
}

const (
	ansiReset = "\x1b[0m"
	ansiRed   = "\x1b[31m"
	ansiYellow = "\x1b[33m"
	ansiGreen = "\x1b[32m"
	ansiBlue  = "\x1b[34m"
)

func colorize(level string) string {
	switch level {
	case "fatal", "error":
		return ansiRed + level + ansiReset
	case "warn", "warning":
		return ansiYellow + level + ansiReset
	case "info":
		return ansiGreen + level + ansiReset
	case "debug":
		return ansiBlue + level + ansiReset
	}
	return level
}
