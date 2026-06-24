package notifier

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestStderr(t *testing.T) {
	var buf bytes.Buffer
	n := NewStderr(&buf)
	if err := n.Notify(context.Background(), Event{Name: "x", Severity: "warn", State: "firing", At: time.Now()}); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(buf.String(), "warn") {
		t.Fatalf("got %s", buf.String())
	}
}

func TestMulti(t *testing.T) {
	var a, b bytes.Buffer
	m := New(NewStderr(&a), NewStderr(&b))
	_ = m.Notify(context.Background(), Event{Name: "x", At: time.Now()})
	if !strings.Contains(a.String(), "x") || !strings.Contains(b.String(), "x") {
		t.Fatal("multi did not deliver to both")
	}
}

func TestBuffered(t *testing.T) {
	var calls int32
	inner := stubFn(func(context.Context, Event) error {
		atomic.AddInt32(&calls, 1)
		return nil
	})
	b := NewBuffered(inner, 3)
	for i := 0; i < 5; i++ {
		_ = b.Notify(context.Background(), Event{Name: "x"})
	}
	_ = b.Flush(context.Background())
	if calls < 5 {
		t.Fatalf("calls %d", calls)
	}
}

func TestWebhook(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Content-Type") != "application/json" {
			t.Fatal("missing content type")
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()
	wh := NewWebhook(srv.URL)
	if err := wh.Notify(context.Background(), Event{Name: "x", At: time.Now()}); err != nil {
		t.Fatal(err)
	}
}

func TestWebhookFailure(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()
	if err := NewWebhook(srv.URL).Notify(context.Background(), Event{}); err == nil {
		t.Fatal("expected err")
	}
}

type stubFn func(ctx context.Context, ev Event) error

func (s stubFn) Notify(ctx context.Context, ev Event) error { return s(ctx, ev) }
func (s stubFn) Name() string                                { return "stub" }
