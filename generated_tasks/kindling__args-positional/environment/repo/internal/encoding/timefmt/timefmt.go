// Package timefmt parses common log timestamp formats into time.Time.
//
// The standard Go time package handles each layout one at a time, but log
// records arrive heterogeneously: a single index may mix RFC3339 nanos,
// classic syslog "Jan 02 15:04:05" stamps, and Apache "[02/Jan/2006:15:04:05
// -0700]" entries. timefmt walks a small ordered list of layouts and returns
// the first match, which is faster than time.Parse with reflection.
package timefmt

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

// ErrUnknown is returned when no registered layout matches.
var ErrUnknown = errors.New("timefmt: no known layout matches")

// Layouts is the ordered list checked by Parse. Callers may append their own.
var Layouts = []string{
	time.RFC3339Nano,
	time.RFC3339,
	"2006-01-02T15:04:05",
	"2006-01-02 15:04:05.000",
	"2006-01-02 15:04:05",
	"2006-01-02",
	"02/Jan/2006:15:04:05 -0700",
	"02/Jan/2006:15:04:05",
	"Jan 02 15:04:05",
	"Jan _2 15:04:05",
	"Mon Jan _2 15:04:05 2006",
	"Mon, 02 Jan 2006 15:04:05 MST",
	time.Kitchen,
}

// Parse tries each layout in turn against s.
func Parse(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, ErrUnknown
	}
	if s[0] == '[' {
		end := strings.IndexByte(s, ']')
		if end > 0 {
			s = s[1:end]
		}
	}
	for _, layout := range Layouts {
		t, err := time.Parse(layout, s)
		if err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("%w: %q", ErrUnknown, s)
}

// MustParse is like Parse but panics on error; use only for trusted input.
func MustParse(s string) time.Time {
	t, err := Parse(s)
	if err != nil {
		panic(err)
	}
	return t
}

// Detect returns the first layout name that successfully parses s.
func Detect(s string) string {
	s = strings.TrimSpace(s)
	if len(s) > 0 && s[0] == '[' {
		end := strings.IndexByte(s, ']')
		if end > 0 {
			s = s[1:end]
		}
	}
	for _, layout := range Layouts {
		if _, err := time.Parse(layout, s); err == nil {
			return layout
		}
	}
	return ""
}

// FormatRFC3339 formats with nanosecond precision when sub-second values exist.
func FormatRFC3339(t time.Time) string {
	if t.Nanosecond() != 0 {
		return t.Format(time.RFC3339Nano)
	}
	return t.Format(time.RFC3339)
}

// Bucket rounds t down to a multiple of d in the input's location.
func Bucket(t time.Time, d time.Duration) time.Time {
	if d <= 0 {
		return t
	}
	return t.Truncate(d)
}

// Range expands a half-open [start, end) range into a slice of buckets.
func Range(start, end time.Time, step time.Duration) []time.Time {
	if step <= 0 || !end.After(start) {
		return nil
	}
	out := make([]time.Time, 0, int(end.Sub(start)/step)+1)
	for t := start; t.Before(end); t = t.Add(step) {
		out = append(out, t)
	}
	return out
}
