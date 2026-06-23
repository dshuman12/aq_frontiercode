// Package cron parses 5-field cron expressions ("* * * * *") and computes
// the next fire time. It intentionally does NOT support the optional
// seconds field or the @yearly/@monthly aliases; if users want those they
// can compose them at the SDK level.
//
// Supported syntax for each field:
//   - "*"           — any value
//   - "n"           — single value
//   - "a-b"         — inclusive range
//   - "a-b/n"       — every n-th value in range
//   - "*/n"         — every n-th value (== "min-max/n")
//   - "a,b,c"       — comma-separated list of any of the above
package cron

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Schedule is a parsed cron expression. The zero value is unusable; obtain
// one via Parse.
type Schedule struct {
	Minute, Hour, Dom, Month, Dow [64]bool
	// daySpec records whether dom or dow were explicit; when both are
	// explicit, cron's historical semantics are OR — see Next.
	domStar, dowStar bool
}

// Parse parses a 5-field cron expression.
func Parse(expr string) (*Schedule, error) {
	parts := strings.Fields(expr)
	if len(parts) != 5 {
		return nil, fmt.Errorf("expected 5 fields, got %d", len(parts))
	}
	s := &Schedule{}
	if err := parseField(parts[0], 0, 59, &s.Minute); err != nil {
		return nil, fmt.Errorf("minute: %w", err)
	}
	if err := parseField(parts[1], 0, 23, &s.Hour); err != nil {
		return nil, fmt.Errorf("hour: %w", err)
	}
	if err := parseField(parts[2], 1, 31, &s.Dom); err != nil {
		return nil, fmt.Errorf("dom: %w", err)
	}
	if err := parseField(parts[3], 1, 12, &s.Month); err != nil {
		return nil, fmt.Errorf("month: %w", err)
	}
	if err := parseField(parts[4], 0, 6, &s.Dow); err != nil {
		return nil, fmt.Errorf("dow: %w", err)
	}
	s.domStar = parts[2] == "*"
	s.dowStar = parts[4] == "*"
	return s, nil
}

func parseField(spec string, min, max int, out *[64]bool) error {
	for _, p := range strings.Split(spec, ",") {
		if err := parseRange(p, min, max, out); err != nil {
			return err
		}
	}
	return nil
}

func parseRange(spec string, min, max int, out *[64]bool) error {
	step := 1
	if i := strings.IndexByte(spec, '/'); i >= 0 {
		var err error
		step, err = strconv.Atoi(spec[i+1:])
		if err != nil || step <= 0 {
			return fmt.Errorf("bad step %q", spec[i+1:])
		}
		spec = spec[:i]
	}
	lo, hi := min, max
	if spec != "*" {
		if i := strings.IndexByte(spec, '-'); i >= 0 {
			a, err := strconv.Atoi(spec[:i])
			if err != nil {
				return fmt.Errorf("bad range start %q", spec[:i])
			}
			b, err := strconv.Atoi(spec[i+1:])
			if err != nil {
				return fmt.Errorf("bad range end %q", spec[i+1:])
			}
			lo, hi = a, b
		} else {
			v, err := strconv.Atoi(spec)
			if err != nil {
				return fmt.Errorf("bad value %q", spec)
			}
			lo, hi = v, v
		}
	}
	if lo < min || hi > max || lo > hi {
		return fmt.Errorf("out of range: %d-%d (allowed %d-%d)", lo, hi, min, max)
	}
	for v := lo; v <= hi; v += step {
		out[v] = true
	}
	return nil
}

// Next returns the next time at or after t (with second precision dropped)
// that matches s.
func (s *Schedule) Next(t time.Time) time.Time {
	t = t.Add(time.Minute).Truncate(time.Minute)
	for i := 0; i < 366*24*60; i++ {
		if s.match(t) {
			return t
		}
		t = t.Add(time.Minute)
	}
	return time.Time{}
}

func (s *Schedule) match(t time.Time) bool {
	if !s.Minute[t.Minute()] || !s.Hour[t.Hour()] || !s.Month[int(t.Month())] {
		return false
	}
	domMatch := s.Dom[t.Day()]
	dowMatch := s.Dow[int(t.Weekday())]
	switch {
	case s.domStar && s.dowStar:
		return true
	case s.domStar:
		return dowMatch
	case s.dowStar:
		return domMatch
	default:
		return domMatch || dowMatch
	}
}
