// Package jsonpath implements a tiny subset of JSONPath used to dig
// values out of decoded JSON records.
//
// Supported syntax:
//
//	$               root
//	.field          object navigation
//	['field']       quoted object navigation
//	[N]             array index (zero-based, may be negative for from-end)
//	[*]             wildcard array iteration
//	..field         recursive descent
//
// JSONPath features that this package does not support: filter
// expressions ([?(...)]), script expressions, slice expressions.
package jsonpath

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// Eval applies expr to value and returns the matched values.
func Eval(expr string, value any) ([]any, error) {
	steps, err := compile(expr)
	if err != nil {
		return nil, err
	}
	cur := []any{value}
	for _, s := range steps {
		cur = s.apply(cur)
	}
	return cur, nil
}

type step interface {
	apply(in []any) []any
}

type fieldStep struct{ name string }

func (s fieldStep) apply(in []any) []any {
	out := []any{}
	for _, v := range in {
		m, ok := v.(map[string]any)
		if !ok {
			continue
		}
		if val, ok := m[s.name]; ok {
			out = append(out, val)
		}
	}
	return out
}

type indexStep struct{ idx int }

func (s indexStep) apply(in []any) []any {
	out := []any{}
	for _, v := range in {
		arr, ok := v.([]any)
		if !ok {
			continue
		}
		i := s.idx
		if i < 0 {
			i = len(arr) + i
		}
		if i >= 0 && i < len(arr) {
			out = append(out, arr[i])
		}
	}
	return out
}

type wildcardStep struct{}

func (s wildcardStep) apply(in []any) []any {
	out := []any{}
	for _, v := range in {
		switch x := v.(type) {
		case []any:
			out = append(out, x...)
		case map[string]any:
			for _, val := range x {
				out = append(out, val)
			}
		}
	}
	return out
}

type recursiveStep struct{ name string }

func (s recursiveStep) apply(in []any) []any {
	out := []any{}
	var visit func(v any)
	visit = func(v any) {
		switch x := v.(type) {
		case map[string]any:
			if val, ok := x[s.name]; ok {
				out = append(out, val)
			}
			for _, val := range x {
				visit(val)
			}
		case []any:
			for _, item := range x {
				visit(item)
			}
		}
	}
	for _, v := range in {
		visit(v)
	}
	return out
}

func compile(expr string) ([]step, error) {
	if !strings.HasPrefix(expr, "$") {
		return nil, errors.New("jsonpath: expression must start with $")
	}
	expr = expr[1:]
	var out []step
	for len(expr) > 0 {
		switch {
		case strings.HasPrefix(expr, ".."):
			expr = expr[2:]
			ident, rest := readIdent(expr)
			if ident == "" {
				return nil, errors.New("jsonpath: expected identifier after ..")
			}
			out = append(out, recursiveStep{name: ident})
			expr = rest
		case strings.HasPrefix(expr, "."):
			expr = expr[1:]
			if strings.HasPrefix(expr, "*") {
				out = append(out, wildcardStep{})
				expr = expr[1:]
				continue
			}
			ident, rest := readIdent(expr)
			if ident == "" {
				return nil, errors.New("jsonpath: expected identifier after .")
			}
			out = append(out, fieldStep{name: ident})
			expr = rest
		case strings.HasPrefix(expr, "["):
			expr = expr[1:]
			end := strings.IndexByte(expr, ']')
			if end < 0 {
				return nil, errors.New("jsonpath: unmatched [")
			}
			body := expr[:end]
			expr = expr[end+1:]
			body = strings.TrimSpace(body)
			if body == "*" {
				out = append(out, wildcardStep{})
				continue
			}
			if strings.HasPrefix(body, "'") && strings.HasSuffix(body, "'") {
				out = append(out, fieldStep{name: body[1 : len(body)-1]})
				continue
			}
			i, err := strconv.Atoi(body)
			if err != nil {
				return nil, fmt.Errorf("jsonpath: bad index %q", body)
			}
			out = append(out, indexStep{idx: i})
		default:
			return nil, fmt.Errorf("jsonpath: unexpected token at %q", expr)
		}
	}
	return out, nil
}

func readIdent(s string) (string, string) {
	end := 0
	for end < len(s) {
		c := s[end]
		if c == '.' || c == '[' {
			break
		}
		end++
	}
	return s[:end], s[end:]
}
