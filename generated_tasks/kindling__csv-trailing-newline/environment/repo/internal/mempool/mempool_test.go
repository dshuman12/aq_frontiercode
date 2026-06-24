package mempool

import "testing"

type buf struct {
	Data []byte
}

func TestGetPut(t *testing.T) {
	p := New(func() *buf { return &buf{Data: make([]byte, 0, 64)} })
	for i := 0; i < 5; i++ {
		b := p.Get()
		b.Data = b.Data[:0]
		p.Put(b)
	}
	stats := p.Stats()
	if stats.Gets != 5 || stats.Puts != 5 {
		t.Fatalf("stats %+v", stats)
	}
}

func TestHitRate(t *testing.T) {
	p := New(func() *buf { return &buf{} })
	first := p.Get()
	p.Put(first)
	for i := 0; i < 10; i++ {
		b := p.Get()
		p.Put(b)
	}
	if p.HitRate() <= 0 {
		t.Fatalf("expected hits, got %v", p.HitRate())
	}
}
