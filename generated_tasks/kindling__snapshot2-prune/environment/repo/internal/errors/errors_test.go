package errors_test

import (
	"errors"
	"testing"

	kerr "github.com/dleblanc/kindling/internal/errors"
)

func TestWrapfNilReturnsNil(t *testing.T) {
	if got := kerr.Wrapf(nil, "oops"); got != nil {
		t.Fatalf("got %v, want nil", got)
	}
}

func TestWrapfPreservesSentinel(t *testing.T) {
	wrapped := kerr.Wrapf(kerr.ErrNotFound, "looking up %s", "x")
	if !errors.Is(wrapped, kerr.ErrNotFound) {
		t.Fatalf("wrapped error did not preserve sentinel")
	}
}

func TestIsAndAs(t *testing.T) {
	wrapped := kerr.Wrapf(kerr.ErrInvalidQuery, "parsing %q", "size>100")
	if !kerr.Is(wrapped, kerr.ErrInvalidQuery) {
		t.Fatalf("kerr.Is failed")
	}
}

func TestSentinelsDistinct(t *testing.T) {
	all := []error{
		kerr.ErrNotFound, kerr.ErrInvalidQuery, kerr.ErrInvalidConfig,
		kerr.ErrSchemaMismatch, kerr.ErrCorruptIndex, kerr.ErrUnsupported,
	}
	for i, a := range all {
		for j, b := range all {
			if i != j && errors.Is(a, b) {
				t.Fatalf("sentinel %v incorrectly matches %v", a, b)
			}
		}
	}
}

func TestWrapfFormat(t *testing.T) {
	got := kerr.Wrapf(kerr.ErrUnsupported, "format %d", 42).Error()
	want := "format 42: unsupported"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}
