package glob

import "testing"

func TestMatch(t *testing.T) {
	cases := []struct {
		pattern, path string
		want          bool
	}{
		{"*.go", "main.go", true},
		{"*.go", "sub/main.go", false},
		{"**/*.go", "main.go", true},
		{"**/*.go", "sub/main.go", true},
		{"**/*.go", "deep/nested/path/main.go", true},
		{"pkg/**/*.go", "pkg/main.go", true},
		{"pkg/**/*.go", "pkg/sub/main.go", true},
		{"pkg/**/*.go", "cmd/main.go", false},
		{"a/b/c", "a/b/c", true},
		{"a/b/c", "a/b/d", false},
		{"a/?/c", "a/b/c", true},
		{"a/?/c", "a/bb/c", false},
		{"a/[abc]/c", "a/b/c", true},
		{"a/[abc]/c", "a/d/c", false},
		{"**", "a", true},
		{"**", "a/b/c", true},
	}
	for _, tc := range cases {
		got, err := Match(tc.pattern, tc.path)
		if err != nil {
			t.Errorf("Match(%q, %q) err: %v", tc.pattern, tc.path, err)
			continue
		}
		if got != tc.want {
			t.Errorf("Match(%q, %q) = %v; want %v", tc.pattern, tc.path, got, tc.want)
		}
	}
}

func TestMatch_BraceNotExpanded(t *testing.T) {
	// Documented limitation: brace expansion is NOT yet supported.
	// This test pins current behavior so we notice if it changes.
	got, _ := Match("dist/{a,b}.txt", "dist/a.txt")
	if got {
		t.Errorf("brace expansion should not (yet) work; got match for {a,b}.txt against a.txt")
	}
}
