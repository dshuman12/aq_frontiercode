package sqlite

import "testing"

func TestOpenCreate(t *testing.T) {
	d, err := Open("test")
	if err != nil {
		t.Fatal(err)
	}
	tbl, err := d.CreateTable("rows")
	if err != nil {
		t.Fatal(err)
	}
	if err := tbl.Put("k", []byte("v")); err != nil {
		t.Fatal(err)
	}
	v, err := tbl.Get("k")
	if err != nil || string(v) != "v" {
		t.Fatalf("got %q %v", v, err)
	}
}

func TestDuplicateTable(t *testing.T) {
	d, _ := Open("d")
	_, _ = d.CreateTable("t")
	if _, err := d.CreateTable("t"); err == nil {
		t.Fatal("expected err")
	}
}

func TestDelete(t *testing.T) {
	d, _ := Open("d")
	tbl, _ := d.CreateTable("t")
	_ = tbl.Put("k", []byte("v"))
	if err := tbl.Delete("k"); err != nil {
		t.Fatal(err)
	}
	if tbl.Has("k") {
		t.Fatal("not deleted")
	}
}

func TestKeysSorted(t *testing.T) {
	d, _ := Open("d")
	tbl, _ := d.CreateTable("t")
	for _, k := range []string{"z", "a", "m"} {
		_ = tbl.Put(k, []byte{1})
	}
	keys := tbl.Keys()
	if keys[0] != "a" || keys[2] != "z" {
		t.Fatalf("got %v", keys)
	}
}

func TestRange(t *testing.T) {
	d, _ := Open("d")
	tbl, _ := d.CreateTable("t")
	for _, k := range []string{"a", "b", "c", "d"} {
		_ = tbl.Put(k, []byte{1})
	}
	got := []string{}
	tbl.Range("b", "d", func(k string, _ []byte) bool {
		got = append(got, k)
		return true
	})
	if len(got) != 2 || got[0] != "b" {
		t.Fatalf("range %v", got)
	}
}

func TestClose(t *testing.T) {
	d, _ := Open("d")
	_ = d.Close()
	if _, err := d.CreateTable("t"); err != ErrClosed {
		t.Fatalf("got %v", err)
	}
}

func TestDropTable(t *testing.T) {
	d, _ := Open("d")
	_, _ = d.CreateTable("t")
	if err := d.DropTable("t"); err != nil {
		t.Fatal(err)
	}
	if err := d.DropTable("missing"); err != ErrNotFound {
		t.Fatalf("got %v", err)
	}
}

func TestTruncate(t *testing.T) {
	d, _ := Open("d")
	tbl, _ := d.CreateTable("t")
	_ = tbl.Put("k", []byte{1})
	tbl.Truncate()
	if tbl.Len() != 0 {
		t.Fatalf("len %d", tbl.Len())
	}
}

func TestEach(t *testing.T) {
	d, _ := Open("d")
	tbl, _ := d.CreateTable("t")
	for _, k := range []string{"a", "b", "c"} {
		_ = tbl.Put(k, []byte{1})
	}
	count := 0
	tbl.Each(func(k string, v []byte) bool { count++; return true })
	if count != 3 {
		t.Fatalf("count %d", count)
	}
}
