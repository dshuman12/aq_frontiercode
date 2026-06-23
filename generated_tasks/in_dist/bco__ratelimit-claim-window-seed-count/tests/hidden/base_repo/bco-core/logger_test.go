package main

import (
	"bytes"
	"regexp"
	"strings"
	"testing"
)

// isoTimestampPrefix matches UTC subsecond layout from logger.line (not asserted as fixed wall time).
var isoTimestampPrefix = regexp.MustCompile(`\[[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z\]`)

func assertHasISOPrefix(t *testing.T, s string) {
	t.Helper()
	if !isoTimestampPrefix.MatchString(s) {
		t.Fatalf("expected ISO UTC timestamp prefix, got %q", s)
	}
}

func TestNewBCOLogger_defaultLevelSuppressesDebug(t *testing.T) {
	var buf bytes.Buffer
	l := NewBCOLogger()
	l.out = &buf

	l.Debug(LogEngine, "dbg")
	if buf.Len() != 0 {
		t.Fatalf("DEBUG should be suppressed at default INFO: got %q", buf.String())
	}

	l.Info(LogEngine, "hello")
	out := buf.String()
	assertHasISOPrefix(t, out)
	if !strings.Contains(out, "[INFO]") || !strings.Contains(out, "[Engine]") || !strings.Contains(out, "hello") {
		t.Fatalf("unexpected INFO line: %q", out)
	}
}

func TestBCOLogger_SetMinLevel_clampBelowDebug(t *testing.T) {
	var buf bytes.Buffer
	l := NewBCOLogger()
	l.out = &buf
	l.SetMinLevel(-99)

	l.Debug(LogNetwork, "d")
	out := buf.String()
	assertHasISOPrefix(t, out)
	if !strings.Contains(out, "[DEBUG]") || !strings.Contains(out, "[Network]") || !strings.Contains(out, "d") {
		t.Fatalf("clamped to DEBUG: want DEBUG line, got %q", out)
	}
}

func TestBCOLogger_SetMinLevel_clampAboveError(t *testing.T) {
	var buf bytes.Buffer
	l := NewBCOLogger()
	l.out = &buf
	l.SetMinLevel(999)

	l.Debug(LogPairing, "d")
	l.Info(LogPairing, "i")
	l.Warn(LogPairing, "w")
	if buf.Len() != 0 {
		t.Fatalf("expected no output below ERROR, got %q", buf.String())
	}

	l.Error(LogPairing, "e")
	out := buf.String()
	assertHasISOPrefix(t, out)
	if !strings.Contains(out, "[ERROR]") || !strings.Contains(out, "[Pairing]") || !strings.Contains(out, "e") {
		t.Fatalf("expected ERROR only, got %q", out)
	}
}

func TestBCOLogger_levelFiltering(t *testing.T) {
	cases := []struct {
		name      string
		min       int
		wantDebug bool
		wantInfo  bool
		wantWarn  bool
		wantErr   bool
	}{
		{"debug", LogLevelDebug, true, true, true, true},
		{"info", LogLevelInfo, false, true, true, true},
		{"warn", LogLevelWarn, false, false, true, true},
		{"error", LogLevelError, false, false, false, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var buf bytes.Buffer
			l := NewBCOLogger()
			l.out = &buf
			l.SetMinLevel(tc.min)

			l.Debug(LogCAPI, "d")
			l.Info(LogCAPI, "i")
			l.Warn(LogCAPI, "w")
			l.Error(LogCAPI, "e")

			out := buf.String()
			check := func(want bool, label string) {
				t.Helper()
				has := strings.Contains(out, "["+label+"]")
				if want && !has {
					t.Fatalf("want %s in output, got %q", label, out)
				}
				if !want && has {
					t.Fatalf("do not want %s in output, got %q", label, out)
				}
			}
			check(tc.wantDebug, "DEBUG")
			check(tc.wantInfo, "INFO")
			check(tc.wantWarn, "WARN")
			check(tc.wantErr, "ERROR")
		})
	}
}

func TestBCOLogger_InfoPeer_formattingBranches(t *testing.T) {
	cases := []struct {
		name     string
		pn, pid  string
		contains []string
	}{
		{"name_and_id", "alice", "Qm123", []string{`peer "alice"`, "Qm123", "payload"}},
		{"name_only", "bob", "", []string{`peer "bob"`, "payload"}},
		{"id_only", "", "Qm456", []string{"peer Qm456", "payload"}},
		{"neither", "", "", []string{"payload"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var buf bytes.Buffer
			l := NewBCOLogger()
			l.out = &buf
			l.InfoPeer(LogEngine, tc.pn, tc.pid, "payload")
			out := buf.String()
			assertHasISOPrefix(t, out)
			for _, frag := range tc.contains {
				if !strings.Contains(out, frag) {
					t.Fatalf("want substring %q in %q", frag, out)
				}
			}
		})
	}
}

func TestBCOLogger_Error_suppressedWhenMinAboveError(t *testing.T) {
	var buf bytes.Buffer
	l := NewBCOLogger()
	l.out = &buf
	// Bypass SetMinLevel clamp so enabled(LogLevelError) is false (production code only clamps via SetMinLevel).
	l.minLevel.Store(4)

	l.Error(LogEngine, "should-not-appear")
	if buf.Len() != 0 {
		t.Fatalf("expected Error suppressed when min > LogLevelError, got %q", buf.String())
	}
}

func TestSetGlobalMinLogLevel_affectsDefaultLogger(t *testing.T) {
	oldOut := defaultLogger.out
	t.Cleanup(func() {
		defaultLogger.out = oldOut
		SetGlobalMinLogLevel(LogLevelInfo)
	})

	var buf bytes.Buffer
	defaultLogger.out = &buf
	SetGlobalMinLogLevel(LogLevelError)

	defaultLogger.Debug(LogPersistence, "d")
	defaultLogger.Info(LogPersistence, "i")
	if buf.Len() != 0 {
		t.Fatalf("expected global logger to drop sub-ERROR, got %q", buf.String())
	}

	defaultLogger.Error(LogPersistence, "e")
	out := buf.String()
	assertHasISOPrefix(t, out)
	if !strings.Contains(out, "[ERROR]") || !strings.Contains(out, "[Persistence]") {
		t.Fatalf("expected ERROR line, got %q", out)
	}
}
