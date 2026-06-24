// Package multipart implements a small RFC2046-style multipart text
// encoder for batched log records. It is deliberately separate from
// net/http's multipart support, which is heavier and HTTP-tied.
package multipart

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strings"
)

// Part is one part of a multipart payload.
type Part struct {
	Headers map[string]string
	Body    []byte
}

// Writer streams multipart parts to an io.Writer.
type Writer struct {
	w        *bufio.Writer
	boundary string
	closed   bool
}

// NewWriter constructs a Writer with a random boundary.
func NewWriter(w io.Writer) *Writer {
	var b [12]byte
	_, _ = rand.Read(b[:])
	return &Writer{w: bufio.NewWriter(w), boundary: "kdl-" + hex.EncodeToString(b[:])}
}

// Boundary returns the boundary string used by this writer.
func (w *Writer) Boundary() string { return w.boundary }

// SetBoundary overrides the boundary; useful for deterministic tests.
func (w *Writer) SetBoundary(b string) error {
	if b == "" || strings.ContainsAny(b, "\r\n") {
		return errors.New("multipart: invalid boundary")
	}
	w.boundary = b
	return nil
}

// WritePart emits one part.
func (w *Writer) WritePart(p Part) error {
	if w.closed {
		return errors.New("multipart: writer closed")
	}
	if _, err := fmt.Fprintf(w.w, "--%s\r\n", w.boundary); err != nil {
		return err
	}
	for k, v := range p.Headers {
		if _, err := fmt.Fprintf(w.w, "%s: %s\r\n", k, v); err != nil {
			return err
		}
	}
	if _, err := w.w.WriteString("\r\n"); err != nil {
		return err
	}
	if _, err := w.w.Write(p.Body); err != nil {
		return err
	}
	_, err := w.w.WriteString("\r\n")
	return err
}

// Close finalizes the stream by writing the trailing boundary.
func (w *Writer) Close() error {
	if w.closed {
		return nil
	}
	w.closed = true
	if _, err := fmt.Fprintf(w.w, "--%s--\r\n", w.boundary); err != nil {
		return err
	}
	return w.w.Flush()
}

// Reader streams parts from an io.Reader.
type Reader struct {
	r           *bufio.Reader
	boundary    string
	startedPart bool
}

// NewReader constructs a Reader.
func NewReader(r io.Reader, boundary string) *Reader {
	return &Reader{r: bufio.NewReader(r), boundary: boundary}
}

// NextPart returns the next part or io.EOF when the trailing boundary is hit.
func (r *Reader) NextPart() (Part, error) {
	open := "--" + r.boundary
	close := open + "--"
	if !r.startedPart {
		for {
			line, err := r.readLine()
			if err != nil {
				return Part{}, err
			}
			if line == close {
				return Part{}, io.EOF
			}
			if line == open {
				break
			}
		}
	}
	r.startedPart = false
	headers := map[string]string{}
	for {
		line, err := r.readLine()
		if err != nil {
			return Part{}, err
		}
		if line == "" {
			break
		}
		colon := strings.IndexByte(line, ':')
		if colon < 0 {
			return Part{}, fmt.Errorf("multipart: bad header %q", line)
		}
		k := strings.TrimSpace(line[:colon])
		v := strings.TrimSpace(line[colon+1:])
		headers[k] = v
	}
	var body []byte
	for {
		line, err := r.readLine()
		if err != nil {
			return Part{}, err
		}
		if line == close {
			return Part{Headers: headers, Body: body}, nil
		}
		if line == open {
			r.startedPart = true
			return Part{Headers: headers, Body: body}, nil
		}
		if len(body) > 0 {
			body = append(body, '\n')
		}
		body = append(body, line...)
	}
}

func (r *Reader) readLine() (string, error) {
	line, err := r.r.ReadString('\n')
	if err != nil {
		if err == io.EOF && line == "" {
			return "", io.EOF
		}
		if err != io.EOF {
			return "", err
		}
	}
	line = strings.TrimRight(line, "\r\n")
	return line, nil
}
