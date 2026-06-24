// Package urlparse is a tiny URL parser used by HTTP adapters.
package urlparse

import (
	"fmt"
	"strings"
)

// URL is a parsed URL.
type URL struct {
	Scheme    string
	Authority string
	Path      string
	Query     string
	Fragment  string
}

// Render returns the URL as a string.
func (u URL) Render() string {
	var sb strings.Builder
	sb.WriteString(u.Scheme)
	sb.WriteString("://")
	sb.WriteString(u.Authority)
	sb.WriteString(u.Path)
	if u.Query != "" {
		sb.WriteByte('?')
		sb.WriteString(u.Query)
	}
	if u.Fragment != "" {
		sb.WriteByte('#')
		sb.WriteString(u.Fragment)
	}
	return sb.String()
}

// Host returns the authority without the port.
func (u URL) Host() string {
	if i := strings.LastIndexByte(u.Authority, ':'); i >= 0 {
		return u.Authority[:i]
	}
	return u.Authority
}

// Port returns the parsed port number, or -1 if absent.
func (u URL) Port() int {
	if i := strings.LastIndexByte(u.Authority, ':'); i >= 0 {
		var n int
		if _, err := fmt.Sscanf(u.Authority[i+1:], "%d", &n); err == nil {
			return n
		}
	}
	return -1
}

// Parse parses a URL string.
func Parse(s string) (URL, error) {
	idx := strings.Index(s, "://")
	if idx < 0 {
		return URL{}, fmt.Errorf("urlparse: missing '://' in %q", s)
	}
	scheme := strings.ToLower(s[:idx])
	if scheme == "" {
		return URL{}, fmt.Errorf("urlparse: empty scheme")
	}
	rest := s[idx+3:]

	var fragment string
	if i := strings.IndexByte(rest, '#'); i >= 0 {
		fragment = rest[i+1:]
		rest = rest[:i]
	}

	var query string
	if i := strings.IndexByte(rest, '?'); i >= 0 {
		query = rest[i+1:]
		rest = rest[:i]
	}

	authority := rest
	path := "/"
	if i := strings.IndexByte(rest, '/'); i >= 0 {
		authority = rest[:i]
		path = rest[i:]
	}
	if authority == "" {
		return URL{}, fmt.Errorf("urlparse: empty authority")
	}

	return URL{
		Scheme:    scheme,
		Authority: authority,
		Path:      path,
		Query:     query,
		Fragment:  fragment,
	}, nil
}
