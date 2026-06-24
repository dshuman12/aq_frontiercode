// Package sourcecat concatenates log files from multiple producers
// into a single time-ordered stream.
//
// Each input file is assumed to be already time-ordered. sourcecat
// performs a streaming k-way merge so that downstream consumers see a
// single chronologically-sorted view without materialising all inputs
// in memory.
package sourcecat

import (
	"bufio"
	"errors"
	"io"
	"sort"
	"strings"
	"time"
)

// Line is one parsed log line.
type Line struct {
	Source string
	Time   time.Time
	Body   string
}

// Source produces successive Lines.
type Source struct {
	Name    string
	Reader  *bufio.Reader
	Parse   func(string) (time.Time, error)
	current Line
	done    bool
}

// Open builds a Source from a name + reader.
func Open(name string, r io.Reader, parseTime func(string) (time.Time, error)) *Source {
	return &Source{Name: name, Reader: bufio.NewReader(r), Parse: parseTime}
}

func (s *Source) advance() error {
	for {
		line, err := s.Reader.ReadString('\n')
		if err == io.EOF {
			if line == "" {
				s.done = true
				return nil
			}
		} else if err != nil {
			return err
		}
		line = strings.TrimRight(line, "\r\n")
		if line == "" {
			if err == io.EOF {
				s.done = true
				return nil
			}
			continue
		}
		t, perr := s.Parse(line)
		if perr != nil {
			// Skip unparseable lines; treat as continuation.
			if err == io.EOF {
				s.done = true
				return nil
			}
			continue
		}
		s.current = Line{Source: s.Name, Time: t, Body: line}
		return nil
	}
}

// Merge produces a chronologically-ordered stream from sources.
func Merge(sources ...*Source) (<-chan Line, <-chan error) {
	lines := make(chan Line, 16)
	errs := make(chan error, 1)
	go func() {
		defer close(lines)
		defer close(errs)
		for _, s := range sources {
			if err := s.advance(); err != nil {
				errs <- err
				return
			}
		}
		for {
			minIdx := -1
			for i, s := range sources {
				if s.done {
					continue
				}
				if minIdx < 0 || s.current.Time.Before(sources[minIdx].current.Time) {
					minIdx = i
				}
			}
			if minIdx < 0 {
				return
			}
			lines <- sources[minIdx].current
			if err := sources[minIdx].advance(); err != nil {
				errs <- err
				return
			}
		}
	}()
	return lines, errs
}

// Drain materialises all merged lines (for tests / small inputs).
func Drain(lines <-chan Line, errs <-chan error) ([]Line, error) {
	var out []Line
	for l := range lines {
		out = append(out, l)
	}
	if err, ok := <-errs; ok && err != nil {
		return out, err
	}
	return out, nil
}

// SortStable returns lines sorted by time. Useful when callers want to
// force a final pass in case sources were not strictly monotonic.
func SortStable(lines []Line) []Line {
	out := make([]Line, len(lines))
	copy(out, lines)
	sort.SliceStable(out, func(i, j int) bool { return out[i].Time.Before(out[j].Time) })
	return out
}

// ParseRFC3339Prefix returns a parser that extracts time from the
// first whitespace-delimited token of a line, expected to be RFC3339.
func ParseRFC3339Prefix(line string) (time.Time, error) {
	sp := strings.IndexByte(line, ' ')
	if sp < 0 {
		return time.Time{}, errors.New("sourcecat: no space in line")
	}
	return time.Parse(time.RFC3339, line[:sp])
}
