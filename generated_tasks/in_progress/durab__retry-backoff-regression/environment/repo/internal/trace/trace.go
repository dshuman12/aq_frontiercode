package trace

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
)

const Header = "X-Trace-Id"

type ctxKey struct{}

func New() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {

	}
	return hex.EncodeToString(b[:])
}

func WithID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, ctxKey{}, id)
}

func IDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKey{}).(string); ok {
		return v
	}
	return ""
}

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

func Wire(ctx context.Context, r *http.Request) {
	if id := IDFromContext(ctx); id != "" {
		r.Header.Set(Header, id)
	}
}
