package promfmt

import (
	"bytes"
	"strings"
	"testing"
)

func TestParse(t *testing.T) {
	src := `# HELP http_requests Total HTTP requests
# TYPE http_requests counter
http_requests{method="GET",status="200"} 1027
http_requests{method="POST",status="201"} 7
`
	f, err := Parse(strings.NewReader(src))
	if err != nil {
		t.Fatal(err)
	}
	if len(f) != 1 || f[0].Name != "http_requests" {
		t.Fatalf("families %+v", f)
	}
	if len(f[0].Samples) != 2 {
		t.Fatalf("samples %d", len(f[0].Samples))
	}
}

func TestRoundTrip(t *testing.T) {
	in := []*Family{
		{Name: "x", Type: "gauge", Help: "a value", Samples: []Sample{{Name: "x", Value: 1.5}}},
	}
	var buf bytes.Buffer
	if err := Write(&buf, in); err != nil {
		t.Fatal(err)
	}
	out, err := Parse(&buf)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 1 || out[0].Samples[0].Value != 1.5 {
		t.Fatalf("got %+v", out)
	}
}

func TestHistogramFamilyGrouping(t *testing.T) {
	src := `latency_bucket{le="0.5"} 100
latency_count 100
latency_sum 12.5
`
	f, err := Parse(strings.NewReader(src))
	if err != nil {
		t.Fatal(err)
	}
	if len(f) != 1 || f[0].Name != "latency" {
		t.Fatalf("families %+v", f)
	}
	if len(f[0].Samples) != 3 {
		t.Fatalf("samples %d", len(f[0].Samples))
	}
}
