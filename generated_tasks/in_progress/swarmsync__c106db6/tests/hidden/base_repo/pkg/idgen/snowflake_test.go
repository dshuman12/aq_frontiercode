package idgen

import (
	"sync"
	"testing"
)

func TestSnowflake_Unique(t *testing.T) {
	s := NewSnowflake(1)
	seen := make(map[int64]bool)
	for i := 0; i < 10000; i++ {
		id := s.Generate()
		if seen[id] { t.Fatalf("duplicate ID: %d", id) }
		seen[id] = true
	}
}

func TestSnowflake_Monotonic(t *testing.T) {
	s := NewSnowflake(1)
	prev := s.Generate()
	for i := 0; i < 1000; i++ {
		curr := s.Generate()
		if curr <= prev { t.Fatal("IDs should be monotonically increasing") }
		prev = curr
	}
}

func TestSnowflake_Decompose(t *testing.T) {
	s := NewSnowflake(42)
	id := s.Generate()
	_, nodeID, _ := Decompose(id)
	if nodeID != 42 { t.Fatalf("expected node 42, got %d", nodeID) }
}

func TestSnowflake_Concurrent(t *testing.T) {
	s := NewSnowflake(1)
	ids := make(chan int64, 10000)
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 1000; j++ { ids <- s.Generate() }
		}()
	}
	wg.Wait()
	close(ids)
	seen := make(map[int64]bool)
	for id := range ids {
		if seen[id] { t.Fatal("concurrent duplicate") }
		seen[id] = true
	}
}

func TestSnowflake_Bytes(t *testing.T) {
	id := int64(123456789)
	b := IDToBytes(id)
	if BytesToID(b) != id { t.Fatal("roundtrip failed") }
}

func TestSnowflake_NodeID(t *testing.T) {
	s := NewSnowflake(7)
	if s.NodeID() != 7 { t.Fatal("wrong node") }
}

func TestSnowflake_ClampNode(t *testing.T) {
	s := NewSnowflake(9999)
	if s.NodeID() != maxNode { t.Fatal("should clamp to max") }
}

func TestULID_Generate(t *testing.T) {
	u := NewULID()
	ts, rnd := u.Generate()
	if ts <= 0 { t.Fatal("ts should be positive") }
	_ = rnd
}

func TestULID_String(t *testing.T) {
	u := NewULID()
	s := u.ULIDString()
	if len(s) != 26 { t.Fatalf("expected 26 chars, got %d", len(s)) }
}

func TestULID_Unique(t *testing.T) {
	u := NewULID()
	seen := make(map[string]bool)
	for i := 0; i < 1000; i++ {
		s := u.ULIDString()
		if seen[s] { t.Fatal("duplicate ULID") }
		seen[s] = true
	}
}

func TestBytesToID_Short(t *testing.T) {
	if BytesToID([]byte{1, 2}) != 0 { t.Fatal("should return 0 for short") }
}
