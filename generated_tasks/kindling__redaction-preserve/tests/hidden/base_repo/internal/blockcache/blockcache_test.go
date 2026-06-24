package blockcache

import "testing"

func TestPutGet(t *testing.T) {
	c := New(3, 0)
	c.Put(&Block{Key: Key{File: "a", Offset: 0}, Data: []byte("hello")})
	got, ok := c.Get(Key{File: "a", Offset: 0})
	if !ok || string(got.Data) != "hello" {
		t.Fatalf("got %v %v", got, ok)
	}
}

func TestEvictByCount(t *testing.T) {
	c := New(2, 0)
	c.Put(&Block{Key: Key{File: "a"}, Data: []byte("1")})
	c.Put(&Block{Key: Key{File: "b"}, Data: []byte("2")})
	c.Put(&Block{Key: Key{File: "c"}, Data: []byte("3")})
	if c.Len() != 2 {
		t.Fatalf("len %d", c.Len())
	}
	if _, ok := c.Get(Key{File: "a"}); ok {
		t.Fatal("a should be evicted")
	}
}

func TestEvictByBytes(t *testing.T) {
	c := New(100, 6)
	c.Put(&Block{Key: Key{File: "a"}, Data: []byte("aaa")})
	c.Put(&Block{Key: Key{File: "b"}, Data: []byte("bbb")})
	c.Put(&Block{Key: Key{File: "c"}, Data: []byte("ccc")})
	if c.Bytes() > 6 {
		t.Fatalf("bytes %d", c.Bytes())
	}
}

func TestPurge(t *testing.T) {
	c := New(2, 0)
	c.Put(&Block{Key: Key{File: "a"}, Data: []byte("x")})
	c.Purge()
	if c.Len() != 0 {
		t.Fatal("not purged")
	}
}

func TestUpdate(t *testing.T) {
	c := New(2, 0)
	c.Put(&Block{Key: Key{File: "a"}, Data: []byte("1")})
	c.Put(&Block{Key: Key{File: "a"}, Data: []byte("22")})
	if c.Len() != 1 {
		t.Fatalf("len %d", c.Len())
	}
	if c.Bytes() != 2 {
		t.Fatalf("bytes %d", c.Bytes())
	}
}
