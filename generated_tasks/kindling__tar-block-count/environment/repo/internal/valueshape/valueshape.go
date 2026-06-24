// Package valueshape classifies the shape of free-text values into
// canonical buckets so dashboards can group "192.168.1.1" alongside
// "10.0.0.5" as IPV4_ADDR rather than treating them as distinct strings.
//
// Recognised shapes are:
//
//   - INT, FLOAT, BOOL, NULL
//   - IPV4_ADDR, IPV6_ADDR
//   - EMAIL, URL, UUID, ULID
//   - ISO_DATETIME, ISO_DATE
//   - HEX_TOKEN, B64_TOKEN
//   - PATH (POSIX-style absolute or relative path)
//   - PHONE (E.164-ish)
//   - GENERIC (default)
package valueshape

import (
	"regexp"
	"strconv"
	"strings"
)

// Shape names a recognised pattern.
type Shape string

const (
	ShapeNull        Shape = "NULL"
	ShapeBool        Shape = "BOOL"
	ShapeInt         Shape = "INT"
	ShapeFloat       Shape = "FLOAT"
	ShapeIPv4        Shape = "IPV4_ADDR"
	ShapeIPv6        Shape = "IPV6_ADDR"
	ShapeEmail       Shape = "EMAIL"
	ShapeURL         Shape = "URL"
	ShapeUUID        Shape = "UUID"
	ShapeULID        Shape = "ULID"
	ShapeISODateTime Shape = "ISO_DATETIME"
	ShapeISODate     Shape = "ISO_DATE"
	ShapeHexToken    Shape = "HEX_TOKEN"
	ShapeB64Token    Shape = "B64_TOKEN"
	ShapePath        Shape = "PATH"
	ShapePhone       Shape = "PHONE"
	ShapeGeneric     Shape = "GENERIC"
)

var (
	reIPv4    = regexp.MustCompile(`^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$`)
	reIPv6    = regexp.MustCompile(`^([0-9a-fA-F:]+)$`)
	reEmail   = regexp.MustCompile(`^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`)
	reURL     = regexp.MustCompile(`^https?://[^ ]+$`)
	reUUID    = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	reULID    = regexp.MustCompile(`^[0-9A-HJKMNP-TV-Z]{26}$`)
	reISOdt   = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$`)
	reISOd    = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
	reHex     = regexp.MustCompile(`^[0-9a-fA-F]{16,}$`)
	reB64     = regexp.MustCompile(`^[A-Za-z0-9+/]{16,}={0,2}$`)
	reAbsPath = regexp.MustCompile(`^/[A-Za-z0-9._~/-]+$`)
	rePhone   = regexp.MustCompile(`^\+?[0-9]{8,15}$`)
)

// Classify returns the Shape best matching v.
func Classify(v string) Shape {
	if v == "" {
		return ShapeNull
	}
	switch strings.ToLower(v) {
	case "null", "nil", "none":
		return ShapeNull
	case "true", "false":
		return ShapeBool
	}
	if !strings.HasPrefix(v, "+") {
		if _, err := strconv.ParseInt(v, 10, 64); err == nil {
			return ShapeInt
		}
		if _, err := strconv.ParseFloat(v, 64); err == nil {
			return ShapeFloat
		}
	}
	switch {
	case reISOdt.MatchString(v):
		return ShapeISODateTime
	case reISOd.MatchString(v):
		return ShapeISODate
	case reUUID.MatchString(v):
		return ShapeUUID
	case reULID.MatchString(v):
		return ShapeULID
	case reIPv4.MatchString(v) && allOctetsValid(v):
		return ShapeIPv4
	case strings.Contains(v, ":") && !strings.Contains(v, "/") && reIPv6.MatchString(v) && strings.Count(v, ":") >= 2:
		return ShapeIPv6
	case reEmail.MatchString(v):
		return ShapeEmail
	case reURL.MatchString(v):
		return ShapeURL
	case reHex.MatchString(v):
		return ShapeHexToken
	case rePhone.MatchString(v):
		return ShapePhone
	case reAbsPath.MatchString(v):
		return ShapePath
	case reB64.MatchString(v):
		return ShapeB64Token
	}
	return ShapeGeneric
}

func allOctetsValid(s string) bool {
	for _, oct := range strings.Split(s, ".") {
		n, err := strconv.Atoi(oct)
		if err != nil || n < 0 || n > 255 {
			return false
		}
	}
	return true
}

// Histogram aggregates Shape counts.
type Histogram struct {
	counts map[Shape]int
}

// NewHistogram constructs an empty Histogram.
func NewHistogram() *Histogram { return &Histogram{counts: map[Shape]int{}} }

// Add records a value's shape.
func (h *Histogram) Add(v string) {
	h.counts[Classify(v)]++
}

// Counts returns a copy of the underlying counters.
func (h *Histogram) Counts() map[Shape]int {
	out := make(map[Shape]int, len(h.counts))
	for k, v := range h.counts {
		out[k] = v
	}
	return out
}

// Total returns the sum across shapes.
func (h *Histogram) Total() int {
	total := 0
	for _, v := range h.counts {
		total += v
	}
	return total
}
