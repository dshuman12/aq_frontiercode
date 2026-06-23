// Package auth supplies the small auth surface the HTTP layer needs. Token
// validation is intentionally simple — opaque static tokens keyed to a
// namespace + role — because nothing in durab today justifies a real
// OAuth/JWT layer. Replace this whole package, not its callers, when that
// changes.
package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/pkg/types"
)

// Role is the permissions group a token belongs to.
type Role string

const (
	RoleAdmin  Role = "admin"
	RoleClient Role = "client"
	RoleWorker Role = "worker"
)

// Token is the in-memory representation of an API token.
type Token struct {
	Value     string
	Namespace types.Namespace
	Role      Role
}

// Allows reports whether t can perform action.
func (t Token) Allows(action string) bool {
	if t.Role == RoleAdmin {
		return true
	}
	switch action {
	case "workflow.read", "workflow.list":
		return t.Role == RoleClient || t.Role == RoleWorker
	case "workflow.start", "workflow.signal", "workflow.terminate":
		return t.Role == RoleClient
	case "task.poll", "task.complete":
		return t.Role == RoleWorker
	case "schedule.read", "schedule.list":
		return t.Role == RoleClient
	case "schedule.write":
		return t.Role == RoleClient
	}
	return false
}

// Store is a token table. The default implementation is a static map.
type Store interface {
	Lookup(ctx context.Context, value string) (Token, error)
}

// Memory is an in-memory token store. Pass tokens at construction; the
// store is read-only afterwards.
type Memory struct{ byValue map[string]Token }

func NewMemory(tokens []Token) *Memory {
	m := &Memory{byValue: make(map[string]Token, len(tokens))}
	for _, t := range tokens {
		m.byValue[t.Value] = t
	}
	return m
}

func (m *Memory) Lookup(_ context.Context, v string) (Token, error) {
	t, ok := m.byValue[v]
	if !ok {
		return Token{}, fmt.Errorf("%w: token not recognised", errs.Unauthorized)
	}
	return t, nil
}

// ctxKey is unique per package so values can't collide.
type ctxKey struct{}

// WithToken attaches t to ctx so handlers can read it via FromContext.
func WithToken(ctx context.Context, t Token) context.Context {
	return context.WithValue(ctx, ctxKey{}, t)
}

// FromContext returns the token previously attached to ctx, or false.
func FromContext(ctx context.Context) (Token, bool) {
	t, ok := ctx.Value(ctxKey{}).(Token)
	return t, ok
}

// Middleware authenticates every request via Bearer token. Requests missing
// or carrying an unknown token receive 401. The token is attached to the
// request context for downstream handlers.
//
// If store is nil, the middleware passes through unauthenticated; this is
// the explicit "auth disabled" mode the server uses by default.
func Middleware(store Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		if store == nil {
			return next
		}
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			val := bearerOf(r.Header.Get("Authorization"))
			if val == "" {
				http.Error(w, `{"error":"missing bearer token"}`, http.StatusUnauthorized)
				return
			}
			tok, err := store.Lookup(r.Context(), val)
			if err != nil {
				if errors.Is(err, errs.Unauthorized) {
					http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusUnauthorized)
					return
				}
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			r = r.WithContext(WithToken(r.Context(), tok))
			next.ServeHTTP(w, r)
		})
	}
}

func bearerOf(h string) string {
	if !strings.HasPrefix(h, "Bearer ") {
		return ""
	}
	return strings.TrimSpace(h[len("Bearer "):])
}
