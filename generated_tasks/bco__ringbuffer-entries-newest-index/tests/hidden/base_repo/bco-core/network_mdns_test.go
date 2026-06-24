//go:build !ci

package main

import (
	"context"
	"os"
	"testing"
	"time"
)

// Real LAN / same-host mDNS smoke test. Excluded from CI builds that pass -tags=ci (see README).
// Run manually: BCO_MDNS_SMOKE=1 go test -race -v -count=1 -run TestRealMDNS ./...
func TestRealMDNS_TwoLocalHostsDiscoverAndExchangeState(t *testing.T) {
	if os.Getenv("BCO_MDNS_SMOKE") != "1" {
		t.Skip("set BCO_MDNS_SMOKE=1 to run real mDNS smoke (requires multicast; same machine or LAN)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	d1 := t.TempDir()
	d2 := t.TempDir()

	h1, err := NewHostForStorage(ctx, d1)
	if err != nil {
		t.Fatal(err)
	}
	h2, err := NewHostForStorage(ctx, d2)
	if err != nil {
		t.Fatal(err)
	}

	eng1, net1, err := startEngineWithHost(ctx, h1, "mdns-smoke-a", d1, false, false)
	if err != nil {
		t.Fatal(err)
	}
	eng2, net2, err := startEngineWithHost(ctx, h2, "mdns-smoke-b", d2, false, false)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = net1.Close(); _ = net2.Close() }()

	eng1.allowlist.Add(h2.ID(), "mdns-b")
	eng2.allowlist.Add(h1.ID(), "mdns-a")

	deadline := time.Now().Add(60 * time.Second)
	for time.Now().Before(deadline) {
		eng1.mu.Lock()
		_, ok1 := eng1.peers[h2.ID().String()]
		eng1.mu.Unlock()
		eng2.mu.Lock()
		_, ok2 := eng2.peers[h1.ID().String()]
		eng2.mu.Unlock()
		if ok1 && ok2 {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}

	t.Fatalf("timeout: expected mDNS discovery + HELLO + peer state on both hosts (peer1=%s peer2=%s)",
		h1.ID().ShortString(), h2.ID().ShortString())
}
