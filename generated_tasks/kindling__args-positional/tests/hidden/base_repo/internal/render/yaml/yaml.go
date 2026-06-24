// Package yaml is a minimal YAML emitter for kindling reports.
package yaml

import (
	"fmt"
	"strings"

	"github.com/dleblanc/kindling/internal/group"
)

// Records emits records as a YAML sequence of maps.
func Records(items []map[string]string) string {
	var sb strings.Builder
	for _, item := range items {
		keys := sortedKeys(item)
		for i, k := range keys {
			if i == 0 {
				fmt.Fprintf(&sb, "- %s: %s\n", k, scalar(item[k]))
			} else {
				fmt.Fprintf(&sb, "  %s: %s\n", k, scalar(item[k]))
			}
		}
		if len(keys) == 0 {
			sb.WriteString("- \n")
		}
	}
	return sb.String()
}

// Groups emits group buckets.
func Groups(buckets []group.Bucket) string {
	var sb strings.Builder
	for _, b := range buckets {
		fmt.Fprintf(&sb, "- key: %s\n  count: %d\n", scalar(b.Key), b.Count)
	}
	return sb.String()
}

// Map emits a top-level map.
func Map(pairs map[string]string) string {
	var sb strings.Builder
	for _, k := range sortedKeys(pairs) {
		fmt.Fprintf(&sb, "%s: %s\n", k, scalar(pairs[k]))
	}
	return sb.String()
}

func scalar(v string) string {
	if v == "" {
		return "''"
	}
	if needsQuoting(v) {
		return "'" + strings.ReplaceAll(v, "'", "''") + "'"
	}
	return v
}

func needsQuoting(v string) bool {
	if v == "true" || v == "false" || v == "null" || v == "~" {
		return true
	}
	for _, r := range v {
		switch r {
		case ':', '#', '-', '?', '|', '>', '\'', '"', ' ':
			return true
		}
	}
	return false
}

func sortedKeys[V any](m map[string]V) []string {
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
