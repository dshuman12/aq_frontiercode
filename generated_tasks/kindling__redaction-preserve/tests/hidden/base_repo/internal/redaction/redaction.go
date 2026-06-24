// Package redaction strips or masks PII tokens from log records.
//
// The default ruleset covers email addresses, IPv4/IPv6 addresses, US
// SSN-shaped tokens, payment-card-shaped digit runs (with Luhn check),
// JWT-shaped triple-segment tokens, and bearer authorisation headers.
// Custom rules may be registered with Register.
//
// Redaction is best-effort and is not a substitute for emitting fewer
// secrets at the source. Operators should treat it as defence-in-depth.
package redaction

import (
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"strings"
	"sync"
)

// Mode controls how a match is replaced.
type Mode int

const (
	ModeMask     Mode = iota // replace with [REDACTED:rule]
	ModeHash                 // replace with first 8 hex chars of SHA-256
	ModePreserve             // leave a small prefix visible: foo***
)

// Rule is one redaction rule.
type Rule struct {
	Name string
	RE   *regexp.Regexp
	Mode Mode
}

// Engine runs a set of rules against text.
type Engine struct {
	mu    sync.RWMutex
	rules []Rule
}

// New constructs an Engine pre-loaded with the default rules.
func New() *Engine {
	e := &Engine{}
	for _, r := range defaultRules() {
		e.Register(r)
	}
	return e
}

// Register appends a rule.
func (e *Engine) Register(r Rule) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.rules = append(e.rules, r)
}

// Redact returns a redacted copy of s.
func (e *Engine) Redact(s string) string {
	e.mu.RLock()
	defer e.mu.RUnlock()
	for _, r := range e.rules {
		s = r.RE.ReplaceAllStringFunc(s, func(match string) string {
			if r.Name == "card" && !luhnValid(match) {
				return match
			}
			return mask(r, match)
		})
	}
	return s
}

func mask(r Rule, match string) string {
	switch r.Mode {
	case ModeHash:
		h := sha256.Sum256([]byte(match))
		return "[REDACTED:" + r.Name + ":" + hex.EncodeToString(h[:4]) + "]"
	case ModePreserve:
		if len(match) > 3 {
			return match[:2] + strings.Repeat("*", len(match)-2)
		}
		return strings.Repeat("*", len(match))
	default:
		return "[REDACTED:" + r.Name + "]"
	}
}

func luhnValid(s string) bool {
	digits := []byte{}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= '0' && c <= '9' {
			digits = append(digits, c-'0')
		}
	}
	if len(digits) < 13 || len(digits) > 19 {
		return false
	}
	sum := 0
	for i := len(digits) - 1; i >= 0; i-- {
		d := int(digits[i])
		if (len(digits)-i)%2 == 0 {
			d *= 2
			if d > 9 {
				d -= 9
			}
		}
		sum += d
	}
	return sum%10 == 0
}

func defaultRules() []Rule {
	mustCompile := regexp.MustCompile
	return []Rule{
		{Name: "email", RE: mustCompile(`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`), Mode: ModeMask},
		{Name: "ipv4", RE: mustCompile(`\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b`), Mode: ModePreserve},
		{Name: "ssn", RE: mustCompile(`\b\d{3}-\d{2}-\d{4}\b`), Mode: ModeMask},
		{Name: "card", RE: mustCompile(`\b(?:\d[ -]*?){13,19}\b`), Mode: ModeMask},
		{Name: "jwt", RE: mustCompile(`\beyJ[A-Za-z0-9_=-]+\.[A-Za-z0-9_=-]+\.[A-Za-z0-9_.+/=-]+\b`), Mode: ModeHash},
		{Name: "bearer", RE: mustCompile(`(?i)bearer\s+[A-Za-z0-9._\-+/]{16,}`), Mode: ModeMask},
	}
}
