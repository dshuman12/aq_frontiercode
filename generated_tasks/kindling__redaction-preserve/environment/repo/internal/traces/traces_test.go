package traces

import "testing"

func TestParseFormat(t *testing.T) {
	h := "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01"
	ctx, err := ParseTraceParent(h)
	if err != nil {
		t.Fatal(err)
	}
	if ctx.Version != "00" {
		t.Fatal("version")
	}
	if FormatTraceParent(ctx) != h {
		t.Fatalf("rt %q", FormatTraceParent(ctx))
	}
}

func TestParseRejectsBad(t *testing.T) {
	for _, bad := range []string{"", "00-x-x-01", "00-1-2-3-4"} {
		if _, err := ParseTraceParent(bad); err == nil {
			t.Fatalf("expected err on %q", bad)
		}
	}
}

func TestTraceStateRoundTrip(t *testing.T) {
	in := map[string]string{"vendor1": "abc", "vendor2": "def"}
	got := ParseTraceState(FormatTraceState(in))
	if got["vendor1"] != "abc" || got["vendor2"] != "def" {
		t.Fatalf("got %v", got)
	}
}

func TestNewIDs(t *testing.T) {
	if len(NewTraceID()) != 32 {
		t.Fatal("trace id len")
	}
	if len(NewSpanID()) != 16 {
		t.Fatal("span id len")
	}
}

func TestSampled(t *testing.T) {
	if !IsSampled(Context{Flags: "01"}) {
		t.Fatal("expected sampled")
	}
	if IsSampled(Context{Flags: "00"}) {
		t.Fatal("expected unsampled")
	}
}
