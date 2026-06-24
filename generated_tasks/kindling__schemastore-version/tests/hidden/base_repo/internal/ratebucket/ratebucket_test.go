package ratebucket

import (
	"testing"
	"time"
)

func TestAddSum(t *testing.T) {
	c := New(time.Minute, 6)
	c.Add(3)
	c.Add(2)
	if c.Sum() != 5 {
		t.Fatalf("got %d", c.Sum())
	}
}

func TestRate(t *testing.T) {
	c := New(time.Minute, 6)
	c.Add(60)
	r := c.Rate()
	if r < 0.9 || r > 1.1 {
		t.Fatalf("rate %v", r)
	}
}

func TestAdvanceClock(t *testing.T) {
	now := time.Now()
	c := New(60*time.Second, 6) // 10s buckets
	c.SetClock(func() time.Time { return now })
	c.Add(10)
	now = now.Add(11 * time.Second)
	c.Add(5)
	total := c.Sum()
	if total != 15 {
		t.Fatalf("total %d", total)
	}
}
