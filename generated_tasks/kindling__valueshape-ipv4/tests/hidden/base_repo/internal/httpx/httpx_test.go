package httpx_test

import (
	"bufio"
	"bytes"
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/httpx"
)

func TestParseMethod(t *testing.T) {
	if httpx.ParseMethod("GET") != httpx.MethodGet {
		t.Error("GET")
	}
	if httpx.ParseMethod("HEAD") != httpx.MethodHead {
		t.Error("HEAD")
	}
	if httpx.ParseMethod("POST") != httpx.MethodOther {
		t.Error("other")
	}
}

func TestStatusReason(t *testing.T) {
	if httpx.StatusOK.Reason() != "OK" {
		t.Error("OK")
	}
	if httpx.StatusNotFound.Reason() != "Not Found" {
		t.Error("404")
	}
}

func TestParseRequest(t *testing.T) {
	br := bufio.NewReader(strings.NewReader("GET /metrics HTTP/1.1\r\nHost: localhost\r\n\r\n"))
	req, err := httpx.Parse(br)
	if err != nil {
		t.Fatal(err)
	}
	if req.Method != httpx.MethodGet || req.Path != "/metrics" {
		t.Errorf("got %+v", req)
	}
	if req.Headers["host"] != "localhost" {
		t.Errorf("got %v", req.Headers)
	}
}

func TestParseBadRequestLine(t *testing.T) {
	br := bufio.NewReader(strings.NewReader("BROKEN\r\n"))
	if _, err := httpx.Parse(br); err == nil {
		t.Error("expected error")
	}
}

func TestParseBadHeader(t *testing.T) {
	br := bufio.NewReader(strings.NewReader("GET / HTTP/1.1\r\nbroken\r\n\r\n"))
	if _, err := httpx.Parse(br); err == nil {
		t.Error("expected error")
	}
}

func TestRouterRouting(t *testing.T) {
	r := httpx.NewRouter()
	r.Get("/x", func(*httpx.Request) httpx.Response { return httpx.OKText("hi") })
	resp := r.Dispatch(&httpx.Request{Method: httpx.MethodGet, Path: "/x"})
	if resp.Status != httpx.StatusOK {
		t.Errorf("got %d", resp.Status)
	}
}

func TestRouterNotFound(t *testing.T) {
	r := httpx.NewRouter()
	resp := r.Dispatch(&httpx.Request{Method: httpx.MethodGet, Path: "/x"})
	if resp.Status != httpx.StatusNotFound {
		t.Errorf("got %d", resp.Status)
	}
}

func TestRouterMethodNotAllowed(t *testing.T) {
	r := httpx.NewRouter()
	r.Get("/x", func(*httpx.Request) httpx.Response { return httpx.OKText("x") })
	resp := r.Dispatch(&httpx.Request{Method: httpx.MethodOther, Path: "/x"})
	if resp.Status != httpx.StatusMethodNotAllowed {
		t.Errorf("got %d", resp.Status)
	}
}

func TestRouterStripsQuery(t *testing.T) {
	r := httpx.NewRouter()
	r.Get("/x", func(*httpx.Request) httpx.Response { return httpx.OKText("ok") })
	resp := r.Dispatch(&httpx.Request{Method: httpx.MethodGet, Path: "/x?a=1"})
	if resp.Status != httpx.StatusOK {
		t.Errorf("got %d", resp.Status)
	}
}

func TestResponseWrite(t *testing.T) {
	var buf bytes.Buffer
	resp := httpx.OKText("hi")
	if err := resp.Write(&buf); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	if !strings.HasPrefix(out, "HTTP/1.1 200 OK\r\n") {
		t.Errorf("got %q", out)
	}
	if !strings.HasSuffix(out, "hi") {
		t.Errorf("got %q", out)
	}
}

func TestOKPromContentType(t *testing.T) {
	resp := httpx.OKProm("metric 1\n")
	if !strings.Contains(resp.Headers["Content-Type"], "version=0.0.4") {
		t.Errorf("got %q", resp.Headers["Content-Type"])
	}
}

func TestDefaultListenLocalhost(t *testing.T) {
	cfg := httpx.DefaultListen()
	if !strings.HasPrefix(cfg.Bind, "127.0.0.1:") {
		t.Errorf("bound: %q", cfg.Bind)
	}
}
