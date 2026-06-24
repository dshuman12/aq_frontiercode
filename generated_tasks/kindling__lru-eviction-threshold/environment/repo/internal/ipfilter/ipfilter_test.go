package ipfilter

import "testing"

func TestDefaultDeny(t *testing.T) {
	f := New(DecisionDeny)
	if f.Decide("8.8.8.8") != DecisionDeny {
		t.Fatal("expected deny")
	}
}

func TestAllowSpecific(t *testing.T) {
	f := New(DecisionDeny)
	_ = f.Allow("10.0.0.0/8")
	if f.Decide("10.0.5.1") != DecisionAllow {
		t.Fatal("expected allow")
	}
	if f.Decide("8.8.8.8") != DecisionDeny {
		t.Fatal("expected deny")
	}
}

func TestLongestPrefixWins(t *testing.T) {
	f := New(DecisionDeny)
	_ = f.Allow("10.0.0.0/8")
	_ = f.Deny("10.0.1.0/24")
	if f.Decide("10.0.1.42") != DecisionDeny {
		t.Fatal("expected deny via /24")
	}
	if f.Decide("10.0.5.1") != DecisionAllow {
		t.Fatal("expected allow via /8")
	}
}

func TestBadCIDRRejected(t *testing.T) {
	f := New(DecisionAllow)
	if err := f.Allow("not-a-cidr"); err == nil {
		t.Fatal("expected err")
	}
}

func TestReset(t *testing.T) {
	f := New(DecisionDeny)
	_ = f.Allow("10.0.0.0/8")
	f.Reset()
	if len(f.Rules()) != 0 {
		t.Fatal("expected empty after reset")
	}
}

func TestUnparseableIP(t *testing.T) {
	f := New(DecisionAllow)
	if f.Decide("nonsense") != DecisionAllow {
		t.Fatal("expected default")
	}
}
