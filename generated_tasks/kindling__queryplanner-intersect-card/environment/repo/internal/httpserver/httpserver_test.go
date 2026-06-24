package httpserver

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandleAndStats(t *testing.T) {
	s := New(Config{Logger: func(string, ...any) {}})
	s.Handle("/x", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(204)
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/x", nil)
	s.middleware(s.mux).ServeHTTP(rec, req)
	if rec.Code != 204 {
		t.Fatalf("code %d", rec.Code)
	}
	if s.Stats().Requests != 1 {
		t.Fatalf("req %d", s.Stats().Requests)
	}
}

func TestPanicRecovery(t *testing.T) {
	var seen any
	s := New(Config{
		Logger:  func(string, ...any) {},
		OnPanic: func(_ *http.Request, v any, _ []byte) { seen = v },
	})
	s.Handle("/bad", func(http.ResponseWriter, *http.Request) { panic("boom") })
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/bad", nil)
	s.middleware(s.mux).ServeHTTP(rec, req)
	if rec.Code != 500 {
		t.Fatalf("code %d", rec.Code)
	}
	if seen != "boom" {
		t.Fatalf("seen %v", seen)
	}
	if s.Stats().Panics != 1 {
		t.Fatal("panic count")
	}
}

func TestHealthHandler(t *testing.T) {
	rec := httptest.NewRecorder()
	HealthHandler()(rec, httptest.NewRequest("GET", "/", nil))
	if !strings.Contains(rec.Body.String(), "ok") {
		t.Fatalf("got %s", rec.Body.String())
	}
}

func TestReadinessHandler(t *testing.T) {
	probe := func() error { return errors.New("nope") }
	rec := httptest.NewRecorder()
	ReadinessHandler(probe)(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("code %d", rec.Code)
	}
}

func TestRequestID(t *testing.T) {
	if RequestID(context.Background()) != "" {
		t.Fatal("expected empty")
	}
}

func TestMarshalJSON(t *testing.T) {
	if _, err := MarshalJSON("hi"); err != nil {
		t.Fatal(err)
	}
	if _, err := MarshalJSON(123); err == nil {
		t.Fatal("expected unsupported")
	}
}
