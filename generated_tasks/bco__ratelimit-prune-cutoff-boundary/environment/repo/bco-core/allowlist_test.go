package main

import (
	"strings"
	"testing"

	libp2pcrypto "github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
)

func TestPairCompareCodeSymmetric(t *testing.T) {
	_, pubA, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	_, pubB, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	a, err := peer.IDFromPublicKey(pubA)
	if err != nil {
		t.Fatal(err)
	}
	b, err := peer.IDFromPublicKey(pubB)
	if err != nil {
		t.Fatal(err)
	}
	c1 := PairCompareCode(a, b)
	c2 := PairCompareCode(b, a)
	if c1 != c2 {
		t.Fatalf("compare code not symmetric: %q vs %q", c1, c2)
	}
	if len(c1) != 6 {
		t.Fatalf("expected 6 digits, got %q", c1)
	}
}

func TestPeerAllowlist_ReplaceFromStrings_decodeError(t *testing.T) {
	a := NewPeerAllowlist()
	err := a.ReplaceFromStrings(map[string]string{"%%%not-a-peer-id%%%": "n"}, 1)
	if err == nil || !strings.Contains(err.Error(), "allowlist entry") {
		t.Fatalf("expected decode error, got %v", err)
	}
}

func TestPeerAllowlistRoundTrip(t *testing.T) {
	a := NewPeerAllowlist()
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	id, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	a.Add(id, "Test Phone")
	m := a.ToStringMap()
	b := NewPeerAllowlist()
	if err := b.ReplaceFromStrings(m, 1); err != nil {
		t.Fatal(err)
	}
	if !b.IsAllowed(id) {
		t.Fatal("expected peer allowed after round-trip")
	}
}

func TestPeerAllowlistLen(t *testing.T) {
	a := NewPeerAllowlist()
	if got := a.Len(); got != 0 {
		t.Fatalf("empty allowlist Len: got %d want 0", got)
	}

	_, pub1, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	id1, err := peer.IDFromPublicKey(pub1)
	if err != nil {
		t.Fatal(err)
	}
	a.Add(id1, "one")
	if got := a.Len(); got != 1 {
		t.Fatalf("after one Add: got %d want 1", got)
	}

	_, pub2, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	id2, err := peer.IDFromPublicKey(pub2)
	if err != nil {
		t.Fatal(err)
	}
	a.Add(id2, "two")
	if got := a.Len(); got != 2 {
		t.Fatalf("after second Add: got %d want 2", got)
	}

	a.Remove(id1)
	if got := a.Len(); got != 1 {
		t.Fatalf("after Remove: got %d want 1", got)
	}
}

func TestPendingPairingStageGetRemove(t *testing.T) {
	p := NewPendingPairing()
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	id, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}

	t.Run("missing", func(t *testing.T) {
		_, ok := p.Get(id)
		if ok {
			t.Fatal("expected no pending peer")
		}
	})

	info := PendingPeerInfo{CompareCode: "123456", Fingerprint: "fp", PeerName: "Alice", Platform: "macos", TargetBTDevice: "AirPods"}
	p.Stage(id, info)

	t.Run("get after stage", func(t *testing.T) {
		got, ok := p.Get(id)
		if !ok {
			t.Fatal("expected pending peer")
		}
		if got != info {
			t.Fatalf("Get: got %+v want %+v", got, info)
		}
		if got.Platform != "macos" {
			t.Fatalf("Platform: got %q want %q", got.Platform, "macos")
		}
		if got.TargetBTDevice != "AirPods" {
			t.Fatalf("TargetBTDevice: got %q want %q", got.TargetBTDevice, "AirPods")
		}
	})

	t.Run("remove", func(t *testing.T) {
		p.Remove(id)
		_, ok := p.Get(id)
		if ok {
			t.Fatal("expected peer removed from pending")
		}
		p.Remove(id) // idempotent
	})
}

func TestPeerFingerprint(t *testing.T) {
	t.Run("long_string_truncated", func(t *testing.T) {
		_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
		if err != nil {
			t.Fatal(err)
		}
		id, err := peer.IDFromPublicKey(pub)
		if err != nil {
			t.Fatal(err)
		}
		s := id.String()
		if len(s) <= 16 {
			t.Fatalf("test assumes long peer ID string, got len %d", len(s))
		}
		want := s[:8] + "..." + s[len(s)-8:]
		if got := PeerFingerprint(id); got != want {
			t.Fatalf("got %q want %q", got, want)
		}
	})

	t.Run("empty_id_unchanged", func(t *testing.T) {
		var id peer.ID
		if got := PeerFingerprint(id); got != "" {
			t.Fatalf("got %q want empty", got)
		}
	})
}
