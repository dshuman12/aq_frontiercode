package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/auth"
	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
)

func TestWithAuthBlocksUnauthenticated(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC))
	eng := engine.New(storage.NewMemoryWithClock(fc), fc, log.Default)
	store := auth.NewMemory([]auth.Token{{Value: "secret", Role: auth.RoleClient}})
	srv := New(eng, log.Default, WithAuth(store))
	ts := httptest.NewServer(srv.Handler())
	defer ts.Close()

	r, errg := http.Get(ts.URL + "/v1/workflows")
	if errg != nil {
		t.Fatal(errg)
	}
	defer r.Body.Close()
	if r.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status %d", r.StatusCode)
	}

	req, _ := http.NewRequest("GET", ts.URL+"/v1/workflows", nil)
	req.Header.Set("Authorization", "Bearer secret")
	r2, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer r2.Body.Close()
	if r2.StatusCode != http.StatusOK {
		t.Fatalf("status %d with valid token", r2.StatusCode)
	}
}

func TestHealthzBypassAuth(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC))
	eng := engine.New(storage.NewMemoryWithClock(fc), fc, log.Default)
	srv := New(eng, log.Default, WithAuth(auth.NewMemory(nil)))
	ts := httptest.NewServer(srv.Handler())
	defer ts.Close()
	r, err := http.Get(ts.URL + "/healthz")
	if err != nil {
		t.Fatal(err)
	}
	defer r.Body.Close()
	if r.StatusCode != http.StatusOK {
		t.Fatalf("healthz blocked: %d", r.StatusCode)
	}
}
