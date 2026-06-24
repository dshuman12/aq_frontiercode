package ui

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestServeIndex(t *testing.T) {
	ts := httptest.NewServer(Handler())
	defer ts.Close()
	r, err := http.Get(ts.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	defer r.Body.Close()
	if r.StatusCode != http.StatusOK {
		t.Fatalf("status %d", r.StatusCode)
	}
	buf := make([]byte, 128)
	n, _ := r.Body.Read(buf)
	if !strings.Contains(string(buf[:n]), "<title>durab</title>") {
		t.Fatalf("unexpected body: %s", buf[:n])
	}
}

func TestServeAsset(t *testing.T) {
	ts := httptest.NewServer(Handler())
	defer ts.Close()
	for _, p := range []string{"/style.css", "/app.js"} {
		r, err := http.Get(ts.URL + p)
		if err != nil {
			t.Fatal(err)
		}
		r.Body.Close()
		if r.StatusCode != http.StatusOK {
			t.Errorf("%s: status %d", p, r.StatusCode)
		}
	}
}

func TestMissingAssetIs404(t *testing.T) {
	ts := httptest.NewServer(Handler())
	defer ts.Close()
	r, err := http.Get(ts.URL + "/missing.png")
	if err != nil {
		t.Fatal(err)
	}
	defer r.Body.Close()
	if r.StatusCode != http.StatusNotFound {
		t.Fatalf("status %d", r.StatusCode)
	}
}
