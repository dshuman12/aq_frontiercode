package eventbus

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
)

func TestPubSub(t *testing.T) {
	b := New()
	var got int32
	b.Subscribe("topic", func(ctx context.Context, msg any) error {
		atomic.AddInt32(&got, 1)
		return nil
	})
	b.Publish(context.Background(), "topic", "x")
	if got != 1 {
		t.Fatalf("got %d", got)
	}
	if b.Stats().Delivered != 1 {
		t.Fatalf("stats %+v", b.Stats())
	}
}

func TestUnsubscribe(t *testing.T) {
	b := New()
	s := b.Subscribe("x", func(context.Context, any) error { t.Fatal("should not call"); return nil })
	b.Unsubscribe(s)
	b.Publish(context.Background(), "x", "")
}

func TestOnce(t *testing.T) {
	b := New()
	var n int32
	b.Once("x", func(context.Context, any) error { atomic.AddInt32(&n, 1); return nil })
	b.Publish(context.Background(), "x", nil)
	b.Publish(context.Background(), "x", nil)
	if n != 1 {
		t.Fatalf("got %d", n)
	}
}

func TestPanicHandler(t *testing.T) {
	b := New()
	called := false
	b.SetPanicHandler(func(topic string, v any, stack []byte) { called = true })
	b.Subscribe("x", func(context.Context, any) error { panic("boom") })
	b.Publish(context.Background(), "x", nil)
	if !called {
		t.Fatal("panic handler not called")
	}
}

func TestErrorHandler(t *testing.T) {
	b := New()
	saw := ""
	b.SetErrorHandler(func(topic string, err error) { saw = err.Error() })
	b.Subscribe("x", func(context.Context, any) error { return errors.New("nope") })
	b.Publish(context.Background(), "x", nil)
	if saw != "nope" {
		t.Fatalf("got %q", saw)
	}
}

func TestTopicsAndCount(t *testing.T) {
	b := New()
	b.Subscribe("a", func(context.Context, any) error { return nil })
	b.Subscribe("b", func(context.Context, any) error { return nil })
	if len(b.Topics()) != 2 {
		t.Fatal("topics")
	}
	if b.SubscriberCount("a") != 1 {
		t.Fatal("sub count")
	}
}

func TestDrain(t *testing.T) {
	b := New()
	b.Subscribe("x", func(context.Context, any) error { return nil })
	b.Drain()
	if b.SubscriberCount("x") != 0 {
		t.Fatal("not drained")
	}
}
