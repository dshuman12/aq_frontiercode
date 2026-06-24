package merkle

import "testing"

// TestFastDiffEqualsDiffOnStructuralMismatch asserts the core anti-entropy
// invariant: FastDiff must produce exactly the same OnlyLocal / OnlyRemote /
// Different key sets as the authoritative Diff, INCLUDING when the two trees
// have different sizes (and therefore different internal shapes). The existing
// FastDiff tests only compare equal-size trees with identical key sets, which
// never exercise the mixed leaf-vs-internal subtree case.
func TestFastDiffEqualsDiffOnStructuralMismatch(t *testing.T) {
	mk := func(kv map[string]string) *Tree {
		tr := NewTree()
		for k, v := range kv {
			tr.Put(k, []byte(v))
		}
		return tr
	}
	eq := func(x, y []string) bool {
		if len(x) != len(y) {
			return false
		}
		for i := range x {
			if x[i] != y[i] {
				return false
			}
		}
		return true
	}
	cases := []struct {
		name string
		a, b map[string]string
	}{
		{"3vs1", map[string]string{"k1": "v1", "k2": "v2", "k3": "v3"}, map[string]string{"k1": "v1"}},
		{"1vs3", map[string]string{"k1": "v1"}, map[string]string{"k1": "v1", "k2": "v2", "k3": "v3"}},
		{"5vs2", map[string]string{"a": "1", "b": "2", "c": "3", "d": "4", "e": "5"}, map[string]string{"a": "1x", "f": "6"}},
		{"2vs5", map[string]string{"a": "1", "z": "9"}, map[string]string{"a": "1", "b": "2", "c": "3", "d": "4", "e": "5"}},
		{"7vs3", map[string]string{"k1": "1", "k2": "2", "k3": "3", "k4": "4", "k5": "5", "k6": "6", "k7": "7"}, map[string]string{"k2": "2", "k4": "X", "k9": "9"}},
	}
	for _, c := range cases {
		a, b := mk(c.a), mk(c.b)
		want := Diff(a, b)
		got := FastDiff(a, b)
		if !eq(got.OnlyLocal, want.OnlyLocal) || !eq(got.OnlyRemote, want.OnlyRemote) || !eq(got.Different, want.Different) {
			t.Fatalf("%s: FastDiff disagrees with Diff\n FastDiff: onlyLocal=%v onlyRemote=%v different=%v\n Diff:     onlyLocal=%v onlyRemote=%v different=%v",
				c.name, got.OnlyLocal, got.OnlyRemote, got.Different, want.OnlyLocal, want.OnlyRemote, want.Different)
		}
	}
}
