package big4_test

import (
	"context"
	"testing"

	"github.com/dleblanc/kindling/internal/cli"
	plancmd "github.com/dleblanc/kindling/internal/cli/cmd/plan"
	replicatecmd "github.com/dleblanc/kindling/internal/cli/cmd/replicate"
	"github.com/dleblanc/kindling/internal/dedup"
	"github.com/dleblanc/kindling/internal/manifest"
	"github.com/dleblanc/kindling/internal/migrate"
	"github.com/dleblanc/kindling/internal/plan"
	"github.com/dleblanc/kindling/internal/record"
	"github.com/dleblanc/kindling/internal/scan"
)

func TestPlanCmd(t *testing.T) {
	cli.Reset()
	cli.Register(plancmd.Cmd())
	if rc, err := cli.Run([]string{"plan"}); rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestReplicateCmdRequiresArgs(t *testing.T) {
	cli.Reset()
	cli.Register(replicatecmd.Cmd())
	if rc, _ := cli.Run([]string{"replicate"}); rc != 1 {
		t.Errorf("got rc=%d", rc)
	}
}

func TestReplicateCmdUnknownAdapter(t *testing.T) {
	cli.Reset()
	cli.Register(replicatecmd.Cmd())
	rc, _ := cli.Run([]string{"replicate", "--via", "ftp", "--path", "/tmp", "--to", "host:/p"})
	if rc != 1 {
		t.Errorf("got rc=%d", rc)
	}
}

func TestDedup(t *testing.T) {
	a := &record.Record{Level: "info", Service: "x", Message: "y"}
	b := &record.Record{Level: "info", Service: "x", Message: "y"}
	c := &record.Record{Level: "warn", Service: "x", Message: "y"}
	if got := dedup.Dedup([]*record.Record{a, b, c}); len(got) != 2 {
		t.Errorf("got %d", len(got))
	}
}

func TestManifestRender(t *testing.T) {
	m := manifest.New()
	m.Add(&manifest.Entry{Digest: "a", Size: 1})
	if m.Len() != 1 {
		t.Error("manifest")
	}
}

func TestMigratePlan(t *testing.T) {
	plan, err := migrate.Plan(1, 3)
	if err != nil || len(plan) != 2 {
		t.Errorf("got %v %v", plan, err)
	}
}

func TestScanEmpty(t *testing.T) {
	d := t.TempDir()
	hits, _ := scan.Scan(scan.DefaultConfig(d))
	if hits != nil {
		t.Errorf("got %v", hits)
	}
}

func TestPlanBuild(t *testing.T) {
	m := manifest.New()
	m.Add(&manifest.Entry{Digest: "a"})
	steps := plan.Build(m)
	if len(steps) != 1 {
		t.Errorf("got %d", len(steps))
	}
}

func TestPlanParallelism(t *testing.T) {
	steps := make([]plan.Step, 100)
	if got := plan.Parallelism(steps); got != 4 {
		t.Errorf("got %d", got)
	}
}

func TestRetryWithContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_ = ctx
}
