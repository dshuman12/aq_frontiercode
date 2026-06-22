package bitmap

import "testing"

func TestBitmap_SetTest(t *testing.T) {
	b := New()
	b.Set(10); b.Set(100); b.Set(1000)
	if !b.Test(10) || !b.Test(100) || !b.Test(1000) { t.Fatal("should be set") }
	if b.Test(11) { t.Fatal("should not be set") }
}

func TestBitmap_Clear(t *testing.T) {
	b := New()
	b.Set(5); b.Clear(5)
	if b.Test(5) { t.Fatal("should be cleared") }
	if b.Count() != 0 { t.Fatal("should be empty") }
}

func TestBitmap_Count(t *testing.T) {
	b := New()
	for i := uint(0); i < 100; i++ { b.Set(i) }
	if b.Count() != 100 { t.Fatalf("expected 100, got %d", b.Count()) }
}

func TestBitmap_And(t *testing.T) {
	a := New(); b := New()
	a.Set(1); a.Set(2); a.Set(3)
	b.Set(2); b.Set(3); b.Set(4)
	a.And(b)
	if a.Count() != 2 { t.Fatalf("expected 2, got %d", a.Count()) }
	if !a.Test(2) || !a.Test(3) { t.Fatal("wrong bits") }
}

func TestBitmap_Or(t *testing.T) {
	a := New(); b := New()
	a.Set(1); a.Set(2)
	b.Set(3); b.Set(4)
	a.Or(b)
	if a.Count() != 4 { t.Fatalf("expected 4, got %d", a.Count()) }
}

func TestBitmap_Xor(t *testing.T) {
	a := New(); b := New()
	a.Set(1); a.Set(2)
	b.Set(2); b.Set(3)
	a.Xor(b)
	if !a.Test(1) || !a.Test(3) { t.Fatal("XOR wrong") }
	if a.Test(2) { t.Fatal("2 should be cleared by XOR") }
}

func TestBitmap_AndNot(t *testing.T) {
	a := New(); b := New()
	a.Set(1); a.Set(2); a.Set(3)
	b.Set(2); b.Set(3)
	a.AndNot(b)
	if a.Count() != 1 || !a.Test(1) { t.Fatal("wrong") }
}

func TestBitmap_Bits(t *testing.T) {
	b := New()
	b.Set(0); b.Set(5); b.Set(63); b.Set(64)
	bits := b.Bits()
	if len(bits) != 4 { t.Fatalf("expected 4, got %d", len(bits)) }
}

func TestBitmap_Clone(t *testing.T) {
	a := New()
	a.Set(42)
	b := a.Clone()
	if !b.Test(42) { t.Fatal("clone should have bit") }
	a.Clear(42)
	if !b.Test(42) { t.Fatal("clone should be independent") }
}

func TestBitmap_Reset(t *testing.T) {
	b := New()
	b.Set(1); b.Set(2); b.Reset()
	if b.Count() != 0 { t.Fatal("should be empty") }
}

func TestBitmap_IsEmpty(t *testing.T) {
	b := New()
	if !b.IsEmpty() { t.Fatal("new bitmap should be empty") }
	b.Set(1)
	if b.IsEmpty() { t.Fatal("should not be empty") }
}

func TestBitmap_Large(t *testing.T) {
	b := New()
	b.Set(10000)
	if !b.Test(10000) { t.Fatal("should handle large positions") }
	if b.Count() != 1 { t.Fatal("count should be 1") }
}
