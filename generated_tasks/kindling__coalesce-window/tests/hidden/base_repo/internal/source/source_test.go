package source

import (
	"sync"
	"testing"
)

func TestRoundTrip(t *testing.T) {
	loc := Location{Host: "10.0.0.1", Port: 8080, File: "ingest.go", Line: 42}
	got, err := Parse(loc.String())
	if err != nil {
		t.Fatal(err)
	}
	if got != loc {
		t.Fatalf("got %+v want %+v", got, loc)
	}
}

func TestIPv6Host(t *testing.T) {
	loc := Location{Host: "::1", Port: 8080, File: "ingest.go", Line: 1}
	got, err := Parse(loc.String())
	if err != nil {
		t.Fatal(err)
	}
	if got.Host != "::1" {
		t.Fatalf("host %q", got.Host)
	}
}

func TestIntern(t *testing.T) {
	tbl := NewTable()
	a := tbl.Intern(Location{Host: "h", Port: 1, File: "a.go", Line: 1})
	b := tbl.Intern(Location{Host: "h", Port: 1, File: "a.go", Line: 1})
	if a != b {
		t.Fatalf("intern returned new id")
	}
	c := tbl.Intern(Location{Host: "h", Port: 1, File: "b.go", Line: 1})
	if c == a {
		t.Fatalf("expected new id")
	}
	loc, ok := tbl.Lookup(c)
	if !ok || loc.File != "b.go" {
		t.Fatalf("lookup: %+v %v", loc, ok)
	}
	if tbl.Len() != 2 {
		t.Fatalf("len %d", tbl.Len())
	}
	if len(tbl.Snapshot()) != 2 {
		t.Fatalf("snapshot len")
	}
}

func TestInternConcurrent(t *testing.T) {
	tbl := NewTable()
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				tbl.Intern(Location{Host: "h", Port: i, File: "f", Line: j})
			}
		}(i)
	}
	wg.Wait()
	if tbl.Len() != 800 {
		t.Fatalf("len %d", tbl.Len())
	}
}
