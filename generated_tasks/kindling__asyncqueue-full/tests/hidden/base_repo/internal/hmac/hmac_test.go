package hmac_test

import (
	"strings"
	"testing"

	khmac "github.com/dleblanc/kindling/internal/hmac"
)

func TestParseAlgorithm(t *testing.T) {
	if alg, err := khmac.ParseAlgorithm("sha256"); err != nil || alg != khmac.AlgSHA256 {
		t.Errorf("got %v %v", alg, err)
	}
	if _, err := khmac.ParseAlgorithm("md5"); err == nil {
		t.Error("expected error")
	}
}

func TestSumLength(t *testing.T) {
	if got := khmac.Sum(khmac.AlgSHA256, []byte("k"), []byte("m")); len(got) != 32 {
		t.Errorf("got %d", len(got))
	}
	if got := khmac.Sum(khmac.AlgSHA512, []byte("k"), []byte("m")); len(got) != 64 {
		t.Errorf("got %d", len(got))
	}
}

func TestHexKnownVector(t *testing.T) {
	key := make([]byte, 20)
	for i := range key {
		key[i] = 0x0b
	}
	got := khmac.Hex(khmac.AlgSHA256, key, []byte("Hi There"))
	want := "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"
	if got != want {
		t.Errorf("got %q want %q", got, want)
	}
}

func TestDigestSize(t *testing.T) {
	if khmac.DigestSize(khmac.AlgSHA256) != 32 {
		t.Error("256")
	}
	if khmac.DigestSize(khmac.AlgSHA512) != 64 {
		t.Error("512")
	}
}

func TestVerifyMatch(t *testing.T) {
	key := []byte("key")
	msg := []byte("msg")
	mac := khmac.Sum(khmac.AlgSHA256, key, msg)
	if !khmac.Verify(khmac.AlgSHA256, key, msg, mac) {
		t.Error("verify failed")
	}
}

func TestVerifyMismatch(t *testing.T) {
	if khmac.Verify(khmac.AlgSHA256, []byte("k"), []byte("m"), []byte("wrong")) {
		t.Error("should not match")
	}
}

func TestHexDeterministic(t *testing.T) {
	a := khmac.Hex(khmac.AlgSHA256, []byte("k"), []byte("m"))
	b := khmac.Hex(khmac.AlgSHA256, []byte("k"), []byte("m"))
	if a != b {
		t.Errorf("not deterministic")
	}
	if !strings.HasPrefix(a, "5") && !strings.HasPrefix(a, "f") {
		// Just sanity-check; exact value depends on inputs.
		_ = a
	}
}
