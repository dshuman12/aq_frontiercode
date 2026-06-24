package cmd_integration_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/cli/register"
)

func TestVersionCommand(t *testing.T) {
	register.All()
	if rc, err := cli.Run([]string{"version"}); rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestHelpCommand(t *testing.T) {
	register.All()
	if rc, err := cli.Run([]string{"help"}); rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestUnknownCommand(t *testing.T) {
	register.All()
	if rc, _ := cli.Run([]string{"nope"}); rc != 1 {
		t.Errorf("got rc=%d", rc)
	}
}

func TestConfigShow(t *testing.T) {
	register.All()
	if rc, err := cli.Run([]string{"config", "show"}); rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestConfigCheck(t *testing.T) {
	register.All()
	if rc, err := cli.Run([]string{"config", "check"}); rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestMetrics(t *testing.T) {
	register.All()
	if rc, err := cli.Run([]string{"metrics"}); rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestServeDryRun(t *testing.T) {
	register.All()
	if rc, err := cli.Run([]string{"serve", "--dry-run"}); rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestValidateQueryGood(t *testing.T) {
	register.All()
	if rc, err := cli.Run([]string{"validate-query", "level=info"}); rc != 0 || err != nil {
		t.Errorf("got rc=%d err=%v", rc, err)
	}
}

func TestValidateQueryBad(t *testing.T) {
	register.All()
	if rc, _ := cli.Run([]string{"validate-query", "= bad"}); rc != 1 {
		t.Errorf("got rc=%d", rc)
	}
}

func TestSearchRequiresArgs(t *testing.T) {
	register.All()
	if rc, _ := cli.Run([]string{"search"}); rc != 1 {
		t.Errorf("got rc=%d", rc)
	}
}

func TestGroupRequiresArgs(t *testing.T) {
	register.All()
	if rc, _ := cli.Run([]string{"group"}); rc != 1 {
		t.Errorf("got rc=%d", rc)
	}
}

func TestScanRequiresFile(t *testing.T) {
	register.All()
	if rc, _ := cli.Run([]string{"scan"}); rc != 1 {
		t.Errorf("got rc=%d", rc)
	}
}

func TestExportRequiresArgs(t *testing.T) {
	register.All()
	if rc, _ := cli.Run([]string{"export"}); rc != 1 {
		t.Errorf("got rc=%d", rc)
	}
}

func TestExportUnknownFormat(t *testing.T) {
	register.All()
	if rc, _ := cli.Run([]string{"export", "--format", "xml", "/dev/null"}); rc != 1 {
		t.Errorf("got rc=%d", rc)
	}
}
