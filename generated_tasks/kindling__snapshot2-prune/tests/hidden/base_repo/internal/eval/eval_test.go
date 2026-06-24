package eval

import (
	"math"
	"testing"
)

func TestArithmetic(t *testing.T) {
	cases := []struct {
		src string
		got float64
	}{
		{"1+2", 3},
		{"2*3+4", 10},
		{"2+3*4", 14},
		{"(2+3)*4", 20},
		{"10/4", 2.5},
		{"-5+3", -2},
		{"2^10", 1024},
		{"clamp(15, 0, 10)", 10},
		{"clamp(-5, 0, 10)", 0},
		{"min(3, 4) + max(1, 7)", 10},
	}
	for _, c := range cases {
		v, err := Eval(c.src, nil)
		if err != nil {
			t.Fatalf("%s: %v", c.src, err)
		}
		if math.Abs(v-c.got) > 1e-9 {
			t.Fatalf("%s: got %v want %v", c.src, v, c.got)
		}
	}
}

func TestVarsAndFuncs(t *testing.T) {
	s := NewScope()
	s.Vars["x"] = 4
	v, err := Eval("sqrt(x) + log(e)", s)
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs(v-3) > 1e-9 {
		t.Fatalf("got %v", v)
	}
}

func TestErrors(t *testing.T) {
	if _, err := Eval("1/0", nil); err == nil {
		t.Fatal("expected div0")
	}
	if _, err := Eval("foo()", nil); err == nil {
		t.Fatal("expected unknown func")
	}
	if _, err := Eval("1 + ", nil); err == nil {
		t.Fatal("expected parse err")
	}
	if _, err := Eval("x", nil); err == nil {
		t.Fatal("expected unknown ident")
	}
}
