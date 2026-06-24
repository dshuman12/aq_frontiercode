package paginate

import "testing"

func TestOffset(t *testing.T) {
	items := []int{1, 2, 3, 4, 5}
	p := Offset(items, 0, 2)
	if len(p.Items) != 2 || !p.HasMore {
		t.Fatalf("page %+v", p)
	}
	c, err := DecodeCursor(p.NextCursor)
	if err != nil {
		t.Fatal(err)
	}
	if c.Offset != 2 {
		t.Fatalf("offset %d", c.Offset)
	}
}

func TestOffsetEnd(t *testing.T) {
	items := []int{1, 2}
	p := Offset(items, 0, 5)
	if p.HasMore {
		t.Fatal("expected no more")
	}
}

func TestKeyset(t *testing.T) {
	items := []string{"a", "b", "c", "d", "e"}
	p := Keyset(items, "", 2, func(s string) string { return s })
	if len(p.Items) != 2 || p.Items[0] != "a" {
		t.Fatalf("page %+v", p)
	}
	cur, _ := DecodeCursor(p.NextCursor)
	p2 := Keyset(items, cur.Key, 2, func(s string) string { return s })
	if p2.Items[0] != "c" {
		t.Fatalf("page %+v", p2)
	}
}

func TestEmptyCursor(t *testing.T) {
	c, err := DecodeCursor("")
	if err != nil {
		t.Fatal(err)
	}
	if c.Offset != 0 || c.Key != "" {
		t.Fatalf("got %+v", c)
	}
}

func TestBadCursor(t *testing.T) {
	if _, err := DecodeCursor("$$$"); err == nil {
		t.Fatal("expected err")
	}
}
