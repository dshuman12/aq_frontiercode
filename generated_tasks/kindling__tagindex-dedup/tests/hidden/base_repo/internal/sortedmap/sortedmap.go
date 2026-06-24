// Package sortedmap provides aggregation helpers over sorted maps.
package sortedmap

import "sort"

// GroupByKey groups (key, value) pairs by key.
func GroupByKey(pairs map[string]string) map[string][]string {
	out := map[string][]string{}
	for k, v := range pairs {
		out[k] = append(out[k], v)
	}
	return out
}

// SumByKey aggregates uint64 values keyed by string.
func SumByKey(pairs map[string]uint64) map[string]uint64 {
	out := map[string]uint64{}
	for k, n := range pairs {
		out[k] += n
	}
	return out
}

// TopNByValue returns the top n entries by value (descending).
func TopNByValue(m map[string]uint64, n int) []KV {
	pairs := make([]KV, 0, len(m))
	for k, v := range m {
		pairs = append(pairs, KV{Key: k, Value: v})
	}
	sort.Slice(pairs, func(i, j int) bool {
		if pairs[i].Value != pairs[j].Value {
			return pairs[i].Value > pairs[j].Value
		}
		return pairs[i].Key < pairs[j].Key
	})
	if n > 0 && n < len(pairs) {
		pairs = pairs[:n]
	}
	return pairs
}

// KV is a key/value pair returned from TopNByValue.
type KV struct {
	Key   string
	Value uint64
}

// Filter returns entries for which pred returns true.
func Filter(m map[string]uint64, pred func(string, uint64) bool) map[string]uint64 {
	out := map[string]uint64{}
	for k, v := range m {
		if pred(k, v) {
			out[k] = v
		}
	}
	return out
}
