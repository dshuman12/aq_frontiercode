package md_test

import (
	"strings"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/group"
	"github.com/dleblanc/kindling/internal/record"
	"github.com/dleblanc/kindling/internal/render/md"
)

func TestRecords(t *testing.T) {
	recs := []*record.Record{
		{Timestamp: time.Now(), Level: "info", Service: "auth", Message: "x"},
	}
	out := md.Records(recs)
	if !strings.Contains(out, "| ts |") {
		t.Errorf("missing header: %q", out)
	}
	if !strings.Contains(out, "info") {
		t.Errorf("missing data: %q", out)
	}
}

func TestGroups(t *testing.T) {
	out := md.Groups([]group.Bucket{{Key: "auth", Count: 5}})
	if !strings.Contains(out, "auth") {
		t.Error("missing key")
	}
}

func TestHeading(t *testing.T) {
	if got := md.Heading(2, "hi"); got != "## hi\n" {
		t.Errorf("got %q", got)
	}
}

func TestHeadingClampsLevel(t *testing.T) {
	if got := md.Heading(0, "x"); got != "# x\n" {
		t.Errorf("got %q", got)
	}
	if got := md.Heading(7, "x"); got != "###### x\n" {
		t.Errorf("got %q", got)
	}
}
