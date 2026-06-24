// Package paginate provides keyset and offset paginators for record
// lists. Keyset (a.k.a. cursor) pagination scales independently of page
// number; offset pagination is supplied for legacy clients.
package paginate

import (
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// Page is the response shape for one paginated request.
type Page[T any] struct {
	Items      []T
	NextCursor string
	HasMore    bool
}

// Cursor is an opaque continuation token.
type Cursor struct {
	Offset int
	Key    string
}

// Encode renders c as a URL-safe base64 token.
func (c Cursor) Encode() string {
	raw := strconv.Itoa(c.Offset) + ":" + c.Key
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

// DecodeCursor parses a token previously produced by Cursor.Encode.
func DecodeCursor(s string) (Cursor, error) {
	if s == "" {
		return Cursor{}, nil
	}
	raw, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return Cursor{}, fmt.Errorf("paginate: bad cursor: %w", err)
	}
	parts := strings.SplitN(string(raw), ":", 2)
	if len(parts) != 2 {
		return Cursor{}, errors.New("paginate: malformed cursor")
	}
	off, err := strconv.Atoi(parts[0])
	if err != nil {
		return Cursor{}, err
	}
	return Cursor{Offset: off, Key: parts[1]}, nil
}

// Offset slices items[offset:offset+limit].
func Offset[T any](items []T, offset, limit int) Page[T] {
	if offset < 0 {
		offset = 0
	}
	if limit <= 0 {
		limit = 50
	}
	if offset >= len(items) {
		return Page[T]{}
	}
	end := offset + limit
	if end > len(items) {
		end = len(items)
	}
	page := Page[T]{Items: items[offset:end]}
	if end < len(items) {
		page.HasMore = true
		page.NextCursor = Cursor{Offset: end}.Encode()
	}
	return page
}

// Keyset paginates a sorted slice by the result of keyOf.
func Keyset[T any](items []T, after string, limit int, keyOf func(T) string) Page[T] {
	if limit <= 0 {
		limit = 50
	}
	start := 0
	if after != "" {
		for i, v := range items {
			if keyOf(v) > after {
				start = i
				break
			}
			start = i + 1
		}
	}
	end := start + limit
	if end > len(items) {
		end = len(items)
	}
	page := Page[T]{Items: items[start:end]}
	if end < len(items) {
		page.HasMore = true
		page.NextCursor = Cursor{Key: keyOf(items[end-1])}.Encode()
	}
	return page
}
