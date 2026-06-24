package cron_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/cron"
)

func TestStarMatchesEverything(t *testing.T) {
	c, err := cron.Parse("* * * * *")
	if err != nil {
		t.Fatal(err)
	}
	if !c.Matches(0, 0, 1, 1, 0) {
		t.Error("should match start of year")
	}
	if !c.Matches(59, 23, 31, 12, 6) {
		t.Error("should match end of year")
	}
}

func TestExplicitTime(t *testing.T) {
	c, _ := cron.Parse("0 12 * * *")
	if !c.Matches(0, 12, 5, 6, 1) {
		t.Error("should match 12:00")
	}
	if c.Matches(1, 12, 5, 6, 1) {
		t.Error("should not match 12:01")
	}
}

func TestRange(t *testing.T) {
	c, _ := cron.Parse("0 9-17 * * *")
	if !c.Matches(0, 9, 1, 1, 1) {
		t.Error("9am ok")
	}
	if !c.Matches(0, 17, 1, 1, 1) {
		t.Error("5pm ok")
	}
	if c.Matches(0, 18, 1, 1, 1) {
		t.Error("6pm should miss")
	}
}

func TestList(t *testing.T) {
	c, _ := cron.Parse("0 0,6,12,18 * * *")
	for _, h := range []int{0, 6, 12, 18} {
		if !c.Matches(0, h, 1, 1, 0) {
			t.Errorf("hour %d", h)
		}
	}
	if c.Matches(0, 9, 1, 1, 0) {
		t.Error("9 should miss")
	}
}

func TestRejectsTooFewFields(t *testing.T) {
	if _, err := cron.Parse("* * *"); err == nil {
		t.Error("expected error")
	}
}

func TestRejectsOutOfRange(t *testing.T) {
	if _, err := cron.Parse("60 * * * *"); err == nil {
		t.Error("expected error")
	}
	if _, err := cron.Parse("* 24 * * *"); err == nil {
		t.Error("expected error")
	}
}

func TestRejectsInvertedRange(t *testing.T) {
	if _, err := cron.Parse("9-3 * * * *"); err == nil {
		t.Error("expected error")
	}
}
