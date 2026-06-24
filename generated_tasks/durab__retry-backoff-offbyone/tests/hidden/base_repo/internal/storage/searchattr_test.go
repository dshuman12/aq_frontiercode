package storage

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/vishaljakhar/durab/pkg/types"
)

func TestMemoryListBySearchAttr(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	for i, region := range []string{"us", "eu", "us"} {
		w := wf(string(rune('a' + i)))
		w.SearchAttrs = map[string]any{"region": region, "tier": i}
		if err := m.CreateWorkflow(ctx, w); err != nil {
			t.Fatal(err)
		}
	}
	out, err := m.ListWorkflows(ctx, WorkflowFilter{
		Namespace:       types.DefaultNamespace,
		SearchAttrKey:   "region",
		SearchAttrValue: "us",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 2 {
		t.Fatalf("expected 2 us workflows, got %d", len(out))
	}
}

func TestSQLiteListBySearchAttr(t *testing.T) {
	dir := t.TempDir()
	s, err := OpenSQLite(filepath.Join(dir, "attr.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	ctx := context.Background()
	for i, region := range []string{"us", "eu", "us"} {
		w := wf(string(rune('a' + i)))
		w.SearchAttrs = map[string]any{"region": region}
		if err := s.CreateWorkflow(ctx, w); err != nil {
			t.Fatal(err)
		}
	}
	out, err := s.ListWorkflows(ctx, WorkflowFilter{
		Namespace:       types.DefaultNamespace,
		SearchAttrKey:   "region",
		SearchAttrValue: "us",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 2 {
		t.Fatalf("expected 2 us workflows, got %d", len(out))
	}
}
