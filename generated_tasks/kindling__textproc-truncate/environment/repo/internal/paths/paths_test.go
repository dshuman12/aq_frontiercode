package paths_test

import (
	"path/filepath"
	"testing"

	"github.com/dleblanc/kindling/internal/paths"
)

func TestNormalize(t *testing.T) {
	cases := map[string]string{
		"./a/./b":   filepath.Clean("./a/./b"),
		"/a/b/../c": filepath.Clean("/a/b/../c"),
		"":          ".",
	}
	for in, want := range cases {
		if got := paths.Normalize(in); got != want {
			t.Errorf("Normalize(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestStartsWith(t *testing.T) {
	if !paths.StartsWith("/srv", "/srv/photos/x.jpg") {
		t.Error("expected match")
	}
	if paths.StartsWith("/srv", "/elsewhere") {
		t.Error("unexpected match")
	}
	if !paths.StartsWith("/srv", "/srv") {
		t.Error("self should match")
	}
}

func TestDepth(t *testing.T) {
	if got := paths.Depth("/a/b/c"); got != 3 {
		t.Errorf("got %d", got)
	}
	if got := paths.Depth("/a/./b/../c"); got != 2 {
		t.Errorf("got %d", got)
	}
	if got := paths.Depth("/"); got != 0 {
		t.Errorf("got %d", got)
	}
}

func TestSibling(t *testing.T) {
	got := paths.Sibling("/a/b/c.txt", "d.txt")
	if got != filepath.Join("/a/b", "d.txt") {
		t.Errorf("got %q", got)
	}
}

func TestRelativeInside(t *testing.T) {
	rel, inside := paths.Relative("/srv", "/srv/photos/a.jpg")
	if !inside {
		t.Error("should be inside")
	}
	if rel != filepath.Join("photos", "a.jpg") {
		t.Errorf("got %q", rel)
	}
}

func TestRelativeOutside(t *testing.T) {
	_, inside := paths.Relative("/srv", "/elsewhere")
	if inside {
		t.Error("should be outside")
	}
}

func TestComponents(t *testing.T) {
	got := paths.Components("/a/b/c")
	if len(got) != 3 {
		t.Errorf("got %v", got)
	}
}

func TestComponentsRoot(t *testing.T) {
	if got := paths.Components("/"); len(got) != 0 {
		t.Errorf("got %v", got)
	}
}
