package numfmt_test

import (
	"strings"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/util/numfmt"
)

func TestBytes(t *testing.T) {
	cases := map[uint64]string{
		0:                "0 B",
		1023:             "1023 B",
		1024:             "1.00 KiB",
		1024 * 1024:      "1.00 MiB",
		uint64(1) << 30:  "1.00 GiB",
		uint64(1) << 40:  "1.00 TiB",
	}
	for in, want := range cases {
		if got := numfmt.Bytes(in); got != want {
			t.Errorf("Bytes(%d) = %q, want %q", in, got, want)
		}
	}
}

func TestDurationBuckets(t *testing.T) {
	cases := []struct {
		d    time.Duration
		want string
	}{
		{500 * time.Nanosecond, "ns"},
		{500 * time.Microsecond, "µs"},
		{5 * time.Millisecond, "ms"},
		{5 * time.Second, "s"},
		{2 * time.Minute, "m"},
		{2 * time.Hour, "h"},
	}
	for _, tc := range cases {
		got := numfmt.Duration(tc.d)
		if !strings.Contains(got, tc.want) {
			t.Errorf("Duration(%v) = %q; missing %q", tc.d, got, tc.want)
		}
	}
}

func TestCountThousands(t *testing.T) {
	if got := numfmt.Count(1234567); got != "1,234,567" {
		t.Errorf("got %q", got)
	}
	if got := numfmt.Count(99); got != "99" {
		t.Errorf("got %q", got)
	}
}
