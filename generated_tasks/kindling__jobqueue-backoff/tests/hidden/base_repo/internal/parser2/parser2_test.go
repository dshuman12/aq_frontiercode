package parser2

import "testing"

func TestLit(t *testing.T) {
	r, err := Lit("foo")("foobar")
	if err != nil || r.Value != "foo" || r.Rest != "bar" {
		t.Fatalf("got %+v %v", r, err)
	}
}

func TestIdent(t *testing.T) {
	r, err := Ident("hello123 rest")
	if err != nil || r.Value != "hello123" {
		t.Fatalf("got %+v %v", r, err)
	}
}

func TestMany(t *testing.T) {
	p := Many(Lit("a"))
	r, err := p("aaab")
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Value) != 3 {
		t.Fatalf("got %v", r.Value)
	}
}

func TestSepBy(t *testing.T) {
	p := SepBy(Ident, Lit(","))
	r, err := p("a,b,c rest")
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Value) != 3 {
		t.Fatalf("got %v", r.Value)
	}
}

func TestOptional(t *testing.T) {
	p := Optional(Lit("?"))
	r, _ := p("rest")
	if r.Value.Has {
		t.Fatal("expected absent")
	}
	r2, _ := p("?rest")
	if !r2.Value.Has {
		t.Fatal("expected present")
	}
}

func TestAlt2(t *testing.T) {
	p := Alt2(Lit("yes"), Lit("no"))
	r, err := p("no go")
	if err != nil || r.Value != "no" {
		t.Fatalf("got %v %v", r.Value, err)
	}
}

func TestEndOfInput(t *testing.T) {
	if _, err := EndOfInput(""); err != nil {
		t.Fatal("empty should pass")
	}
	if _, err := EndOfInput("x"); err == nil {
		t.Fatal("expected err")
	}
}

func TestSeq2Map(t *testing.T) {
	p := Map(Seq2(Lit("a"), Lit("b")), func(p Pair[string, string]) string {
		return p.First + ":" + p.Second
	})
	r, err := p("abrest")
	if err != nil || r.Value != "a:b" {
		t.Fatalf("got %+v %v", r, err)
	}
}

func TestWhitespace(t *testing.T) {
	r, _ := Whitespace("   x")
	if r.Value != 3 || r.Rest != "x" {
		t.Fatalf("got %+v", r)
	}
}
