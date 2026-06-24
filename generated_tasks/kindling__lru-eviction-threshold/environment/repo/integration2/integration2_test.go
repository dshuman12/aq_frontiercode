package integration2_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/args"
	"github.com/dleblanc/kindling/internal/bloom"
	"github.com/dleblanc/kindling/internal/cli"
	"github.com/dleblanc/kindling/internal/color"
	"github.com/dleblanc/kindling/internal/cron"
	"github.com/dleblanc/kindling/internal/csv"
	"github.com/dleblanc/kindling/internal/glob"
	"github.com/dleblanc/kindling/internal/hash"
	"github.com/dleblanc/kindling/internal/heap"
	"github.com/dleblanc/kindling/internal/hexx"
	"github.com/dleblanc/kindling/internal/httpx"
	"github.com/dleblanc/kindling/internal/ini"
	"github.com/dleblanc/kindling/internal/jsonp"
	"github.com/dleblanc/kindling/internal/lru"
	"github.com/dleblanc/kindling/internal/metrics"
	"github.com/dleblanc/kindling/internal/parsec"
	"github.com/dleblanc/kindling/internal/ratelimit"
	"github.com/dleblanc/kindling/internal/regex"
	"github.com/dleblanc/kindling/internal/retry"
	"github.com/dleblanc/kindling/internal/ring"
	"github.com/dleblanc/kindling/internal/semver"
	"github.com/dleblanc/kindling/internal/stats"
	"github.com/dleblanc/kindling/internal/template"
	"github.com/dleblanc/kindling/internal/trie"
	"github.com/dleblanc/kindling/internal/uf"
	"github.com/dleblanc/kindling/internal/uri"
)

func TestArgsFlagParse(t *testing.T) {
	p, _ := args.Parse([]string{"--root=/data", "positional"})
	if p.Str("root", "") != "/data" || len(p.Positional) != 1 {
		t.Errorf("got %+v", p)
	}
}

func TestBloomNoFalseNegatives(t *testing.T) {
	f := bloom.New(100, 0.01)
	for i := 0; i < 50; i++ {
		f.Insert([]byte{byte(i)})
	}
	for i := 0; i < 50; i++ {
		if !f.Contains([]byte{byte(i)}) {
			t.Errorf("missing %d", i)
		}
	}
}

func TestCliRegistersCommands(t *testing.T) {
	cli.Reset()
	cli.Register(cli.Command{Name: "x", Run: func([]string) (int, error) { return 0, nil }})
	if rc, _ := cli.Run([]string{"x"}); rc != 0 {
		t.Error("not 0")
	}
}

func TestColorWrap(t *testing.T) {
	color.Enable()
	got := color.Wrap(color.Red, "hi")
	if !strings.Contains(got, "\x1b[") {
		t.Errorf("got %q", got)
	}
}

func TestCronStarMatches(t *testing.T) {
	c, _ := cron.Parse("* * * * *")
	if !c.Matches(0, 0, 1, 1, 0) {
		t.Error("should match")
	}
}

func TestCsvRoundTrip(t *testing.T) {
	rows := [][]string{{"a", "b"}, {"1", "2"}}
	out, _ := csv.Read(csv.Write(rows))
	if len(out) != 2 || out[0][0] != "a" {
		t.Errorf("got %v", out)
	}
}

func TestGlobMatches(t *testing.T) {
	if !glob.Matches("*.log", "kindling.log") {
		t.Error("glob")
	}
}

func TestHashSHA256Known(t *testing.T) {
	if got := hash.Hex(hash.AlgSHA256, []byte("abc")); !strings.HasPrefix(got, "ba78") {
		t.Errorf("got %q", got)
	}
}

func TestHeapMinPopsSmallest(t *testing.T) {
	h := heap.New[int](heap.Min, func(a, b int) bool { return a < b })
	for _, v := range []int{5, 1, 3, 2} {
		h.Push(v)
	}
	if v, _ := h.Pop(); v != 1 {
		t.Errorf("got %d", v)
	}
}

func TestHexxRoundTrip(t *testing.T) {
	out, _ := hexx.Decode(hexx.Encode([]byte{0x10, 0xff}))
	if len(out) != 2 {
		t.Errorf("got %v", out)
	}
}

func TestHttpxResponseWrite(t *testing.T) {
	resp := httpx.OKText("hi")
	var sb strings.Builder
	_ = resp.Write(&sb)
	if !strings.HasPrefix(sb.String(), "HTTP/1.1 200 OK") {
		t.Errorf("got %q", sb.String())
	}
}

func TestIniRoundTrip(t *testing.T) {
	doc, _ := ini.Parse("[s]\na = 1\n")
	if doc["s"]["a"] != "1" {
		t.Error("ini")
	}
}

func TestJsonpParse(t *testing.T) {
	v, _ := jsonp.Parse(`{"a": 1}`)
	if v.Object["a"].Num != 1 {
		t.Error("jsonp")
	}
}

func TestLruEvictsOldest(t *testing.T) {
	c := lru.New(2)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Put("c", 3)
	if _, ok := c.Get("a"); ok {
		t.Error("should evict a")
	}
}

func TestMetricsRender(t *testing.T) {
	r := metrics.New()
	r.CounterInc("kindling_test_total", "h", nil, 1)
	if !strings.Contains(r.Render(), "kindling_test_total 1") {
		t.Error("metrics")
	}
}

func TestParsecIdent(t *testing.T) {
	c := parsec.New("foo bar")
	got, _ := c.Ident()
	if got != "foo" {
		t.Errorf("got %q", got)
	}
}

func TestRatelimitDrains(t *testing.T) {
	b := ratelimit.New(2, 1)
	if !b.Allow(1) || !b.Allow(1) {
		t.Error("should allow")
	}
	if b.Allow(1) {
		t.Error("should reject")
	}
}

func TestRegexMatch(t *testing.T) {
	p, _ := regex.Compile("hello")
	if !p.Match("say hello") {
		t.Error("match")
	}
}

func TestRetryLinear(t *testing.T) {
	calls := 0
	err := retry.Linear{Attempts: 3, Delay: 0}.Run(context.Background(), func() error {
		calls++
		if calls < 2 {
			return errFakeErr
		}
		return nil
	})
	if err != nil || calls != 2 {
		t.Errorf("got err=%v calls=%d", err, calls)
	}
}

func TestRingCapsAtCapacity(t *testing.T) {
	r := ring.New(2)
	r.Push(1)
	r.Push(2)
	r.Push(3)
	snap := r.Snapshot()
	if len(snap) != 2 {
		t.Errorf("got %d", len(snap))
	}
}

func TestSemverOrdering(t *testing.T) {
	a, _ := semver.Parse("1.0.0")
	b, _ := semver.Parse("1.0.1")
	if !a.Less(b) {
		t.Error("semver")
	}
}

func TestStatsAggregate(t *testing.T) {
	c := stats.New()
	for _, v := range []float64{1, 2, 3} {
		c.Observe(v)
	}
	if c.Mean() != 2 {
		t.Errorf("got %v", c.Mean())
	}
}

func TestTemplateRender(t *testing.T) {
	got, _ := template.Render("hello {{n}}", template.Vars{"n": {Kind: template.KStr, Str: "world"}})
	if got != "hello world" {
		t.Errorf("got %q", got)
	}
}

func TestTrieContains(t *testing.T) {
	tr := trie.New()
	tr.Insert("foo")
	if !tr.Contains("foo") {
		t.Error("trie")
	}
}

func TestUfUnion(t *testing.T) {
	u := uf.New(3)
	u.Union(0, 1)
	if !u.Connected(0, 1) {
		t.Error("uf")
	}
}

func TestUriRoundTrip(t *testing.T) {
	out, _ := uri.PercentDecode(uri.PercentEncode([]byte("a b/c")))
	if string(out) != "a b/c" {
		t.Errorf("got %q", out)
	}
}

type fakeErr struct{}

func (fakeErr) Error() string { return "fake" }

var errFakeErr = fakeErr{}

func TestTimingNoOp(t *testing.T) {
	ts := time.Now()
	_ = ts
}
