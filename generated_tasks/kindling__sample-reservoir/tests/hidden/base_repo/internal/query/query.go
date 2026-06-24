// Package query evaluates a parsed AST against records.
package query

import (
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/dleblanc/kindling/internal/parse"
	"github.com/dleblanc/kindling/internal/record"
)

// Eval returns true when r satisfies q.
func Eval(q *parse.Query, r *record.Record) bool {
	for _, conj := range q.Disjuncts {
		if evalConj(conj, r) {
			return true
		}
	}
	return false
}

func evalConj(c parse.Conjunction, r *record.Record) bool {
	for _, p := range c.Preds {
		if !evalPred(p, r) {
			return false
		}
	}
	return true
}

func evalPred(p parse.Predicate, r *record.Record) bool {
	field := r.Field(p.Field)
	if field == "" {
		// Special-cased core fields.
		switch p.Field {
		case "level":
			field = r.Level
		case "service":
			field = r.Service
		case "message", "msg":
			field = r.Message
		}
	}
	switch p.Op {
	case parse.OpEq:
		return field == p.Value.Str
	case parse.OpNe:
		return field != p.Value.Str
	case parse.OpContains:
		return strings.Contains(field, p.Value.Str)
	case parse.OpRegex:
		re, err := compileRegex(p.Value.Str)
		if err != nil {
			return false
		}
		return re.MatchString(field)
	case parse.OpLt, parse.OpLe, parse.OpGt, parse.OpGe:
		fn, err := strconv.ParseFloat(field, 64)
		if err != nil {
			return false
		}
		switch p.Op {
		case parse.OpLt:
			return fn < p.Value.Num
		case parse.OpLe:
			return fn <= p.Value.Num
		case parse.OpGt:
			return fn > p.Value.Num
		case parse.OpGe:
			return fn >= p.Value.Num
		}
	}
	return false
}

var (
	regexCache  = map[string]*regexp.Regexp{}
	regexCacheM sync.Mutex
)

func compileRegex(pattern string) (*regexp.Regexp, error) {
	regexCacheM.Lock()
	defer regexCacheM.Unlock()
	if re, ok := regexCache[pattern]; ok {
		return re, nil
	}
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil, err
	}
	regexCache[pattern] = re
	return re, nil
}

// Filter returns the subset of records matching q.
func Filter(q *parse.Query, records []*record.Record) []*record.Record {
	out := make([]*record.Record, 0, len(records))
	for _, r := range records {
		if Eval(q, r) {
			out = append(out, r)
		}
	}
	return out
}
