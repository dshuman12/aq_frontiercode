// Package traces implements minimal W3C Trace Context (traceparent +
// tracestate) propagation for kindling's HTTP boundary.
package traces

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
)

// Context is one parsed trace context.
type Context struct {
	Version    string
	TraceID    string
	SpanID     string
	Flags      string
	TraceState map[string]string
}

// ParseTraceParent parses a traceparent header.
func ParseTraceParent(h string) (Context, error) {
	parts := strings.Split(h, "-")
	if len(parts) != 4 {
		return Context{}, errors.New("traces: traceparent must have 4 segments")
	}
	if len(parts[0]) != 2 || len(parts[1]) != 32 || len(parts[2]) != 16 || len(parts[3]) != 2 {
		return Context{}, errors.New("traces: malformed traceparent segment lengths")
	}
	return Context{
		Version: parts[0],
		TraceID: parts[1],
		SpanID:  parts[2],
		Flags:   parts[3],
	}, nil
}

// FormatTraceParent renders c.
func FormatTraceParent(c Context) string {
	if c.Version == "" {
		c.Version = "00"
	}
	if c.Flags == "" {
		c.Flags = "01"
	}
	return c.Version + "-" + c.TraceID + "-" + c.SpanID + "-" + c.Flags
}

// ParseTraceState parses a tracestate header into a map.
func ParseTraceState(h string) map[string]string {
	out := map[string]string{}
	if h == "" {
		return out
	}
	for _, item := range strings.Split(h, ",") {
		item = strings.TrimSpace(item)
		eq := strings.IndexByte(item, '=')
		if eq < 0 {
			continue
		}
		out[item[:eq]] = item[eq+1:]
	}
	return out
}

// FormatTraceState renders state as a deterministic header.
func FormatTraceState(state map[string]string) string {
	keys := make([]string, 0, len(state))
	for k := range state {
		keys = append(keys, k)
	}
	// sort for stable output
	for i := 1; i < len(keys); i++ {
		for j := i; j > 0 && keys[j-1] > keys[j]; j-- {
			keys[j-1], keys[j] = keys[j], keys[j-1]
		}
	}
	parts := make([]string, len(keys))
	for i, k := range keys {
		parts[i] = k + "=" + state[k]
	}
	return strings.Join(parts, ",")
}

// NewTraceID returns a fresh 16-byte hex trace id.
func NewTraceID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

// NewSpanID returns a fresh 8-byte hex span id.
func NewSpanID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

// IsSampled reports whether c.Flags marks the trace as sampled.
func IsSampled(c Context) bool {
	if len(c.Flags) != 2 {
		return false
	}
	switch c.Flags[1] {
	case '1', '3', '5', '7', '9', 'b', 'd', 'f':
		return true
	}
	return false
}
