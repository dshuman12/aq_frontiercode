package plan_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/manifest"
	"github.com/dleblanc/kindling/internal/plan"
)

func sample() *manifest.Manifest {
	m := manifest.New()
	m.Add(&manifest.Entry{Digest: "abc", Service: "auth"})
	m.Add(&manifest.Entry{Digest: "def", Service: "users"})
	return m
}

func TestBuildSorted(t *testing.T) {
	steps := plan.Build(sample())
	if len(steps) != 2 {
		t.Fatalf("got %d", len(steps))
	}
	if steps[0].Digest != "abc" {
		t.Errorf("got %v", steps[0])
	}
}

func TestFilter(t *testing.T) {
	steps := plan.Build(sample())
	out := plan.Filter(steps, func(s plan.Step) bool { return s.Detail == "auth" })
	if len(out) != 1 {
		t.Errorf("got %d", len(out))
	}
}

func TestChunk(t *testing.T) {
	steps := []plan.Step{{Digest: "a"}, {Digest: "b"}, {Digest: "c"}, {Digest: "d"}, {Digest: "e"}}
	chunks := plan.Chunk(steps, 2)
	if len(chunks) != 3 {
		t.Errorf("got %d", len(chunks))
	}
	if len(chunks[2]) != 1 {
		t.Errorf("got %d", len(chunks[2]))
	}
}

func TestChunkZero(t *testing.T) {
	steps := []plan.Step{{Digest: "a"}}
	if chunks := plan.Chunk(steps, 0); len(chunks) != 1 {
		t.Errorf("got %d", len(chunks))
	}
}

func TestParallelism(t *testing.T) {
	cases := map[int]int{0: 1, 5: 1, 50: 2, 500: 4, 5000: 8}
	for n, want := range cases {
		steps := make([]plan.Step, n)
		if got := plan.Parallelism(steps); got != want {
			t.Errorf("Parallelism(%d) = %d want %d", n, got, want)
		}
	}
}
