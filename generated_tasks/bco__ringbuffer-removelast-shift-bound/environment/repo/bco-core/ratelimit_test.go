package main

import (
	"testing"
	"time"

	libp2pcrypto "github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
)

func testPeerID(t *testing.T) peer.ID {
	t.Helper()
	_, pub, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		t.Fatal(err)
	}
	id, err := peer.IDFromPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func TestPruneSince(t *testing.T) {
	t0 := time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC)
	t1 := t0.Add(500 * time.Millisecond)
	t2 := t0.Add(time.Second)
	cutoff := t0.Add(750 * time.Millisecond)

	tests := []struct {
		name string
		in   []time.Time
		want []time.Time
	}{
		{
			name: "empty",
			in:   nil,
			want: []time.Time{},
		},
		{
			name: "all before cutoff removed",
			in:   []time.Time{t0, t0.Add(100 * time.Millisecond)},
			want: []time.Time{},
		},
		{
			name: "keeps strictly after cutoff",
			in:   []time.Time{t0, t1, t2},
			want: []time.Time{t2},
		},
		{
			name: "boundary equal to cutoff dropped",
			in:   []time.Time{cutoff, t2},
			want: []time.Time{t2},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Copy so pruneSince's in-place compaction does not alias across cases.
			cp := append([]time.Time(nil), tt.in...)
			got := pruneSince(cp, cutoff)
			if len(got) != len(tt.want) {
				t.Fatalf("len got %d want %d", len(got), len(tt.want))
			}
			for i := range got {
				if !got[i].Equal(tt.want[i]) {
					t.Fatalf("idx %d: got %v want %v", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestPeerAppRateLimiterAllowStateUpdateBurst(t *testing.T) {
	id := testPeerID(t)
	now := time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC)
	l := newPeerAppRateLimiter()

	for i := 0; i < 10; i++ {
		if !l.AllowStateUpdate(id, now) {
			t.Fatalf("call %d: expected allow", i+1)
		}
	}
	if l.AllowStateUpdate(id, now) {
		t.Fatal("11th STATE_UPDATE in same second: expected deny")
	}
	// One second later, rolling window empty for that instant cluster
	later := now.Add(time.Second)
	if !l.AllowStateUpdate(id, later) {
		t.Fatal("after 1s: expected allow")
	}
}

func TestPeerAppRateLimiterAllowClaimRequestWindow(t *testing.T) {
	id := testPeerID(t)
	t0 := time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC)
	l := newPeerAppRateLimiter()

	if !l.AllowClaimRequest(id, t0) {
		t.Fatal("first claim: expected allow")
	}
	if !l.AllowClaimRequest(id, t0.Add(time.Second)) {
		t.Fatal("second claim within 5s: expected allow")
	}
	if l.AllowClaimRequest(id, t0.Add(2 * time.Second)) {
		t.Fatal("third claim within 5s: expected deny")
	}
	// New window after 5s from window start (t0)
	tNext := t0.Add(5 * time.Second)
	if !l.AllowClaimRequest(id, tNext) {
		t.Fatal("first claim in new window: expected allow")
	}
}

func TestPeerAppRateLimiterResetAndResetPeer(t *testing.T) {
	idA := testPeerID(t)
	idB := testPeerID(t)
	now := time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC)
	l := newPeerAppRateLimiter()

	for i := 0; i < 10; i++ {
		l.AllowStateUpdate(idA, now)
	}
	if l.AllowStateUpdate(idA, now) {
		t.Fatal("idA should be at limit before reset")
	}
	for i := 0; i < 2; i++ {
		l.AllowClaimRequest(idB, now)
	}
	if l.AllowClaimRequest(idB, now.Add(time.Second)) {
		t.Fatal("idB claim should be denied before resetPeer")
	}

	l.resetPeer(idA)
	if !l.AllowStateUpdate(idA, now) {
		t.Fatal("after resetPeer(idA): expected STATE_UPDATE allow")
	}
	if l.AllowClaimRequest(idB, now.Add(2*time.Second)) {
		t.Fatal("idB claim limit should still apply after resetPeer(idA)")
	}

	l.Reset()
	if !l.AllowClaimRequest(idB, now.Add(3*time.Second)) {
		t.Fatal("after Reset: expected idB claim allow")
	}
}

func TestPeerAppRateLimiterNilSafe(t *testing.T) {
	var l *peerAppRateLimiter
	id := testPeerID(t)
	l.Reset()
	l.resetPeer(id)
}

func TestInboundIPRateLimiterAllow(t *testing.T) {
	base := time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		ip       string
		steps    []time.Time
		wantOK   []bool
	}{
		{
			name:   "empty IP always allowed",
			ip:     "",
			steps:  []time.Time{base, base, base, base, base, base, base},
			wantOK: []bool{true, true, true, true, true, true, true},
		},
		{
			name: "five per rolling minute then sixth denied same instant",
			ip:   "192.0.2.1",
			steps: []time.Time{
				base, base, base, base, base, base,
			},
			wantOK: []bool{true, true, true, true, true, false},
		},
		{
			name: "sixth allowed after oldest falls outside minute",
			ip:   "192.0.2.2",
			steps: []time.Time{
				base,
				base,
				base,
				base,
				base,
				base.Add(61 * time.Second),
			},
			wantOK: []bool{true, true, true, true, true, true},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			l := newInboundIPRateLimiter()
			if len(tt.steps) != len(tt.wantOK) {
				t.Fatalf("steps/wantOK length mismatch")
			}
			for i := range tt.steps {
				got := l.allow(tt.ip, tt.steps[i])
				if got != tt.wantOK[i] {
					t.Fatalf("step %d at %v: got %v want %v", i, tt.steps[i], got, tt.wantOK[i])
				}
			}
		})
	}
}
