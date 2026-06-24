package urlparse_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/urlparse"
)

func TestParseBasic(t *testing.T) {
	u, err := urlparse.Parse("https://example.com/path")
	if err != nil {
		t.Fatal(err)
	}
	if u.Scheme != "https" || u.Authority != "example.com" || u.Path != "/path" {
		t.Errorf("got %+v", u)
	}
}

func TestPortParsing(t *testing.T) {
	u, _ := urlparse.Parse("http://example.com:8080/p")
	if u.Host() != "example.com" {
		t.Errorf("got %q", u.Host())
	}
	if u.Port() != 8080 {
		t.Errorf("got %d", u.Port())
	}
}

func TestQueryAndFragment(t *testing.T) {
	u, _ := urlparse.Parse("https://x.com/p?a=1#frag")
	if u.Query != "a=1" {
		t.Errorf("got %q", u.Query)
	}
	if u.Fragment != "frag" {
		t.Errorf("got %q", u.Fragment)
	}
}

func TestRejectsNoScheme(t *testing.T) {
	if _, err := urlparse.Parse("example.com/p"); err == nil {
		t.Error("expected error")
	}
}

func TestRejectsEmptyAuthority(t *testing.T) {
	if _, err := urlparse.Parse("https:///p"); err == nil {
		t.Error("expected error")
	}
}

func TestRoundTrip(t *testing.T) {
	original := "https://x.com:8080/p?q=1#f"
	u, _ := urlparse.Parse(original)
	if got := u.Render(); got != original {
		t.Errorf("got %q", got)
	}
}

func TestDefaultPath(t *testing.T) {
	u, _ := urlparse.Parse("https://x.com")
	if u.Path != "/" {
		t.Errorf("got %q", u.Path)
	}
}

func TestPortMissing(t *testing.T) {
	u, _ := urlparse.Parse("https://x.com")
	if u.Port() != -1 {
		t.Errorf("got %d", u.Port())
	}
}
