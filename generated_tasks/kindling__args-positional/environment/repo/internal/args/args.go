// Package args provides a tiny long/short flag parser shared across
// every kindling subcommand.
package args

import (
	"fmt"
	"strconv"
	"strings"
)

// Parsed is the result of parsing argv.
type Parsed struct {
	// Flags collected by name.
	Flags map[string]string
	// Bare boolean flags.
	Bools map[string]bool
	// Non-flag positionals, in order.
	Positional []string
}

// Parse splits args into Parsed.
func Parse(args []string) (*Parsed, error) {
	out := &Parsed{
		Flags: map[string]string{},
		Bools: map[string]bool{},
	}
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "--" {
			out.Positional = append(out.Positional, args[i+1:]...)
			break
		}
		if strings.HasPrefix(a, "--") {
			rest := a[2:]
			if eq := strings.IndexByte(rest, '='); eq >= 0 {
				out.Flags[rest[:eq]] = rest[eq+1:]
				continue
			}
			if len(out.Positional) > 0 && i+1 < len(args) && !strings.HasPrefix(args[i+1], "-") {
				out.Flags[rest] = args[i+1]
				i++
				continue
			}
			out.Bools[rest] = true
			continue
		}
		if strings.HasPrefix(a, "-") && len(a) > 1 {
			rest := a[1:]
			if len(rest) > 1 {
				return nil, fmt.Errorf("args: unsupported short flag '-%s'", rest)
			}
			out.Bools[rest] = true
			continue
		}
		out.Positional = append(out.Positional, a)
	}
	return out, nil
}

// Str returns the flag value or default.
func (p *Parsed) Str(name, def string) string {
	if v, ok := p.Flags[name]; ok {
		return v
	}
	return def
}

// Int returns the flag value as int or default.
func (p *Parsed) Int(name string, def int) (int, error) {
	v, ok := p.Flags[name]
	if !ok {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("args: --%s: not an int (%q)", name, v)
	}
	return n, nil
}

// Bool returns true when the flag is present (or set to truthy).
func (p *Parsed) Bool(name string) bool {
	if p.Bools[name] {
		return true
	}
	v, ok := p.Flags[name]
	if !ok {
		return false
	}
	switch strings.ToLower(v) {
	case "1", "true", "yes", "on":
		return true
	}
	return false
}
