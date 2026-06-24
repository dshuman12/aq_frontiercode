package hash_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/hash"
)

func TestParseAlgorithm(t *testing.T) {
	for s, want := range map[string]hash.Algorithm{
		"md5": hash.AlgMD5, "sha1": hash.AlgSHA1, "sha256": hash.AlgSHA256,
	} {
		got, err := hash.ParseAlgorithm(s)
		if err != nil || got != want {
			t.Errorf("%q: got %v err %v", s, got, err)
		}
	}
}

func TestParseAlgorithmUnknown(t *testing.T) {
	if _, err := hash.ParseAlgorithm("blake3"); err == nil {
		t.Error("expected error")
	}
}

func TestHexMD5KnownVector(t *testing.T) {
	got := hash.Hex(hash.AlgMD5, []byte(""))
	if got != "d41d8cd98f00b204e9800998ecf8427e" {
		t.Errorf("got %q", got)
	}
}

func TestHexSHA256KnownVector(t *testing.T) {
	got := hash.Hex(hash.AlgSHA256, []byte("abc"))
	if got != "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" {
		t.Errorf("got %q", got)
	}
}

func TestTruncate(t *testing.T) {
	d := "abcdef"
	if got := hash.Truncate(d, 3); got != "abc" {
		t.Errorf("got %q", got)
	}
	if got := hash.Truncate(d, 100); got != d {
		t.Errorf("got %q", got)
	}
	if got := hash.Truncate(d, 0); got != d {
		t.Errorf("got %q", got)
	}
}

func TestFieldFingerprintDeterministic(t *testing.T) {
	a := hash.FieldFingerprint(hash.AlgSHA256, map[string]string{"a": "1", "b": "2"})
	b := hash.FieldFingerprint(hash.AlgSHA256, map[string]string{"b": "2", "a": "1"})
	if a != b {
		t.Errorf("not deterministic: %q vs %q", a, b)
	}
}

func TestFieldFingerprintDistinctInputs(t *testing.T) {
	a := hash.FieldFingerprint(hash.AlgSHA256, map[string]string{"a": "1"})
	b := hash.FieldFingerprint(hash.AlgSHA256, map[string]string{"a": "2"})
	if a == b {
		t.Error("expected distinct")
	}
}

func TestFieldFingerprintLength(t *testing.T) {
	got := hash.FieldFingerprint(hash.AlgSHA256, map[string]string{"a": "1"})
	if len(got) != 12 {
		t.Errorf("got %d: %q", len(got), got)
	}
}
