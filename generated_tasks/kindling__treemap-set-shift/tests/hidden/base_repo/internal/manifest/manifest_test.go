package manifest_test

import (
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/manifest"
)

func sample() *manifest.Manifest {
	m := manifest.New()
	m.Add(&manifest.Entry{ID: 1, Digest: "abc", Size: 100, Service: "auth", Level: "info"})
	m.Add(&manifest.Entry{ID: 2, Digest: "def", Size: 200, Service: "users", Level: "warn"})
	return m
}

func TestEmpty(t *testing.T) {
	m := manifest.New()
	if m.Len() != 0 {
		t.Errorf("got %d", m.Len())
	}
	if m.Version != manifest.SchemaVersion {
		t.Errorf("got version %d", m.Version)
	}
}

func TestAddAndLen(t *testing.T) {
	m := sample()
	if m.Len() != 2 {
		t.Errorf("got %d", m.Len())
	}
}

func TestTotalBytes(t *testing.T) {
	if got := sample().TotalBytes(); got != 300 {
		t.Errorf("got %d", got)
	}
}

func TestByService(t *testing.T) {
	g := sample().ByService()
	if len(g["auth"]) != 1 || len(g["users"]) != 1 {
		t.Errorf("got %v", g)
	}
}

func TestRender(t *testing.T) {
	out := sample().Render()
	if !strings.Contains(out, "# kindling manifest v3") {
		t.Errorf("missing header: %q", out)
	}
	if !strings.Contains(out, "entries = 2") {
		t.Errorf("missing count: %q", out)
	}
}
