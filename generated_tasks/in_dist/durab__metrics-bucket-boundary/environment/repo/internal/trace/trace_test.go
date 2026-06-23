package trace

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNewIsHex(t *testing.T) {
	id := New()
	if len(id) != 32 {
		t.Fatalf("len = %d", len(id))
	}
	if !strings.ContainsAny(id, "0123456789abcdef") {
		t.Fatalf("not hex: %q", id)
	}
}

func TestMiddlewarePropagates(t *testing.T) {
	got := ""
	h := Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = IDFromContext(r.Context())
	}))
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set(Header, "abc123")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if got != "abc123" {
		t.Fatalf("ctx id = %q", got)
	}
	if w.Header().Get(Header) != "abc123" {
		t.Fatalf("response header missing")
	}
}

func TestMiddlewareGenerates(t *testing.T) {
	var got string
	h := Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = IDFromContext(r.Context())
	}))
	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if got == "" {
		t.Fatal("middleware didn't generate id")
	}
}

func TestWire(t *testing.T) {
	ctx := WithID(context.Background(), "id-1")
	r, _ := http.NewRequest("GET", "/", nil)
	Wire(ctx, r)
	if r.Header.Get(Header) != "id-1" {
		t.Fatalf("header = %q", r.Header.Get(Header))
	}
}
