package hkdf_test

import (
	"bytes"
	"testing"

	"github.com/dleblanc/kindling/internal/hkdf"
	"github.com/dleblanc/kindling/internal/hmac"
)

func TestExtract(t *testing.T) {
	prk := hkdf.Extract(hmac.AlgSHA256, []byte("salt"), []byte("ikm"))
	if len(prk) != 32 {
		t.Errorf("got %d", len(prk))
	}
}

func TestExpandDeterministic(t *testing.T) {
	prk := make([]byte, 32)
	a, _ := hkdf.Expand(hmac.AlgSHA256, prk, []byte("info"), 42)
	b, _ := hkdf.Expand(hmac.AlgSHA256, prk, []byte("info"), 42)
	if !bytes.Equal(a, b) {
		t.Error("non-deterministic")
	}
}

func TestExpandLength(t *testing.T) {
	prk := make([]byte, 32)
	out, err := hkdf.Expand(hmac.AlgSHA256, prk, []byte("info"), 100)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 100 {
		t.Errorf("got %d", len(out))
	}
}

func TestExpandRejectsHugeLength(t *testing.T) {
	prk := make([]byte, 32)
	if _, err := hkdf.Expand(hmac.AlgSHA256, prk, nil, 256*32); err == nil {
		t.Error("expected error")
	}
}

func TestDerive(t *testing.T) {
	out, err := hkdf.Derive(hmac.AlgSHA256, []byte("salt"), []byte("ikm"), []byte("info"), 16)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 16 {
		t.Errorf("got %d", len(out))
	}
}

func TestDistinctInfoDifferentOutput(t *testing.T) {
	prk := make([]byte, 32)
	a, _ := hkdf.Expand(hmac.AlgSHA256, prk, []byte("a"), 16)
	b, _ := hkdf.Expand(hmac.AlgSHA256, prk, []byte("b"), 16)
	if bytes.Equal(a, b) {
		t.Error("expected distinct")
	}
}
