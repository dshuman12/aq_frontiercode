package integration_full

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/agg"
	"github.com/dleblanc/kindling/internal/exporters"
	"github.com/dleblanc/kindling/internal/pipeline"
	"github.com/dleblanc/kindling/internal/redaction"
	"github.com/dleblanc/kindling/internal/shipper"
)

func TestRedactedAggregateExport(t *testing.T) {
	red := redaction.New()
	a, _ := agg.New(agg.Spec{GroupBy: []string{"app"}, Op: agg.OpCount})

	p := pipeline.New(func(r pipeline.Record) error {
		a.Observe(r.Labels, 0)
		return nil
	})
	p.AddStage(pipeline.Map(func(r pipeline.Record) pipeline.Record {
		r.Body = red.Redact(r.Body)
		return r
	}))

	for _, msg := range []struct {
		body string
		app  string
	}{
		{"contact alice@example.com", "frontend"},
		{"contact bob@example.com", "frontend"},
		{"backend up", "backend"},
		{"contact carol@example.com", "frontend"},
	} {
		if err := p.Push(pipeline.Record{
			Body:   msg.body,
			Labels: map[string]string{"app": msg.app},
		}); err != nil {
			t.Fatal(err)
		}
	}

	rows := a.Rows()
	if len(rows) != 2 {
		t.Fatalf("rows %d", len(rows))
	}

	exp, _ := exporters.New("jsonl")
	var buf bytes.Buffer
	_ = exp.Header(&buf)
	for _, row := range rows {
		_ = exp.Write(&buf, exporters.Record{
			Body:   "agg",
			Labels: map[string]string{"app": row.Key["app"]},
		})
	}
	_ = exp.Footer(&buf)

	if !strings.Contains(buf.String(), "frontend") {
		t.Fatalf("export missing app: %s", buf.String())
	}
}

func TestShipperWiring(t *testing.T) {
	delivered := [][]byte{}
	sink := func(ctx context.Context, batch [][]byte) error {
		delivered = append(delivered, batch...)
		return nil
	}
	s := shipper.New(shipper.Config{BatchSize: 2}, sink)
	for i := 0; i < 5; i++ {
		_ = s.Submit(context.Background(), []byte{byte(i)})
	}
	_ = s.Flush(context.Background())
	if len(delivered) != 5 {
		t.Fatalf("delivered %d", len(delivered))
	}
}
