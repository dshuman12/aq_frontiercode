// Package ini parses INI-style configuration files.
package ini

import (
	"fmt"
	"strings"
)

// Doc is the parsed document. The empty section ("") holds top-level keys.
type Doc map[string]map[string]string

// Parse reads s and returns a Doc.
func Parse(s string) (Doc, error) {
	doc := Doc{"": {}}
	current := ""
	for ln, line := range strings.Split(s, "\n") {
		t := strings.TrimSpace(line)
		if t == "" || strings.HasPrefix(t, "#") || strings.HasPrefix(t, ";") {
			continue
		}
		if strings.HasPrefix(t, "[") && strings.HasSuffix(t, "]") {
			name := strings.TrimSpace(t[1 : len(t)-1])
			current = name
			if _, ok := doc[current]; !ok {
				doc[current] = map[string]string{}
			}
			continue
		}
		eq := strings.IndexByte(t, '=')
		if eq < 0 {
			return nil, fmt.Errorf("ini: line %d: malformed %q", ln+1, t)
		}
		k := strings.TrimSpace(t[:eq])
		v := strings.TrimSpace(t[eq+1:])
		section, ok := doc[current]
		if !ok {
			section = map[string]string{}
			doc[current] = section
		}
		section[k] = v
	}
	return doc, nil
}

// Render returns the INI string for the document.
func Render(doc Doc) string {
	var sb strings.Builder
	if top := doc[""]; len(top) > 0 {
		for _, k := range sortKeys(top) {
			fmt.Fprintf(&sb, "%s = %s\n", k, top[k])
		}
	}
	for _, name := range sortKeys(doc) {
		if name == "" {
			continue
		}
		sb.WriteByte('\n')
		fmt.Fprintf(&sb, "[%s]\n", name)
		for _, k := range sortKeys(doc[name]) {
			fmt.Fprintf(&sb, "%s = %s\n", k, doc[name][k])
		}
	}
	return sb.String()
}

func sortKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	for i := 1; i < len(keys); i++ {
		for j := i; j > 0 && keys[j-1] > keys[j]; j-- {
			keys[j-1], keys[j] = keys[j], keys[j-1]
		}
	}
	return keys
}
