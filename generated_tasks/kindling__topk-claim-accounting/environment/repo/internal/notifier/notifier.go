// Package notifier dispatches alert state changes to one or more
// downstream channels (stderr, webhooks, syslog).
//
// Notifiers run synchronously inline with alert evaluation; for
// asynchronous fan-out wrap a notifier in internal/shipper.
package notifier

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Event is one notification.
type Event struct {
	Name      string
	Severity  string
	State     string
	Value     float64
	Threshold float64
	At        time.Time
	Labels    map[string]string
}

// Notifier handles one event.
type Notifier interface {
	Notify(ctx context.Context, ev Event) error
	Name() string
}

// Multi fans out events to multiple notifiers, accumulating errors.
type Multi struct {
	notifiers []Notifier
}

// New constructs a Multi from the given notifiers.
func New(ns ...Notifier) *Multi { return &Multi{notifiers: append([]Notifier{}, ns...)} }

// Notify delivers to each underlying notifier.
func (m *Multi) Notify(ctx context.Context, ev Event) error {
	var errs []string
	for _, n := range m.notifiers {
		if err := n.Notify(ctx, ev); err != nil {
			errs = append(errs, n.Name()+": "+err.Error())
		}
	}
	if len(errs) == 0 {
		return nil
	}
	return errors.New("notifier: " + strings.Join(errs, "; "))
}

// Name identifies the multi.
func (m *Multi) Name() string { return "multi" }

// Stderr writes events to an io.Writer (typically os.Stderr).
type Stderr struct {
	W  io.Writer
	mu sync.Mutex
}

// NewStderr constructs a Stderr notifier.
func NewStderr(w io.Writer) *Stderr { return &Stderr{W: w} }

// Notify writes one line per event.
func (s *Stderr) Notify(ctx context.Context, ev Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.W == nil {
		return errors.New("notifier: nil writer")
	}
	_, err := fmt.Fprintf(s.W, "[%s] [%s/%s] %s value=%v threshold=%v\n",
		ev.At.UTC().Format(time.RFC3339),
		ev.Severity, ev.State, ev.Name, ev.Value, ev.Threshold)
	return err
}

// Name returns "stderr".
func (s *Stderr) Name() string { return "stderr" }

// Webhook posts events as JSON to an HTTP endpoint.
type Webhook struct {
	URL    string
	Client *http.Client
}

// NewWebhook constructs a Webhook with a default 10-second client.
func NewWebhook(url string) *Webhook {
	return &Webhook{URL: url, Client: &http.Client{Timeout: 10 * time.Second}}
}

// Notify posts ev to the webhook URL.
func (w *Webhook) Notify(ctx context.Context, ev Event) error {
	body := strings.NewReader(buildJSON(ev))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, w.URL, body)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := w.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("notifier: webhook %s returned %d", w.URL, resp.StatusCode)
	}
	return nil
}

// Name returns "webhook".
func (w *Webhook) Name() string { return "webhook" }

// Buffered queues notifications and flushes periodically.
type Buffered struct {
	inner   Notifier
	mu      sync.Mutex
	pending []Event
	max     int
}

// NewBuffered wraps inner with a per-call cap.
func NewBuffered(inner Notifier, max int) *Buffered {
	if max <= 0 {
		max = 32
	}
	return &Buffered{inner: inner, max: max}
}

// Notify queues ev; flushes when full.
func (b *Buffered) Notify(ctx context.Context, ev Event) error {
	b.mu.Lock()
	b.pending = append(b.pending, ev)
	full := len(b.pending) >= b.max
	b.mu.Unlock()
	if full {
		return b.Flush(ctx)
	}
	return nil
}

// Flush sends queued events.
func (b *Buffered) Flush(ctx context.Context) error {
	b.mu.Lock()
	pending := b.pending
	b.pending = nil
	b.mu.Unlock()
	for _, ev := range pending {
		if err := b.inner.Notify(ctx, ev); err != nil {
			return err
		}
	}
	return nil
}

// Name returns "buffered".
func (b *Buffered) Name() string { return "buffered:" + b.inner.Name() }

func buildJSON(ev Event) string {
	var b strings.Builder
	fmt.Fprintf(&b, `{"name":%q,"severity":%q,"state":%q,"value":%v,"threshold":%v,"at":%q`,
		ev.Name, ev.Severity, ev.State, ev.Value, ev.Threshold,
		ev.At.UTC().Format(time.RFC3339))
	if len(ev.Labels) > 0 {
		b.WriteString(`,"labels":{`)
		i := 0
		for k, v := range ev.Labels {
			if i > 0 {
				b.WriteByte(',')
			}
			fmt.Fprintf(&b, "%q:%q", k, v)
			i++
		}
		b.WriteByte('}')
	}
	b.WriteByte('}')
	return b.String()
}
