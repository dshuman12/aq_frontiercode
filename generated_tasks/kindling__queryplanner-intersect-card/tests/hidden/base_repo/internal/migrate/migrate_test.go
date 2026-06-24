package migrate_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/manifest"
	"github.com/dleblanc/kindling/internal/migrate"
)

func TestStepsListed(t *testing.T) {
	if len(migrate.Steps()) < 2 {
		t.Errorf("got %d", len(migrate.Steps()))
	}
}

func TestPlanNoOp(t *testing.T) {
	plan, err := migrate.Plan(3, 3)
	if err != nil || plan != nil {
		t.Errorf("got %v %v", plan, err)
	}
}

func TestPlanForward(t *testing.T) {
	plan, err := migrate.Plan(1, 3)
	if err != nil {
		t.Fatal(err)
	}
	if len(plan) != 2 {
		t.Errorf("got %d", len(plan))
	}
}

func TestPlanBackward(t *testing.T) {
	if _, err := migrate.Plan(5, 1); err == nil {
		t.Error("expected error")
	}
}

func TestPlanMissingStep(t *testing.T) {
	if _, err := migrate.Plan(0, 1); err == nil {
		t.Error("expected error")
	}
}

func TestApplySetsVersion(t *testing.T) {
	m := &manifest.Manifest{Version: 1, Entries: map[string]*manifest.Entry{}}
	plan, _ := migrate.Plan(1, manifest.SchemaVersion)
	if err := migrate.Apply(m, plan); err != nil {
		t.Fatal(err)
	}
	if m.Version != manifest.SchemaVersion {
		t.Errorf("got %d", m.Version)
	}
}
