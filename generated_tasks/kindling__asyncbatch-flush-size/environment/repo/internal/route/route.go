// Package route implements a small HTTP path router with parameter
// capture for the kindling admin endpoints.
//
// Patterns are colon-prefixed parameters: "/jobs/:id/runs/:run". On match,
// captured values are returned as a map. The router is purposely small;
// it does no method-aware dispatch (callers handle that) and does not
// attempt regex-style matching.
package route

import (
	"errors"
	"strings"
)

// ErrNoMatch is returned when no pattern matched.
var ErrNoMatch = errors.New("route: no match")

// Handler runs in response to a successful match.
type Handler func(params map[string]string)

// Router maps URL paths to handlers.
type Router struct {
	root *node
}

type node struct {
	literal  string
	param    string
	handler  Handler
	statics  map[string]*node
	wildcard *node
}

// New constructs a Router.
func New() *Router {
	return &Router{root: &node{statics: map[string]*node{}}}
}

// Add registers a handler for a pattern.
func (r *Router) Add(pattern string, h Handler) error {
	pattern = strings.Trim(pattern, "/")
	cur := r.root
	if pattern == "" {
		cur.handler = h
		return nil
	}
	parts := strings.Split(pattern, "/")
	for _, part := range parts {
		if part == "" {
			return errors.New("route: empty segment")
		}
		if strings.HasPrefix(part, ":") {
			if cur.wildcard == nil {
				cur.wildcard = &node{statics: map[string]*node{}, param: part[1:]}
			}
			cur = cur.wildcard
			continue
		}
		next, ok := cur.statics[part]
		if !ok {
			next = &node{statics: map[string]*node{}, literal: part}
			cur.statics[part] = next
		}
		cur = next
	}
	cur.handler = h
	return nil
}

// Lookup returns the handler and captured parameters for path.
func (r *Router) Lookup(path string) (Handler, map[string]string, error) {
	path = strings.Trim(path, "/")
	cur := r.root
	params := map[string]string{}
	if path == "" {
		if cur.handler == nil {
			return nil, nil, ErrNoMatch
		}
		return cur.handler, params, nil
	}
	for _, part := range strings.Split(path, "/") {
		if next, ok := cur.statics[part]; ok {
			cur = next
			continue
		}
		if cur.wildcard != nil {
			params[cur.wildcard.param] = part
			cur = cur.wildcard
			continue
		}
		return nil, nil, ErrNoMatch
	}
	if cur.handler == nil {
		return nil, nil, ErrNoMatch
	}
	return cur.handler, params, nil
}

// Dispatch invokes the matched handler.
func (r *Router) Dispatch(path string) error {
	h, params, err := r.Lookup(path)
	if err != nil {
		return err
	}
	h(params)
	return nil
}
