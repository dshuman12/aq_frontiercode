// Package stream provides a streaming CSV reader.
package stream

import (
	"bufio"
	"errors"
	"io"
	"strings"
)

// Reader streams CSV rows from r.
type Reader struct {
	scanner *bufio.Scanner
	header  []string
}

// NewReader returns a streaming reader.
func NewReader(r io.Reader) *Reader {
	s := bufio.NewScanner(r)
	s.Buffer(make([]byte, 64*1024), 4*1024*1024)
	return &Reader{scanner: s}
}

// ReadHeader reads and stores the first row.
func (r *Reader) ReadHeader() ([]string, error) {
	if !r.scanner.Scan() {
		return nil, io.EOF
	}
	row, err := parseLine(r.scanner.Text())
	if err != nil {
		return nil, err
	}
	r.header = row
	return row, nil
}

// Header returns the previously-read header.
func (r *Reader) Header() []string { return r.header }

// Next returns the next row keyed by header name. Returns io.EOF when done.
func (r *Reader) Next() (map[string]string, error) {
	if !r.scanner.Scan() {
		if err := r.scanner.Err(); err != nil {
			return nil, err
		}
		return nil, io.EOF
	}
	line := r.scanner.Text()
	if line == "" {
		return r.Next()
	}
	row, err := parseLine(line)
	if err != nil {
		return nil, err
	}
	if r.header == nil {
		return nil, errors.New("stream: header not read")
	}
	out := make(map[string]string, len(r.header))
	for i, k := range r.header {
		if i < len(row) {
			out[k] = row[i]
		}
	}
	return out, nil
}

func parseLine(line string) ([]string, error) {
	var row []string
	var field strings.Builder
	inQuotes := false
	for i := 0; i < len(line); i++ {
		ch := line[i]
		if inQuotes {
			if ch == '"' {
				if i+1 < len(line) && line[i+1] == '"' {
					field.WriteByte('"')
					i++
					continue
				}
				inQuotes = false
				continue
			}
			field.WriteByte(ch)
			continue
		}
		switch ch {
		case ',':
			row = append(row, field.String())
			field.Reset()
		case '"':
			if field.Len() != 0 {
				return nil, errors.New("stream: stray quote")
			}
			inQuotes = true
		default:
			field.WriteByte(ch)
		}
	}
	if inQuotes {
		return nil, errors.New("stream: unterminated quote")
	}
	row = append(row, field.String())
	return row, nil
}
