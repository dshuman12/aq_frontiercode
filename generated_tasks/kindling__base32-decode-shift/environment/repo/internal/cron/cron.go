// Package cron implements a 5-field POSIX cron expression parser.
package cron

import (
	"fmt"
	"strings"
)

// Cron is a parsed cron expression.
type Cron struct {
	Minute []int
	Hour   []int
	Dom    []int
	Month  []int
	Dow    []int
}

// Parse converts a 5-field cron string to a Cron.
func Parse(s string) (*Cron, error) {
	fields := strings.Fields(s)
	if len(fields) != 5 {
		return nil, fmt.Errorf("cron: expected 5 fields, got %d", len(fields))
	}
	c := &Cron{}
	var err error
	if c.Minute, err = parseField(fields[0], 0, 59); err != nil {
		return nil, err
	}
	if c.Hour, err = parseField(fields[1], 0, 23); err != nil {
		return nil, err
	}
	if c.Dom, err = parseField(fields[2], 1, 31); err != nil {
		return nil, err
	}
	if c.Month, err = parseField(fields[3], 1, 12); err != nil {
		return nil, err
	}
	if c.Dow, err = parseField(fields[4], 0, 6); err != nil {
		return nil, err
	}
	return c, nil
}

// Matches reports whether (minute, hour, dom, month, dow) is a fire time.
func (c *Cron) Matches(minute, hour, dom, month, dow int) bool {
	return contains(c.Minute, minute) &&
		contains(c.Hour, hour) &&
		contains(c.Dom, dom) &&
		contains(c.Month, month) &&
		contains(c.Dow, dow)
}

func contains(s []int, v int) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}

func parseField(field string, lo, hi int) ([]int, error) {
	out := []int{}
	for _, tok := range strings.Split(field, ",") {
		if tok == "*" {
			for v := lo; v <= hi; v++ {
				out = append(out, v)
			}
			continue
		}
		if strings.Contains(tok, "-") {
			parts := strings.SplitN(tok, "-", 2)
			var l, h int
			if _, err := fmt.Sscanf(parts[0], "%d", &l); err != nil {
				return nil, fmt.Errorf("cron: bad lower %q", parts[0])
			}
			if _, err := fmt.Sscanf(parts[1], "%d", &h); err != nil {
				return nil, fmt.Errorf("cron: bad upper %q", parts[1])
			}
			if l < lo || h > hi || l > h {
				return nil, fmt.Errorf("cron: range %d-%d out of bounds", l, h)
			}
			for v := l; v <= h; v++ {
				out = append(out, v)
			}
			continue
		}
		var v int
		if _, err := fmt.Sscanf(tok, "%d", &v); err != nil {
			return nil, fmt.Errorf("cron: bad value %q", tok)
		}
		if v < lo || v > hi {
			return nil, fmt.Errorf("cron: value %d out of %d-%d", v, lo, hi)
		}
		out = append(out, v)
	}
	return out, nil
}
