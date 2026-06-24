package replication_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/replication"
)

func TestBuildKnown(t *testing.T) {
	for _, name := range []string{"rsync", "scp", "http"} {
		if _, err := replication.Build(name); err != nil {
			t.Errorf("%s: %v", name, err)
		}
	}
}

func TestBuildUnknown(t *testing.T) {
	if _, err := replication.Build("ftp"); err == nil {
		t.Error("expected error")
	}
}

func TestRsyncRejectsBadRemote(t *testing.T) {
	if err := (replication.Rsync{}).Push("/x", "no-colon"); err == nil {
		t.Error("expected error")
	}
}

func TestRsyncHappyPath(t *testing.T) {
	if err := (replication.Rsync{}).Push("/x", "host:/path"); err != nil {
		t.Errorf("got %v", err)
	}
}

func TestScpRejectsEmptyLocal(t *testing.T) {
	if err := (replication.Scp{}).Push("", "host:/p"); err == nil {
		t.Error("expected error")
	}
}

func TestHTTPRequiresHTTPS(t *testing.T) {
	if err := (replication.HTTP{}).Push("/x", "http://example.com"); err == nil {
		t.Error("expected error")
	}
}

func TestHTTPHappyPath(t *testing.T) {
	if err := (replication.HTTP{}).Push("/x", "https://example.com"); err != nil {
		t.Errorf("got %v", err)
	}
}

func TestPullValidations(t *testing.T) {
	if err := (replication.Scp{}).Pull("not-a-remote", "/x"); err == nil {
		t.Error("expected error")
	}
	if err := (replication.HTTP{}).Pull("https://x", ""); err == nil {
		t.Error("expected error")
	}
	if err := (replication.Rsync{}).Pull("host:/p", ""); err == nil {
		t.Error("expected error")
	}
}
