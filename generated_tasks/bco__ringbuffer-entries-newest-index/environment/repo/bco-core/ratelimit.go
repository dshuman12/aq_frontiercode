package main

import (
	"sync"
	"time"

	"github.com/libp2p/go-libp2p/core/peer"
)

// peerAppRateLimiter enforces contracts/c-api-surface.md limits for orchestration frames.
type peerAppRateLimiter struct {
	mu sync.Mutex
	su map[peer.ID][]time.Time
	cr map[peer.ID]claimWindow
	al map[peer.ID]claimWindow // ALLOWLIST_SYNC: max 2 per second per peer
}

type claimWindow struct {
	start time.Time
	count int
}

func newPeerAppRateLimiter() *peerAppRateLimiter {
	return &peerAppRateLimiter{
		su: make(map[peer.ID][]time.Time),
		cr: make(map[peer.ID]claimWindow),
		al: make(map[peer.ID]claimWindow),
	}
}

// Reset clears per-peer counters (US4 network refresh after connection teardown).
func (l *peerAppRateLimiter) Reset() {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.su = make(map[peer.ID][]time.Time)
	l.cr = make(map[peer.ID]claimWindow)
	l.al = make(map[peer.ID]claimWindow)
}

// resetPeer clears rate-limit state for one remote peer (e.g. after transport loss + reconnect).
func (l *peerAppRateLimiter) resetPeer(id peer.ID) {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.su, id)
	delete(l.cr, id)
	delete(l.al, id)
}

func pruneSince(ts []time.Time, cutoff time.Time) []time.Time {
	i := 0
	for _, t := range ts {
		if t.After(cutoff) {
			ts[i] = t
			i++
		}
	}
	return ts[:i]
}

// AllowStateUpdate returns false when peer exceeds 10 STATE_UPDATE per rolling second.
func (l *peerAppRateLimiter) AllowStateUpdate(id peer.ID, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	cutoff := now.Add(-time.Second)
	ts := pruneSince(l.su[id], cutoff)
	if len(ts) >= 10 {
		l.su[id] = ts
		return false
	}
	ts = append(ts, now)
	l.su[id] = ts
	return true
}

// AllowClaimRequest returns false when peer exceeds 2 CLAIM_REQUEST per 5 seconds.
func (l *peerAppRateLimiter) AllowClaimRequest(id peer.ID, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	w := l.cr[id]
	if now.Sub(w.start) >= 5*time.Second {
		l.cr[id] = claimWindow{start: now, count: 1}
		return true
	}
	if w.count >= 2 {
		return false
	}
	w.count++
	l.cr[id] = w
	return true
}

// AllowAllowlistSync returns false when peer exceeds 2 ALLOWLIST_SYNC per second.
func (l *peerAppRateLimiter) AllowAllowlistSync(id peer.ID, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	w := l.al[id]
	if now.Sub(w.start) >= time.Second {
		l.al[id] = claimWindow{start: now, count: 1}
		return true
	}
	if w.count >= 2 {
		return false
	}
	w.count++
	l.al[id] = w
	return true
}

// inboundIPRateLimiter limits inbound dials to 5 per source IP per rolling minute (c-api-surface.md).
type inboundIPRateLimiter struct {
	mu      sync.Mutex
	accepts map[string][]time.Time
}

func newInboundIPRateLimiter() *inboundIPRateLimiter {
	return &inboundIPRateLimiter{accepts: make(map[string][]time.Time)}
}

func (l *inboundIPRateLimiter) allow(ip string, now time.Time) bool {
	if ip == "" {
		return true
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	cutoff := now.Add(-time.Minute)
	ts := pruneSince(l.accepts[ip], cutoff)
	if len(ts) >= 5 {
		l.accepts[ip] = ts
		return false
	}
	ts = append(ts, now)
	l.accepts[ip] = ts
	return true
}
