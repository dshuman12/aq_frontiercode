// Package timex contains time-zone-aware helpers used by reports.
package timex

import (
	"fmt"
	"strings"
	"time"
)

// Bucket rounds t down to the start of its containing bucket of size dur.
func Bucket(t time.Time, dur time.Duration) time.Time {
	if dur <= 0 {
		return t
	}
	unix := t.Unix()
	d := int64(dur.Seconds())
	bucketed := (unix / d) * d
	return time.Unix(bucketed, 0).UTC()
}

// ParseDuration extends time.ParseDuration with day suffixes ("3d").
func ParseDuration(s string) (time.Duration, error) {
	s = strings.TrimSpace(s)
	if strings.HasSuffix(s, "d") {
		var n int
		_, err := fmt.Sscanf(s, "%dd", &n)
		if err != nil {
			return 0, fmt.Errorf("timex: bad days '%s'", s)
		}
		return time.Duration(n) * 24 * time.Hour, nil
	}
	if strings.HasSuffix(s, "w") {
		var n int
		_, err := fmt.Sscanf(s, "%dw", &n)
		if err != nil {
			return 0, fmt.Errorf("timex: bad weeks '%s'", s)
		}
		return time.Duration(n) * 7 * 24 * time.Hour, nil
	}
	return time.ParseDuration(s)
}

// FormatRFC3339Day renders t as YYYY-MM-DD.
func FormatRFC3339Day(t time.Time) string {
	return t.UTC().Format("2006-01-02")
}

// MustParseRFC3339 panics if s is not a valid RFC3339 timestamp.
// Used in tests to keep test bodies short.
func MustParseRFC3339(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(fmt.Sprintf("timex: bad RFC3339 %q: %v", s, err))
	}
	return t
}
