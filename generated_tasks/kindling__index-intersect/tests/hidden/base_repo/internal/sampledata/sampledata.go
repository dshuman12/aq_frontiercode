// Package sampledata bundles realistic log fixtures used by integration
// tests across the codebase. The data is deliberately verbose: it
// exercises multi-day timeranges, mixed log levels, multiple services,
// and a handful of repeated user identifiers so groupBy/topk tests have
// non-trivial inputs.
package sampledata

import (
	_ "embed"
	"strings"
)

//go:embed access.log
var rawAccess string

//go:embed app.log
var rawApp string

//go:embed audit.log
var rawAudit string

// AccessLog returns a multi-day Apache-style access log.
func AccessLog() string { return rawAccess }

// AppLog returns a structured application log.
func AppLog() string { return rawApp }

// AuditLog returns an admin audit log.
func AuditLog() string { return rawAudit }

// AccessLines returns the access log split into lines (drops trailing empty).
func AccessLines() []string { return splitLines(rawAccess) }

// AppLines returns the app log split into lines.
func AppLines() []string { return splitLines(rawApp) }

// AuditLines returns the audit log split into lines.
func AuditLines() []string { return splitLines(rawAudit) }

// Total returns the sum of bytes across all fixtures.
func Total() int { return len(rawAccess) + len(rawApp) + len(rawAudit) }

// Names returns the available fixture names.
func Names() []string { return []string{"access", "app", "audit"} }

// Get returns the named fixture, or "" if unknown.
func Get(name string) string {
	switch name {
	case "access":
		return rawAccess
	case "app":
		return rawApp
	case "audit":
		return rawAudit
	}
	return ""
}

func splitLines(s string) []string {
	out := strings.Split(s, "\n")
	if len(out) > 0 && out[len(out)-1] == "" {
		out = out[:len(out)-1]
	}
	return out
}
