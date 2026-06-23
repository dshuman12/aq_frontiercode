package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/vishaljakhar/durab/internal/errs"
)

func TestBearerOf(t *testing.T) {
	cases := map[string]string{
		"":                "",
		"Bearer abc":      "abc",
		"Bearer  spaced ": "spaced",
		"token abc":       "",
		"Bearer":          "",
	}
	for in, want := range cases {
		if got := bearerOf(in); got != want {
			t.Errorf("bearerOf(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestMemoryLookup(t *testing.T) {
	m := NewMemory([]Token{{Value: "abc", Role: RoleAdmin}})
	tok, err := m.Lookup(context.Background(), "abc")
	if err != nil {
		t.Fatal(err)
	}
	if tok.Role != RoleAdmin {
		t.Fatalf("role = %s", tok.Role)
	}
	_, err = m.Lookup(context.Background(), "missing")
	if !errors.Is(err, errs.Unauthorized) {
		t.Fatalf("want Unauthorized, got %v", err)
	}
}

func TestMiddlewareAllows(t *testing.T) {
	store := NewMemory([]Token{{Value: "good", Role: RoleClient}})
	called := false
	h := Middleware(store)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tok, ok := FromContext(r.Context())
		if !ok || tok.Role != RoleClient {
			t.Errorf("token not in ctx")
		}
		called = true
		w.WriteHeader(http.StatusOK)
	}))
	r := httptest.NewRequest("GET", "/v1/anything", nil)
	r.Header.Set("Authorization", "Bearer good")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if !called {
		t.Fatal("handler not called")
	}
}

func TestMiddlewareRejects(t *testing.T) {
	store := NewMemory([]Token{{Value: "good"}})
	h := Middleware(store)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))
	r := httptest.NewRequest("GET", "/v1/anything", nil)
	r.Header.Set("Authorization", "Bearer wrong")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status %d", w.Code)
	}
}

func TestMiddlewareNilStorePassthrough(t *testing.T) {
	called := false
	h := Middleware(nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))
	r := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if !called {
		t.Fatal("nil store should pass through")
	}
}

func TestRolePermissions(t *testing.T) {
	admin := Token{Role: RoleAdmin}
	client := Token{Role: RoleClient}
	worker := Token{Role: RoleWorker}
	if !admin.Allows("anything.here") {
		t.Fatal("admin should allow everything")
	}
	if !client.Allows("workflow.start") {
		t.Fatal("client should start workflows")
	}
	if client.Allows("task.poll") {
		t.Fatal("client should not poll tasks")
	}
	if !worker.Allows("task.poll") {
		t.Fatal("worker should poll")
	}
	if worker.Allows("workflow.start") {
		t.Fatal("worker should not start workflows")
	}
}
