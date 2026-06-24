package diff_test

import (
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/diff"
)

func TestLCSBasic(t *testing.T) {
	pairs := diff.LCS([]string{"a", "b", "c", "d"}, []string{"a", "c", "d"})
	if len(pairs) != 3 {
		t.Errorf("got %d", len(pairs))
	}
}

func TestLCSDisjoint(t *testing.T) {
	if got := diff.LCS([]string{"a"}, []string{"b"}); len(got) != 0 {
		t.Errorf("got %d", len(got))
	}
}

func TestScriptInserts(t *testing.T) {
	edits := diff.Script([]string{"a"}, []string{"a", "b"})
	if len(edits) != 2 || edits[1].Op != diff.OpAdd {
		t.Errorf("got %v", edits)
	}
}

func TestScriptRemoves(t *testing.T) {
	edits := diff.Script([]string{"a", "b"}, []string{"a"})
	if len(edits) != 2 || edits[1].Op != diff.OpRemove {
		t.Errorf("got %v", edits)
	}
}

func TestScriptIdentical(t *testing.T) {
	edits := diff.Script([]string{"a", "b"}, []string{"a", "b"})
	for _, e := range edits {
		if e.Op != diff.OpKeep {
			t.Errorf("got %v", e)
		}
	}
}

func TestScriptEmptyToFull(t *testing.T) {
	edits := diff.Script(nil, []string{"a", "b"})
	for _, e := range edits {
		if e.Op != diff.OpAdd {
			t.Errorf("got %v", e)
		}
	}
}

func TestRender(t *testing.T) {
	edits := []diff.Edit{
		{Op: diff.OpKeep, Text: "a"},
		{Op: diff.OpAdd, Text: "b"},
	}
	got := diff.Render(edits)
	if !strings.Contains(got, " a\n") || !strings.Contains(got, "+b\n") {
		t.Errorf("got %q", got)
	}
}

func TestEditOpTags(t *testing.T) {
	if diff.OpKeep.Tag() != " " || diff.OpAdd.Tag() != "+" || diff.OpRemove.Tag() != "-" {
		t.Error("tag")
	}
}
