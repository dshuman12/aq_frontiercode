package big3_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/adler32x"
	"github.com/dleblanc/kindling/internal/atomic"
	"github.com/dleblanc/kindling/internal/base32"
	"github.com/dleblanc/kindling/internal/base64x"
	"github.com/dleblanc/kindling/internal/bencode"
	"github.com/dleblanc/kindling/internal/categorize"
	"github.com/dleblanc/kindling/internal/crc32x"
	"github.com/dleblanc/kindling/internal/fingerprint"
	"github.com/dleblanc/kindling/internal/hkdf"
	"github.com/dleblanc/kindling/internal/hmac"
	"github.com/dleblanc/kindling/internal/journal"
	"github.com/dleblanc/kindling/internal/manifest"
	"github.com/dleblanc/kindling/internal/matcher"
	"github.com/dleblanc/kindling/internal/mtime"
	"github.com/dleblanc/kindling/internal/once"
	"github.com/dleblanc/kindling/internal/paths"
	"github.com/dleblanc/kindling/internal/profiling"
	"github.com/dleblanc/kindling/internal/radix"
	"github.com/dleblanc/kindling/internal/record"
	"github.com/dleblanc/kindling/internal/render/html"
	"github.com/dleblanc/kindling/internal/render/md"
	"github.com/dleblanc/kindling/internal/render/yaml"
	"github.com/dleblanc/kindling/internal/replication"
	"github.com/dleblanc/kindling/internal/retry"
	"github.com/dleblanc/kindling/internal/sema"
	"github.com/dleblanc/kindling/internal/shellquote"
	"github.com/dleblanc/kindling/internal/sortedmap"
	"github.com/dleblanc/kindling/internal/tar"
	"github.com/dleblanc/kindling/internal/template"
	"github.com/dleblanc/kindling/internal/token"
	"github.com/dleblanc/kindling/internal/urlparse"
	"github.com/dleblanc/kindling/internal/utf8x"
	"github.com/dleblanc/kindling/internal/window"
)

func TestAdler32(t *testing.T) {
	if adler32x.Sum([]byte("abc")) != 0x024d0127 {
		t.Error("adler")
	}
}

func TestAtomicWriteRead(t *testing.T) {
	d := t.TempDir()
	if err := atomic.WriteFile(d+"/x", []byte("hi"), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestBase32RoundTrip(t *testing.T) {
	if got, _ := base32.Decode(base32.Encode([]byte("hi"))); string(got) != "hi" {
		t.Errorf("got %q", got)
	}
}

func TestBase64RoundTrip(t *testing.T) {
	if got, _ := base64x.Decode(base64x.Encode([]byte("hi"))); string(got) != "hi" {
		t.Errorf("got %q", got)
	}
}

func TestBencodeInt(t *testing.T) {
	if string(bencode.Encode(bencode.Int(42))) != "i42e" {
		t.Error("bencode")
	}
}

func TestCategorizeLog(t *testing.T) {
	if categorize.ForPath("/srv/x.log") != categorize.CatLog {
		t.Error("categorize")
	}
}

func TestCRC32Known(t *testing.T) {
	if crc32x.Sum([]byte("123456789")) != 0xcbf43926 {
		t.Error("crc")
	}
}

func TestFingerprint(t *testing.T) {
	r := &record.Record{Level: "info", Service: "auth"}
	if got := fingerprint.Fields(r); len(got) != 12 {
		t.Errorf("got %d", len(got))
	}
}

func TestHkdfDerive(t *testing.T) {
	out, _ := hkdf.Derive(hmac.AlgSHA256, []byte("s"), []byte("k"), []byte("i"), 16)
	if len(out) != 16 {
		t.Error("hkdf")
	}
}

func TestHmacKnown(t *testing.T) {
	mac := hmac.Hex(hmac.AlgSHA256, []byte("k"), []byte("m"))
	if len(mac) != 64 {
		t.Errorf("got %d", len(mac))
	}
}

func TestJournalRoundTrip(t *testing.T) {
	e := journal.Entry{Timestamp: time.Now().UTC().Truncate(time.Second), Outcome: journal.OutcomeApplied, Op: "x"}
	got, _ := journal.Parse(e.Render())
	if got.Op != "x" {
		t.Error("journal")
	}
}

func TestManifestRender(t *testing.T) {
	m := manifest.New()
	m.Add(&manifest.Entry{Digest: "abc", Size: 1})
	if !strings.Contains(m.Render(), "abc") {
		t.Error("manifest")
	}
}

func TestMatcherFinds(t *testing.T) {
	if !matcher.Build([]string{"foo"}).ContainsAny("xfoo") {
		t.Error("matcher")
	}
}

func TestMtimeOfMissing(t *testing.T) {
	if _, err := mtime.Of("/nonexistent/y"); err == nil {
		t.Error("expected error")
	}
}

func TestOnceCell(t *testing.T) {
	var c once.Cell[int]
	if c.Get(func() int { return 7 }) != 7 {
		t.Error("once")
	}
}

func TestPathsStartsWith(t *testing.T) {
	if !paths.StartsWith("/srv", "/srv/x") {
		t.Error("paths")
	}
}

func TestProfilingCounter(t *testing.T) {
	var c profiling.Counter
	c.Inc()
	if c.Get() != 1 {
		t.Error("profiling")
	}
}

func TestRadixCount(t *testing.T) {
	r := radix.New()
	r.Insert([]byte("foo"))
	if r.CountWithPrefix([]byte("f")) != 1 {
		t.Error("radix")
	}
}

func TestRenderHtmlEscape(t *testing.T) {
	if html.EscapeText("<a>") != "&lt;a&gt;" {
		t.Error("html escape")
	}
}

func TestRenderMdHeading(t *testing.T) {
	if md.Heading(2, "h") != "## h\n" {
		t.Error("md heading")
	}
}

func TestRenderYamlMap(t *testing.T) {
	if yaml.Map(map[string]string{"a": "1"}) != "a: 1\n" {
		t.Error("yaml map")
	}
}

func TestReplicationKnown(t *testing.T) {
	if _, err := replication.Build("rsync"); err != nil {
		t.Error("replication")
	}
}

func TestRetrySuccess(t *testing.T) {
	err := retry.Linear{Attempts: 1, Delay: 0}.Run(context.Background(), func() error { return nil })
	if err != nil {
		t.Error("retry")
	}
}

func TestSemaPermits(t *testing.T) {
	s := sema.New(2)
	s.Acquire()
	if s.Available() != 1 {
		t.Error("sema")
	}
}

func TestShellQuote(t *testing.T) {
	if got := shellquote.Quote("/tmp"); got != "/tmp" {
		t.Errorf("got %q", got)
	}
}

func TestSortedMapTopN(t *testing.T) {
	got := sortedmap.TopNByValue(map[string]uint64{"a": 1, "b": 5}, 1)
	if got[0].Key != "b" {
		t.Errorf("got %v", got[0])
	}
}

func TestTarEmpty(t *testing.T) {
	if recs, _ := tar.Read(make([]byte, 1024)); len(recs) != 0 {
		t.Error("tar")
	}
}

func TestTemplateText(t *testing.T) {
	if got, _ := template.Render("hello", nil); got != "hello" {
		t.Error("template")
	}
}

func TestTokenize(t *testing.T) {
	if got := token.Tokenize("a b"); len(got) != 2 {
		t.Errorf("got %v", got)
	}
}

func TestUrlParse(t *testing.T) {
	u, _ := urlparse.Parse("https://example.com/p")
	if u.Scheme != "https" {
		t.Error("urlparse")
	}
}

func TestUtf8Lossy(t *testing.T) {
	if utf8x.Lossy([]byte("hi")) != "hi" {
		t.Error("utf8x")
	}
}

func TestWindowSum(t *testing.T) {
	w := window.New(time.Hour)
	w.Observe(5)
	if w.Sum() != 5 {
		t.Error("window")
	}
}
