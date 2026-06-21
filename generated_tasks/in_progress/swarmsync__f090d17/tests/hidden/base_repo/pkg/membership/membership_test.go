package membership

import (
	"testing"
	"time"
)

// --- Member tests ---

func TestMember_New(t *testing.T) {
	m := NewMember("n1")
	if m.ID != "n1" || m.State != StateAlive || m.Incarnation != 0 {
		t.Fatal("invalid new member")
	}
}

func TestMember_Clone(t *testing.T) {
	m := NewMember("n1")
	m.Meta["role"] = "leader"
	c := m.Clone()
	c.Meta["role"] = "follower"
	if m.Meta["role"] != "leader" {
		t.Fatal("clone modified original")
	}
}

func TestMemberState_String(t *testing.T) {
	tests := []struct {
		state MemberState
		want  string
	}{
		{StateAlive, "alive"},
		{StateSuspect, "suspect"},
		{StateDead, "dead"},
		{StateLeft, "left"},
		{MemberState(99), "unknown"},
	}
	for _, tc := range tests {
		if tc.state.String() != tc.want {
			t.Fatalf("expected %s, got %s", tc.want, tc.state.String())
		}
	}
}

// --- MemberList tests ---

func TestMemberList_NewContainsSelf(t *testing.T) {
	ml := NewMemberList("n1")
	self := ml.Self()
	if self.ID != "n1" || self.State != StateAlive {
		t.Fatal("self should be alive")
	}
}

func TestMemberList_AliveNewMember(t *testing.T) {
	ml := NewMemberList("n1")
	changed := ml.Alive("n2", 0, nil)
	if !changed {
		t.Fatal("new member should change list")
	}
	m := ml.Get("n2")
	if m == nil || m.State != StateAlive {
		t.Fatal("n2 should be alive")
	}
}

func TestMemberList_AliveHigherIncarnation(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 1, nil)
	changed := ml.Alive("n2", 5, nil)
	if !changed {
		t.Fatal("higher incarnation should update")
	}
	m := ml.Get("n2")
	if m.Incarnation != 5 {
		t.Fatalf("expected incarnation 5, got %d", m.Incarnation)
	}
}

func TestMemberList_AliveLowerIncarnationIgnored(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 5, nil)
	changed := ml.Alive("n2", 3, nil)
	if changed {
		t.Fatal("lower incarnation should not update")
	}
}

func TestMemberList_Suspect(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 1, nil)
	changed := ml.Suspect("n2", 1)
	if !changed {
		t.Fatal("suspect should succeed")
	}
	m := ml.Get("n2")
	if m.State != StateSuspect {
		t.Fatal("n2 should be suspect")
	}
}

func TestMemberList_SuspectSelfRefutes(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Suspect("n1", 0)
	self := ml.Self()
	if self.State != StateAlive {
		t.Fatal("self should refute suspicion")
	}
	if self.Incarnation != 1 {
		t.Fatal("self should increment incarnation")
	}
}

func TestMemberList_Dead(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 1, nil)
	changed := ml.Dead("n2", 1)
	if !changed {
		t.Fatal("dead should succeed")
	}
	m := ml.Get("n2")
	if m.State != StateDead {
		t.Fatal("n2 should be dead")
	}
}

func TestMemberList_DeadSelfRefutes(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Dead("n1", 0)
	self := ml.Self()
	if self.State != StateAlive {
		t.Fatal("self should refute death")
	}
}

func TestMemberList_Leave(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Leave()
	self := ml.Self()
	if self.State != StateLeft {
		t.Fatal("self should be left")
	}
}

func TestMemberList_AliveMembers(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 0, nil)
	ml.Alive("n3", 0, nil)
	ml.Dead("n3", 0)

	alive := ml.AliveMembers(false)
	if len(alive) != 2 { // n1, n2
		t.Fatalf("expected 2 alive, got %d", len(alive))
	}
	alive = ml.AliveMembers(true)
	if len(alive) != 1 { // only n2
		t.Fatalf("expected 1 alive (skip self), got %d", len(alive))
	}
}

func TestMemberList_AllMembers(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 0, nil)
	all := ml.AllMembers()
	if len(all) != 2 {
		t.Fatalf("expected 2, got %d", len(all))
	}
}

func TestMemberList_Len(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 0, nil)
	ml.Alive("n3", 0, nil)
	if ml.Len() != 3 {
		t.Fatalf("expected 3, got %d", ml.Len())
	}
}

func TestMemberList_RemoveDead(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 0, nil)
	ml.Dead("n2", 0)
	removed := ml.RemoveDead()
	if removed != 1 {
		t.Fatalf("expected 1 removed, got %d", removed)
	}
	if ml.Len() != 1 {
		t.Fatal("only self should remain")
	}
}

func TestMemberList_Meta(t *testing.T) {
	ml := NewMemberList("n1")
	meta := map[string]string{"role": "worker", "zone": "us-east"}
	ml.Alive("n2", 0, meta)
	m := ml.Get("n2")
	if m.Meta["role"] != "worker" || m.Meta["zone"] != "us-east" {
		t.Fatal("meta mismatch")
	}
}

func TestMemberList_SuspectThenAlive(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 1, nil)
	ml.Suspect("n2", 1)
	m := ml.Get("n2")
	if m.State != StateSuspect {
		t.Fatal("should be suspect")
	}
	ml.Alive("n2", 1, nil) // same incarnation but suspect → alive transition
	m = ml.Get("n2")
	if m.State != StateAlive {
		t.Fatal("alive at same incarnation should clear suspicion")
	}
}

// --- SWIM Detector tests ---

func alwaysAck(target string) ProbeResult   { return ProbeAck }
func alwaysNack(target string) ProbeResult  { return ProbeNack }
func alwaysAckIndirect(_, _ string) ProbeResult { return ProbeAck }
func alwaysNackIndirect(_, _ string) ProbeResult { return ProbeNack }

func TestSWIM_ProbeRound_Ack(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 0, nil)
	cfg := DefaultSWIMConfig()
	sd := NewSWIMDetector(ml, cfg, alwaysAck, alwaysNackIndirect, 42)
	event := sd.RunProbeRound()
	if event == nil {
		t.Fatal("expected probe event")
	}
	if event.Result != ProbeAck {
		t.Fatal("expected ack")
	}
}

func TestSWIM_ProbeRound_NoAlive(t *testing.T) {
	ml := NewMemberList("n1")
	cfg := DefaultSWIMConfig()
	sd := NewSWIMDetector(ml, cfg, alwaysAck, alwaysNackIndirect, 42)
	event := sd.RunProbeRound()
	if event != nil {
		t.Fatal("no target should return nil")
	}
}

func TestSWIM_Suspect_OnNack(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 0, nil)
	cfg := DefaultSWIMConfig()
	sd := NewSWIMDetector(ml, cfg, alwaysNack, alwaysNackIndirect, 42)
	sd.RunProbeRound()
	m := ml.Get("n2")
	if m.State != StateSuspect {
		t.Fatal("n2 should be suspected after failed probe")
	}
}

func TestSWIM_IndirectAck_ClearsSuspicion(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 0, nil)
	ml.Alive("n3", 0, nil) // mediator
	cfg := DefaultSWIMConfig()
	cfg.IndirectChecks = 1
	sd := NewSWIMDetector(ml, cfg, alwaysNack, alwaysAckIndirect, 42)
	sd.RunProbeRound()
	// Indirect ack should prevent suspicion
	if sd.SuspectCount() != 0 {
		t.Fatal("indirect ack should clear suspicion")
	}
}

func TestSWIM_DeadAfterTimeout(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 0, nil)
	cfg := DefaultSWIMConfig()
	cfg.SuspicionTimeout = 0 // instant timeout for testing
	sd := NewSWIMDetector(ml, cfg, alwaysNack, alwaysNackIndirect, 42)
	sd.RunProbeRound() // suspect
	time.Sleep(time.Millisecond)
	sd.RunProbeRound() // should check timeout and declare dead
	m := ml.Get("n2")
	if m.State != StateDead {
		t.Fatalf("n2 should be dead after timeout, got %s", m.State)
	}
}

func TestSWIM_Rounds(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 0, nil)
	cfg := DefaultSWIMConfig()
	sd := NewSWIMDetector(ml, cfg, alwaysAck, alwaysNackIndirect, 42)
	sd.RunProbeRound()
	sd.RunProbeRound()
	if sd.Rounds() != 2 {
		t.Fatalf("expected 2 rounds, got %d", sd.Rounds())
	}
}

func TestSWIM_History(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 0, nil)
	cfg := DefaultSWIMConfig()
	sd := NewSWIMDetector(ml, cfg, alwaysAck, alwaysNackIndirect, 42)
	sd.RunProbeRound()
	h := sd.History()
	if len(h) < 1 {
		t.Fatal("expected at least 1 history entry")
	}
}

func TestSWIM_HistoryBounded(t *testing.T) {
	ml := NewMemberList("n1")
	ml.Alive("n2", 0, nil)
	ml.Alive("n3", 0, nil)
	cfg := DefaultSWIMConfig()
	sd := NewSWIMDetector(ml, cfg, alwaysAck, alwaysNackIndirect, 42)
	for i := 0; i < 15000; i++ {
		sd.RunProbeRound()
	}
	h := sd.History()
	if len(h) > maxProbeHistory {
		t.Fatalf("history should be bounded to %d, got %d", maxProbeHistory, len(h))
	}
	if len(h) == 0 {
		t.Fatal("history should not be empty after many rounds")
	}
}
// --- Scaling tests ---

func TestScaledConfig_Small(t *testing.T) {
	sc := DefaultScaling()
	cfg := sc.ConfigForSize(2)
	if cfg.ProbeInterval <= 0 { t.Fatal("interval should be positive") }
}

func TestScaledConfig_Large(t *testing.T) {
	sc := DefaultScaling()
	small := sc.ConfigForSize(4)
	large := sc.ConfigForSize(100)
	if large.ProbeInterval <= small.ProbeInterval { t.Fatal("larger cluster should have longer interval") }
	if large.IndirectChecks <= small.IndirectChecks { t.Fatal("larger cluster should have more indirect checks") }
}

func TestClusterSizeEstimator(t *testing.T) {
	e := NewClusterSizeEstimator()
	e.Observe("n1"); e.Observe("n2"); e.Observe("n3")
	if e.Estimate() != 3 { t.Fatalf("expected 3, got %d", e.Estimate()) }
	e.Reset()
	if e.Estimate() != 0 { t.Fatal("should be 0 after reset") }
}
