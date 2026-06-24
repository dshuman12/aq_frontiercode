package log_test

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/log"
)

func fixedNow() time.Time {
	return time.Date(2026, 5, 4, 12, 0, 0, 0, time.UTC)
}

func TestParseLevel(t *testing.T) {
	cases := map[string]log.Level{
		"debug":   log.LevelDebug,
		"INFO":    log.LevelInfo,
		"warn":    log.LevelWarn,
		"warning": log.LevelWarn,
		"error":   log.LevelError,
		"unknown": log.LevelInfo,
		"":        log.LevelInfo,
	}
	for s, want := range cases {
		if got := log.ParseLevel(s); got != want {
			t.Errorf("ParseLevel(%q) = %v, want %v", s, got, want)
		}
	}
}

func TestParseFormat(t *testing.T) {
	if log.ParseFormat("json") != log.FormatJSON {
		t.Error("json")
	}
	if log.ParseFormat("text") != log.FormatText {
		t.Error("text")
	}
	if log.ParseFormat("foo") != log.FormatText {
		t.Error("default")
	}
}

func TestLevelFiltering(t *testing.T) {
	var buf bytes.Buffer
	l := log.New(&buf, log.LevelWarn, log.FormatText)
	l.SetNow(fixedNow)
	l.Debug("d")
	l.Info("i")
	l.Warn("w")
	l.Error("e")
	if c := strings.Count(buf.String(), "\n"); c != 2 {
		t.Errorf("got %d lines: %s", c, buf.String())
	}
}

func TestTextFormat(t *testing.T) {
	var buf bytes.Buffer
	l := log.New(&buf, log.LevelDebug, log.FormatText)
	l.SetNow(fixedNow)
	l.Info("hi", log.F("k", "v"), log.F("n", 42))
	out := buf.String()
	if !strings.Contains(out, "INFO") {
		t.Errorf("no level: %q", out)
	}
	if !strings.Contains(out, "k=v") {
		t.Errorf("no field: %q", out)
	}
	if !strings.Contains(out, "n=42") {
		t.Errorf("no number: %q", out)
	}
}

func TestJSONFormat(t *testing.T) {
	var buf bytes.Buffer
	l := log.New(&buf, log.LevelDebug, log.FormatJSON)
	l.SetNow(fixedNow)
	l.Warn("warn-msg", log.F("a", 7))
	out := buf.String()
	if !strings.HasPrefix(out, "{") {
		t.Errorf("not JSON: %q", out)
	}
	if !strings.Contains(out, `"level":"warn"`) {
		t.Errorf("no level: %q", out)
	}
	if !strings.Contains(out, `"msg":"warn-msg"`) {
		t.Errorf("no msg: %q", out)
	}
	if !strings.Contains(out, `"a":7`) {
		t.Errorf("no field: %q", out)
	}
}

func TestSetLevelLive(t *testing.T) {
	var buf bytes.Buffer
	l := log.New(&buf, log.LevelInfo, log.FormatText)
	l.SetNow(fixedNow)
	l.Debug("d1")
	if buf.Len() != 0 {
		t.Errorf("debug emitted at info level")
	}
	l.SetLevel(log.LevelDebug)
	l.Debug("d2")
	if buf.Len() == 0 {
		t.Errorf("debug not emitted after lowering threshold")
	}
}

func TestStringWithSpacesIsQuoted(t *testing.T) {
	var buf bytes.Buffer
	l := log.New(&buf, log.LevelDebug, log.FormatText)
	l.SetNow(fixedNow)
	l.Info("x", log.F("note", "hello world"))
	if !strings.Contains(buf.String(), `note="hello world"`) {
		t.Errorf("unquoted: %q", buf.String())
	}
}
