// Package trace is a tiny request-ID propagation layer. It is NOT
// OpenTelemetry; we want the smallest thing that gives us "every log line
// in this request shares an ID" without a 200-package dependency tree.
//
// The package exposes:
//   - Middleware that reads or generates an X-Trace-ID and stuffs it on the
//     request context;
//   - Logger fields that read from context;
//   - A Wire helper for clients that propagates the current ID outbound.
package trace

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
)

const Header = "X-Trace-Id"

type ctxKey struct{}

// New returns a fresh hex-encoded 128-bit trace id.
func New() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		// extremely unlikely; falling back to zeroed bytes is fine
		// for tracing purposes — the value is non-load-bearing.
	}
	return hex.EncodeToString(b[:])
}

// WithID attaches id to ctx so downstream callers can read it.
func WithID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, ctxKey{}, id)
}

// IDFromContext returns the trace id attached to ctx, or "".
func IDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKey{}).(string); ok {
		return v
	}
	return ""
}

// Middleware ensures every request has a trace id and propagates it
// downstream via the response header.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(Header)
		if id == "" {
			id = New()
		}
		w.Header().Set(Header, id)
		r = r.WithContext(WithID(r.Context(), id))
		next.ServeHTTP(w, r)
	})
}

// Wire sets the trace header on r from ctx, if one is attached.
func Wire(ctx context.Context, r *http.Request) {
	if id := IDFromContext(ctx); id != "" {
		r.Header.Set(Header, id)
	}
}
