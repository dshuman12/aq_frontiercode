package gossip

import (
	"sync"
	"sync/atomic"
	"time"
)

// Stats tracks gossip protocol performance metrics.
type Stats struct {
	RoundsTotal     atomic.Int64
	PushTotal       atomic.Int64
	PullTotal       atomic.Int64
	EntriesPushed   atomic.Int64
	EntriesPulled   atomic.Int64
	BytesSent       atomic.Int64
	BytesReceived   atomic.Int64
	LastRoundTime   atomic.Int64
	startTime       time.Time
}

// NewStats creates a fresh stats tracker.
func NewStats() *Stats {
	return &Stats{startTime: time.Now()}
}

// RecordPushPull records the outcome of a push-pull exchange.
func (s *Stats) RecordPushPull(pushed, pulled int) {
	s.RoundsTotal.Add(1)
	s.PushTotal.Add(1)
	s.PullTotal.Add(1)
	s.EntriesPushed.Add(int64(pushed))
	s.EntriesPulled.Add(int64(pulled))
	s.LastRoundTime.Store(time.Now().UnixNano())
}

// RecordPush records a push-only operation.
func (s *Stats) RecordPush(entries int) {
	s.PushTotal.Add(1)
	s.EntriesPushed.Add(int64(entries))
}

// RecordPull records a pull-only operation.
func (s *Stats) RecordPull(entries int) {
	s.PullTotal.Add(1)
	s.EntriesPulled.Add(int64(entries))
}

// RecordBytes tracks bytes sent and received.
func (s *Stats) RecordBytes(sent, received int64) {
	s.BytesSent.Add(sent)
	s.BytesReceived.Add(received)
}

// Uptime returns how long this stats tracker has been running.
func (s *Stats) Uptime() time.Duration {
	return time.Since(s.startTime)
}

// Snapshot returns a point-in-time copy of all stats.
func (s *Stats) Snapshot() StatsSnapshot {
	return StatsSnapshot{
		Rounds:        s.RoundsTotal.Load(),
		Pushes:        s.PushTotal.Load(),
		Pulls:         s.PullTotal.Load(),
		EntriesPushed: s.EntriesPushed.Load(),
		EntriesPulled: s.EntriesPulled.Load(),
		BytesSent:     s.BytesSent.Load(),
		BytesReceived: s.BytesReceived.Load(),
		Uptime:        s.Uptime(),
	}
}

// StatsSnapshot is a point-in-time copy of gossip stats.
type StatsSnapshot struct {
	Rounds        int64
	Pushes        int64
	Pulls         int64
	EntriesPushed int64
	EntriesPulled int64
	BytesSent     int64
	BytesReceived int64
	Uptime        time.Duration
}

// HealthMonitor tracks cluster health based on gossip activity.
type HealthMonitor struct {
	mu               sync.RWMutex
	nodeLastSeen     map[string]time.Time
	healthyThreshold time.Duration
}

// NewHealthMonitor creates a health monitor.
func NewHealthMonitor(healthyThreshold time.Duration) *HealthMonitor {
	return &HealthMonitor{
		nodeLastSeen:     make(map[string]time.Time),
		healthyThreshold: healthyThreshold,
	}
}

// RecordActivity marks a node as seen at the current time.
func (hm *HealthMonitor) RecordActivity(nodeID string) {
	hm.mu.Lock()
	defer hm.mu.Unlock()
	hm.nodeLastSeen[nodeID] = time.Now()
}

// IsHealthy returns true if a node has been seen within the threshold.
func (hm *HealthMonitor) IsHealthy(nodeID string) bool {
	hm.mu.RLock()
	defer hm.mu.RUnlock()
	lastSeen, ok := hm.nodeLastSeen[nodeID]
	if !ok { return false }
	return time.Since(lastSeen) < hm.healthyThreshold
}

// HealthyNodes returns all nodes seen within the threshold.
func (hm *HealthMonitor) HealthyNodes() []string {
	hm.mu.RLock()
	defer hm.mu.RUnlock()
	var healthy []string
	now := time.Now()
	for id, lastSeen := range hm.nodeLastSeen {
		if now.Sub(lastSeen) < hm.healthyThreshold {
			healthy = append(healthy, id)
		}
	}
	return healthy
}

// UnhealthyNodes returns nodes not seen within the threshold.
func (hm *HealthMonitor) UnhealthyNodes() []string {
	hm.mu.RLock()
	defer hm.mu.RUnlock()
	var unhealthy []string
	now := time.Now()
	for id, lastSeen := range hm.nodeLastSeen {
		if now.Sub(lastSeen) >= hm.healthyThreshold {
			unhealthy = append(unhealthy, id)
		}
	}
	return unhealthy
}

// NodeCount returns the total tracked nodes.
func (hm *HealthMonitor) NodeCount() int {
	hm.mu.RLock()
	defer hm.mu.RUnlock()
	return len(hm.nodeLastSeen)
}

// Remove stops tracking a node.
func (hm *HealthMonitor) Remove(nodeID string) {
	hm.mu.Lock()
	defer hm.mu.Unlock()
	delete(hm.nodeLastSeen, nodeID)
}
