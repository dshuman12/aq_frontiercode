package agg

import "testing"

func TestCount(t *testing.T) {
	a, _ := New(Spec{GroupBy: []string{"app"}, Op: OpCount})
	for _, app := range []string{"a", "b", "a", "a", "c"} {
		a.Observe(map[string]string{"app": app}, 0)
	}
	rows := a.Rows()
	if len(rows) != 3 {
		t.Fatalf("rows %d", len(rows))
	}
	for _, r := range rows {
		switch r.Key["app"] {
		case "a":
			if r.Value != 3 {
				t.Fatalf("a=%v", r.Value)
			}
		case "b":
			if r.Value != 1 {
				t.Fatalf("b=%v", r.Value)
			}
		case "c":
			if r.Value != 1 {
				t.Fatalf("c=%v", r.Value)
			}
		}
	}
}

func TestMean(t *testing.T) {
	a, _ := New(Spec{GroupBy: []string{"k"}, Field: "v", Op: OpMean})
	a.Observe(map[string]string{"k": "x"}, 10)
	a.Observe(map[string]string{"k": "x"}, 20)
	rows := a.Rows()
	if rows[0].Value != 15 {
		t.Fatalf("got %v", rows[0].Value)
	}
}

func TestMinMax(t *testing.T) {
	for _, op := range []Op{OpMin, OpMax} {
		a, _ := New(Spec{GroupBy: []string{"k"}, Field: "v", Op: op})
		a.Observe(map[string]string{"k": "x"}, 5)
		a.Observe(map[string]string{"k": "x"}, 9)
		rows := a.Rows()
		if op == OpMin && rows[0].Value != 5 {
			t.Fatalf("min %v", rows[0].Value)
		}
		if op == OpMax && rows[0].Value != 9 {
			t.Fatalf("max %v", rows[0].Value)
		}
	}
}

func TestBadSpec(t *testing.T) {
	if _, err := New(Spec{Op: "bogus"}); err == nil {
		t.Fatal("expected err")
	}
	if _, err := New(Spec{Op: OpSum}); err == nil {
		t.Fatal("expected err")
	}
}
