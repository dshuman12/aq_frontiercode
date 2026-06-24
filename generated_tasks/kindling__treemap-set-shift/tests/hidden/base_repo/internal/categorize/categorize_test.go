package categorize_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/categorize"
)

func TestForPathLog(t *testing.T) {
	if got := categorize.ForPath("/srv/x.log"); got != categorize.CatLog {
		t.Errorf("got %v", got)
	}
}

func TestForPathJSON(t *testing.T) {
	if got := categorize.ForPath("/srv/x.jsonl"); got != categorize.CatJSON {
		t.Errorf("got %v", got)
	}
}

func TestForPathBinary(t *testing.T) {
	if got := categorize.ForPath("/srv/x.bin"); got != categorize.CatBinary {
		t.Errorf("got %v", got)
	}
}

func TestForPathUnknown(t *testing.T) {
	if got := categorize.ForPath("/srv/x.xyz"); got != categorize.CatOther {
		t.Errorf("got %v", got)
	}
}

func TestForPathNoExt(t *testing.T) {
	if got := categorize.ForPath("/srv/no-ext"); got != categorize.CatOther {
		t.Errorf("got %v", got)
	}
}

func TestCaseInsensitive(t *testing.T) {
	if got := categorize.ForPath("/srv/X.JSON"); got != categorize.CatJSON {
		t.Errorf("got %v", got)
	}
}

func TestAllNamesUnique(t *testing.T) {
	seen := map[string]bool{}
	for _, c := range categorize.All() {
		seen[c.Name()] = true
	}
	if len(seen) != len(categorize.All()) {
		t.Errorf("non-unique names")
	}
}
