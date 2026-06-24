package journal_test

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/journal"
)

func TestRenderParse(t *testing.T) {
	e := journal.Entry{
		Timestamp: time.Unix(1700000000, 0).UTC(),
		Outcome:   journal.OutcomeApplied,
		Op:        "scan",
		Detail:    "file=/srv/x.log",
	}
	got, err := journal.Parse(e.Render())
	if err != nil {
		t.Fatal(err)
	}
	if got.Op != e.Op || got.Outcome != e.Outcome {
		t.Errorf("round-trip differs: %+v", got)
	}
}

func TestParseShortLine(t *testing.T) {
	if _, err := journal.Parse("a\tb"); err == nil {
		t.Error("expected error")
	}
}

func TestStoreAppendAndRead(t *testing.T) {
	d := t.TempDir()
	s := journal.Open(filepath.Join(d, "j.tsv"))
	for i := 0; i < 3; i++ {
		s.Append(journal.Entry{
			Timestamp: time.Now(),
			Outcome:   journal.OutcomeApplied,
			Op:        "scan",
		})
	}
	entries, skipped, err := s.ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 3 || skipped != 0 {
		t.Errorf("got %d entries, %d skipped", len(entries), skipped)
	}
}

func TestStoreReadMissing(t *testing.T) {
	s := journal.Open("/nonexistent/journal.tsv")
	entries, _, err := s.ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if entries != nil {
		t.Error("expected nil entries")
	}
}

func TestSummarize(t *testing.T) {
	entries := []journal.Entry{
		{Outcome: journal.OutcomeApplied},
		{Outcome: journal.OutcomeApplied},
		{Outcome: journal.OutcomeSkipped},
		{Outcome: journal.OutcomeFailed},
	}
	s := journal.Summarize(entries)
	if s.Total != 4 || s.Applied != 2 || s.Skipped != 1 || s.Failed != 1 {
		t.Errorf("got %+v", s)
	}
}

func TestStoreParseMalformedSkipped(t *testing.T) {
	d := t.TempDir()
	p := filepath.Join(d, "j.tsv")
	_ = os.WriteFile(p, []byte("broken-line\n"), 0o644)
	s := journal.Open(p)
	entries, skipped, _ := s.ReadAll()
	if len(entries) != 0 || skipped != 1 {
		t.Errorf("got %d entries, %d skipped", len(entries), skipped)
	}
}
