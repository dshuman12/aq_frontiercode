package membership

import (
	"math/rand"
	"sync"
	"time"
)

// SWIMConfig holds parameters for the SWIM failure detector.
type SWIMConfig struct {
	// ProbeInterval is how often to probe a random member.
	ProbeInterval time.Duration
	// ProbeTimeout is how long to wait for a direct ack.
	ProbeTimeout time.Duration
	// IndirectChecks is the number of indirect probes to send.
	IndirectChecks int
	// SuspicionTimeout is how long a member stays suspect before being declared dead.
	SuspicionTimeout time.Duration
}

// DefaultSWIMConfig returns reasonable defaults.
func DefaultSWIMConfig() SWIMConfig {
	return SWIMConfig{
		ProbeInterval:    time.Second,
		ProbeTimeout:     500 * time.Millisecond,
		IndirectChecks:   3,
		SuspicionTimeout: 5 * time.Second,
	}
}

// ProbeResult represents the outcome of a ping probe.
type ProbeResult int

const (
	ProbeAck     ProbeResult = iota // Direct ack received
	ProbeNack                       // No response
	ProbeTimeout                    // Timed out
)

// ProbeFunc is a callback that simulates or performs a ping probe to a target.
// Returns ProbeAck if the target responds, ProbeNack/ProbeTimeout otherwise.
type ProbeFunc func(target string) ProbeResult

// IndirectProbeFunc asks a mediator to probe the target on our behalf.
type IndirectProbeFunc func(mediator, target string) ProbeResult

const maxProbeHistory = 10000

// SWIMDetector implements the SWIM protocol for failure detection.
// It runs probe rounds, manages suspicion timers, and updates the member list.
type SWIMDetector struct {
	mu           sync.Mutex
	config       SWIMConfig
	memberList   *MemberList
	suspicionMap map[string]time.Time // nodeID → when suspicion started
	probeFunc    ProbeFunc
	indirectFunc IndirectProbeFunc
	rng          *rand.Rand
	roundCount   uint64
	probeHistory []ProbeEvent
}

// ProbeEvent records the outcome of a single probe.
type ProbeEvent struct {
	Round     uint64
	Target    string
	Result    ProbeResult
	Indirect  bool
	Timestamp time.Time
}

// NewSWIMDetector creates a failure detector for the given membership list.
func NewSWIMDetector(ml *MemberList, config SWIMConfig, probeFn ProbeFunc, indirectFn IndirectProbeFunc, seed int64) *SWIMDetector {
	return &SWIMDetector{
		config:       config,
		memberList:   ml,
		suspicionMap: make(map[string]time.Time),
		probeFunc:    probeFn,
		indirectFunc: indirectFn,
		rng:          rand.New(rand.NewSource(seed)),
	}
}

// RunProbeRound executes one round of the SWIM protocol:
// 1. Select a random alive member to probe
// 2. Send a direct ping
// 3. If no ack, send indirect pings through k mediators
// 4. If still no ack, mark as suspect
// 5. Check suspicion timeouts and declare dead members
func (sd *SWIMDetector) RunProbeRound() *ProbeEvent {
	sd.mu.Lock()
	defer sd.mu.Unlock()
	sd.roundCount++

	// Step 1: Select target
	alive := sd.memberList.AliveMembers(true)
	if len(alive) == 0 {
		return nil
	}
	targetIdx := sd.rng.Intn(len(alive))
	target := alive[targetIdx]

	// Step 2: Direct probe
	result := sd.probeFunc(target)
	event := &ProbeEvent{
		Round:     sd.roundCount,
		Target:    target,
		Result:    result,
		Indirect:  false,
		Timestamp: time.Now(),
	}
	sd.recordProbe(*event)

	if result == ProbeAck {
		delete(sd.suspicionMap, target)
		return event
	}

	// Step 3: Indirect probes
	mediators := sd.selectMediators(alive, target, sd.config.IndirectChecks)
	indirectAck := false
	for _, med := range mediators {
		ir := sd.indirectFunc(med, target)
		sd.recordProbe(ProbeEvent{
			Round:     sd.roundCount,
			Target:    target,
			Result:    ir,
			Indirect:  true,
			Timestamp: time.Now(),
		})
		if ir == ProbeAck {
			indirectAck = true
			break
		}
	}

	if indirectAck {
		delete(sd.suspicionMap, target)
		event.Result = ProbeAck
		return event
	}

	// Step 4: Mark as suspect
	if _, isSuspect := sd.suspicionMap[target]; !isSuspect {
		m := sd.memberList.Get(target)
		if m != nil {
			sd.memberList.Suspect(target, m.Incarnation)
			sd.suspicionMap[target] = time.Now()
		}
	}

	// Step 5: Check suspicion timeouts
	sd.checkSuspicionTimeouts()

	return event
}

// checkSuspicionTimeouts promotes suspects to dead if their timeout has expired.
func (sd *SWIMDetector) checkSuspicionTimeouts() {
	now := time.Now()
	for nodeID, started := range sd.suspicionMap {
		if now.Sub(started) >= sd.config.SuspicionTimeout {
			m := sd.memberList.Get(nodeID)
			if m != nil {
				sd.memberList.Dead(nodeID, m.Incarnation)
			}
			delete(sd.suspicionMap, nodeID)
		}
	}
}

// selectMediators picks up to n random alive members excluding target and self.
func (sd *SWIMDetector) selectMediators(alive []string, target string, n int) []string {
	candidates := make([]string, 0, len(alive))
	for _, id := range alive {
		if id != target {
			candidates = append(candidates, id)
		}
	}
	if n > len(candidates) {
		n = len(candidates)
	}
	for i := len(candidates) - 1; i > 0; i-- {
		j := sd.rng.Intn(i + 1)
		candidates[i], candidates[j] = candidates[j], candidates[i]
	}
	return candidates[:n]
}

// recordProbe appends a probe event, evicting the oldest half when the buffer is full.
func (sd *SWIMDetector) recordProbe(e ProbeEvent) {
	if len(sd.probeHistory) >= maxProbeHistory {
		n := copy(sd.probeHistory, sd.probeHistory[len(sd.probeHistory)/2:])
		sd.probeHistory = sd.probeHistory[:n]
	}
	sd.probeHistory = append(sd.probeHistory, e)
}

// History returns the probe history.
func (sd *SWIMDetector) History() []ProbeEvent {
	sd.mu.Lock()
	defer sd.mu.Unlock()
	result := make([]ProbeEvent, len(sd.probeHistory))
	copy(result, sd.probeHistory)
	return result
}

// Rounds returns the number of probe rounds executed.
func (sd *SWIMDetector) Rounds() uint64 {
	sd.mu.Lock()
	defer sd.mu.Unlock()
	return sd.roundCount
}

// SuspectCount returns the number of currently suspected members.
func (sd *SWIMDetector) SuspectCount() int {
	sd.mu.Lock()
	defer sd.mu.Unlock()
	return len(sd.suspicionMap)
}
