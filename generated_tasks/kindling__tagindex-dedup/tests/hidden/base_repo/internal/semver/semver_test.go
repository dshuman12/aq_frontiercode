package semver_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/semver"
)

func TestParse(t *testing.T) {
	v, err := semver.Parse("1.2.3")
	if err != nil {
		t.Fatal(err)
	}
	if v.Major != 1 || v.Minor != 2 || v.Patch != 3 {
		t.Errorf("got %+v", v)
	}
}

func TestParseRejectsTooFewParts(t *testing.T) {
	if _, err := semver.Parse("1.2"); err == nil {
		t.Error("expected error")
	}
}

func TestParseRejectsNonNumeric(t *testing.T) {
	if _, err := semver.Parse("1.x.3"); err == nil {
		t.Error("expected error")
	}
}

func TestRoundTrip(t *testing.T) {
	v, _ := semver.Parse("1.2.3")
	if v.String() != "1.2.3" {
		t.Errorf("got %q", v.String())
	}
}

func TestLess(t *testing.T) {
	cases := []struct {
		a, b string
		want bool
	}{
		{"1.0.0", "1.0.1", true},
		{"1.0.1", "1.0.0", false},
		{"1.1.0", "2.0.0", true},
		{"1.0.0", "1.0.0", false},
	}
	for _, tc := range cases {
		va, _ := semver.Parse(tc.a)
		vb, _ := semver.Parse(tc.b)
		if got := va.Less(vb); got != tc.want {
			t.Errorf("%s < %s: got %v want %v", tc.a, tc.b, got, tc.want)
		}
	}
}

func TestEqual(t *testing.T) {
	a, _ := semver.Parse("1.2.3")
	b, _ := semver.Parse("1.2.3")
	if !a.Equal(b) {
		t.Error("equal failed")
	}
}

func TestRangeContains(t *testing.T) {
	r := semver.Range{
		Min: semver.Version{Major: 1, Minor: 0, Patch: 0},
		Max: semver.Version{Major: 2, Minor: 0, Patch: 0},
	}
	if !r.Contains(semver.Version{Major: 1, Minor: 5, Patch: 0}) {
		t.Error("should contain")
	}
	if r.Contains(semver.Version{Major: 2, Minor: 0, Patch: 0}) {
		t.Error("should not contain max")
	}
	if r.Contains(semver.Version{Major: 0, Minor: 9, Patch: 0}) {
		t.Error("should not contain below")
	}
}
