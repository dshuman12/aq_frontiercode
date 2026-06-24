// Package tail reads the last N lines of a file efficiently.
package tail

import (
	"errors"
	"io"
	"os"
)

const blockSize = 4096

// Lines reads the last n lines of path.
func Lines(path string, n int) ([]string, error) {
	if n <= 0 {
		return nil, errors.New("tail: n must be > 0")
	}
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return nil, err
	}
	size := info.Size()
	if size == 0 {
		return nil, nil
	}
	var out []string
	var carry []byte
	pos := size
	for pos > 0 && len(out) < n {
		readSize := int64(blockSize)
		if pos < readSize {
			readSize = pos
		}
		pos -= readSize
		buf := make([]byte, readSize)
		if _, err := f.ReadAt(buf, pos); err != nil && !errors.Is(err, io.EOF) {
			return nil, err
		}
		buf = append(buf, carry...)
		carry = nil
		lines := splitLines(buf)
		// Last incomplete line goes back as carry if we have more to read.
		if pos > 0 && len(lines) > 0 {
			carry = []byte(lines[0])
			lines = lines[1:]
		}
		for i := len(lines) - 1; i >= 0; i-- {
			out = append([]string{lines[i]}, out...)
			if len(out) >= n {
				break
			}
		}
	}
	return out, nil
}

func splitLines(b []byte) []string {
	var out []string
	start := 0
	for i, ch := range b {
		if ch == '\n' {
			out = append(out, string(b[start:i]))
			start = i + 1
		}
	}
	if start < len(b) {
		out = append(out, string(b[start:]))
	}
	return out
}
