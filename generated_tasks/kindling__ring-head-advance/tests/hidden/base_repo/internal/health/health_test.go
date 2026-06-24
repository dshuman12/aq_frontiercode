package health_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/health"
)

func tempDir(t *testing.T) string {
	t.Helper()
	d := t.TempDir()
	return d
}

func TestEmptyDataDirFails(t *testing.T) {
	s := health.Check("", "", time.Hour)
	if s.OK {
		t.Error("should fail")
	}
}

func TestMissingDataDirFails(t *testing.T) {
	s := health.Check("/nonexistent/kindling", "", time.Hour)
	if s.OK {
		t.Error("should fail")
	}
}

func TestNotDirectoryFails(t *testing.T) {
	d := tempDir(t)
	f := filepath.Join(d, "file")
	_ = os.WriteFile(f, []byte("x"), 0o644)
	s := health.Check(f, "", time.Hour)
	if s.OK {
		t.Error("file is not a directory")
	}
}

func TestHealthyData(t *testing.T) {
	d := tempDir(t)
	s := health.Check(d, "", time.Hour)
	if !s.OK {
		t.Errorf("got %+v", s)
	}
}

func TestStaleLockfile(t *testing.T) {
	d := tempDir(t)
	lock := filepath.Join(d, ".lock")
	_ = os.WriteFile(lock, []byte("pid"), 0o644)
	old := time.Now().Add(-2 * time.Hour)
	_ = os.Chtimes(lock, old, old)
	s := health.Check(d, "", 30*time.Minute)
	if s.OK {
		t.Error("expected stale lock detection")
	}
}

func TestFreshLockfileOK(t *testing.T) {
	d := tempDir(t)
	lock := filepath.Join(d, ".lock")
	_ = os.WriteFile(lock, []byte("pid"), 0o644)
	s := health.Check(d, "", time.Hour)
	if !s.OK {
		t.Errorf("got %+v", s)
	}
}

func TestRenderOKQuiet(t *testing.T) {
	if got := health.Render(health.Status{OK: true}, false); got != "" {
		t.Errorf("got %q", got)
	}
}

func TestRenderOKVerbose(t *testing.T) {
	if got := health.Render(health.Status{OK: true}, true); !strings.Contains(got, "OK") {
		t.Errorf("got %q", got)
	}
}

func TestRenderFailVerbose(t *testing.T) {
	s := health.Status{OK: false, Reasons: []string{"x", "y"}}
	got := health.Render(s, true)
	if !strings.Contains(got, "FAIL") || !strings.Contains(got, "x") || !strings.Contains(got, "y") {
		t.Errorf("got %q", got)
	}
}

func TestStatusAdd(t *testing.T) {
	s := health.Status{OK: true}
	s.Add("oops")
	if s.OK || len(s.Reasons) != 1 {
		t.Errorf("got %+v", s)
	}
}

func TestCacheDirChecked(t *testing.T) {
	d := tempDir(t)
	s := health.Check(d, "/nonexistent", time.Hour)
	if s.OK {
		t.Error("missing cache should fail")
	}
}
