package clock

import (
	"testing"
	"time"
)

func TestFakeSleepAdvances(t *testing.T) {
	f := NewFake(time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC))
	start := f.Now()
	f.Sleep(3 * time.Second)
	if f.Now().Sub(start) != 3*time.Second {
		t.Fatalf("Sleep should advance clock")
	}
}
