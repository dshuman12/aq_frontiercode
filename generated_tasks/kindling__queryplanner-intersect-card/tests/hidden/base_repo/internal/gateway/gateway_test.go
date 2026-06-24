package gateway

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRegisterAndDispatch(t *testing.T) {
	g := New()
	g.Register("GET", "/x", "", func(ctx context.Context, req *Request) (*Response, error) {
		return &Response{Status: 201, Body: map[string]string{"k": "v"}}, nil
	})
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, httptest.NewRequest("GET", "/x", nil))
	if rec.Code != 201 {
		t.Fatalf("code %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `"k":"v"`) {
		t.Fatalf("body %s", rec.Body.String())
	}
}

func TestNotFound(t *testing.T) {
	g := New()
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, httptest.NewRequest("GET", "/missing", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("code %d", rec.Code)
	}
}

func TestErrorReturned(t *testing.T) {
	g := New()
	g.Register("GET", "/bad", "", func(ctx context.Context, req *Request) (*Response, error) {
		return nil, errResp("nope")
	})
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, httptest.NewRequest("GET", "/bad", nil))
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("code %d", rec.Code)
	}
}

func TestRoutesSorted(t *testing.T) {
	g := New()
	g.Register("GET", "/z", "", nil)
	g.Register("GET", "/a", "", nil)
	routes := g.Routes()
	if routes[0].Path != "/a" {
		t.Fatalf("got %v", routes)
	}
}

func TestSetLogger(t *testing.T) {
	g := New()
	logged := false
	g.SetLogger(func(string, ...any) { logged = true })
	g.Register("GET", "/x", "", func(ctx context.Context, r *Request) (*Response, error) {
		return &Response{Body: nil}, nil
	})
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, httptest.NewRequest("GET", "/x", nil))
	if !logged {
		t.Fatal("expected log")
	}
}

func TestQueryParamsParsed(t *testing.T) {
	g := New()
	g.Register("GET", "/q", "", func(ctx context.Context, req *Request) (*Response, error) {
		return &Response{Body: req.Params}, nil
	})
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, httptest.NewRequest("GET", "/q?k=v", nil))
	if !strings.Contains(rec.Body.String(), `"k":"v"`) {
		t.Fatalf("got %s", rec.Body.String())
	}
}

type errResp string

func (e errResp) Error() string { return string(e) }
