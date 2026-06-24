package subcmd_tests_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/cli"
	auditcmd "github.com/dleblanc/kindling/internal/cli/cmd/audit"
	buildinfocmd "github.com/dleblanc/kindling/internal/cli/cmd/buildinfo"
	diffcmd "github.com/dleblanc/kindling/internal/cli/cmd/diff"
	prunecmd "github.com/dleblanc/kindling/internal/cli/cmd/prune"
	replaycmd "github.com/dleblanc/kindling/internal/cli/cmd/replay"
	snapshotcmd "github.com/dleblanc/kindling/internal/cli/cmd/snapshot"
)

func TestBuildInfo(t *testing.T) {
	cli.Reset()
	cli.Register(buildinfocmd.Cmd())
	if rc, err := cli.Run([]string{"build-info"}); rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestDiffRequiresArgs(t *testing.T) {
	cli.Reset()
	cli.Register(diffcmd.Cmd())
	if rc, _ := cli.Run([]string{"diff"}); rc != 1 {
		t.Errorf("got rc=%d", rc)
	}
}

func TestPruneDryRun(t *testing.T) {
	cli.Reset()
	cli.Register(prunecmd.Cmd())
	if rc, err := cli.Run([]string{"prune", "--dry-run"}); rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestSnapshotRequiresOut(t *testing.T) {
	cli.Reset()
	cli.Register(snapshotcmd.Cmd())
	if rc, _ := cli.Run([]string{"snapshot"}); rc != 1 {
		t.Errorf("got rc=%d", rc)
	}
}

func TestReplayMissingJournal(t *testing.T) {
	cli.Reset()
	cli.Register(replaycmd.Cmd())
	rc, err := cli.Run([]string{"replay", "--journal", "/nonexistent"})
	if rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestAuditMissingJournal(t *testing.T) {
	cli.Reset()
	cli.Register(auditcmd.Cmd())
	rc, err := cli.Run([]string{"audit", "--journal", "/nonexistent"})
	if rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}
