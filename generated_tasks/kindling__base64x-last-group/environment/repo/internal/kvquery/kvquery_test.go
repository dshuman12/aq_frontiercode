package kvquery

import "testing"

func TestEqualsFilter(t *testing.T) {
	f, err := Compile("level == info")
	if err != nil {
		t.Fatal(err)
	}
	ok, _ := f.Match(Pairs{{"level", "info"}})
	if !ok {
		t.Fatal("expected match")
	}
	ok, _ = f.Match(Pairs{{"level", "warn"}})
	if ok {
		t.Fatal("unexpected match")
	}
}

func TestAndOr(t *testing.T) {
	f, _ := Compile("level == info && service == auth")
	ok, _ := f.Match(Pairs{{"level", "info"}, {"service", "auth"}})
	if !ok {
		t.Fatal("expected and match")
	}
	g, _ := Compile("level == warn || level == error")
	ok, _ = g.Match(Pairs{{"level", "error"}})
	if !ok {
		t.Fatal("expected or match")
	}
}

func TestNot(t *testing.T) {
	f, _ := Compile("!level == info")
	ok, _ := f.Match(Pairs{{"level", "warn"}})
	if !ok {
		t.Fatal("expected match")
	}
}

func TestRegex(t *testing.T) {
	f, _ := Compile(`msg ~ "^login"`)
	ok, _ := f.Match(Pairs{{"msg", "login ok"}})
	if !ok {
		t.Fatal("expected match")
	}
}

func TestExistence(t *testing.T) {
	f, _ := Compile("trace ?")
	ok, _ := f.Match(Pairs{{"trace", "abc"}})
	if !ok {
		t.Fatal("expected match")
	}
	ok, _ = f.Match(Pairs{{"x", "y"}})
	if ok {
		t.Fatal("expected no match")
	}
}

func TestParens(t *testing.T) {
	f, _ := Compile("(level == warn || level == error) && service == auth")
	ok, _ := f.Match(Pairs{{"level", "warn"}, {"service", "auth"}})
	if !ok {
		t.Fatal("expected match")
	}
}

func TestQuotedValue(t *testing.T) {
	f, _ := Compile(`msg == "hello world"`)
	ok, _ := f.Match(Pairs{{"msg", "hello world"}})
	if !ok {
		t.Fatal("expected match")
	}
}

func TestEmptyExpr(t *testing.T) {
	f, _ := Compile("")
	ok, _ := f.Match(Pairs{})
	if !ok {
		t.Fatal("empty filter should match")
	}
}

func TestParseError(t *testing.T) {
	if _, err := Compile("level @ info"); err == nil {
		t.Fatal("expected err")
	}
	if _, err := Compile("level == info junk"); err == nil {
		t.Fatal("expected err")
	}
}

func TestFilterPairs(t *testing.T) {
	f, _ := Compile("level == info")
	in := []Pairs{
		{{"level", "info"}},
		{{"level", "warn"}},
		{{"level", "info"}},
	}
	out, _ := FilterPairs(f, in)
	if len(out) != 2 {
		t.Fatalf("got %v", out)
	}
}

func TestSource(t *testing.T) {
	f, _ := Compile("a == b")
	if f.Source() != "a == b" {
		t.Fatalf("got %s", f.Source())
	}
}
