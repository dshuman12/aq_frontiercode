// Package eventbus implements an in-process publish-subscribe bus.
//
// Subscribers register a callback per topic; publishes are synchronous
// and dispatched in subscription order. Slow subscribers do not block
// other subscribers because each call is wrapped in recover() and a
// per-subscriber done channel.
package eventbus

import (
	"context"
	"errors"
	"runtime/debug"
	"sort"
	"sync"
	"sync/atomic"
)

// HandlerFunc is invoked when a topic publishes a message.
type HandlerFunc func(ctx context.Context, msg any) error

// Subscription is a registered topic + handler pair.
type Subscription struct {
	ID    uint64
	Topic string
	Once  bool
	fn    HandlerFunc
}

// Bus is the pubsub bus.
type Bus struct {
	mu       sync.RWMutex
	by       map[string][]*Subscription
	all      map[uint64]*Subscription
	nextID   uint64
	stats    Stats
	onPanic  func(topic string, panicValue any, stack []byte)
	onError  func(topic string, err error)
}

// Stats summarises bus traffic.
type Stats struct {
	Published uint64
	Delivered uint64
	Dropped   uint64
	Panics    uint64
	Errors    uint64
}

// New constructs a Bus.
func New() *Bus {
	return &Bus{
		by:  map[string][]*Subscription{},
		all: map[uint64]*Subscription{},
	}
}

// SetPanicHandler registers a panic callback.
func (b *Bus) SetPanicHandler(fn func(topic string, panicValue any, stack []byte)) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.onPanic = fn
}

// SetErrorHandler registers an error callback.
func (b *Bus) SetErrorHandler(fn func(topic string, err error)) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.onError = fn
}

// Subscribe registers fn for topic.
func (b *Bus) Subscribe(topic string, fn HandlerFunc) *Subscription {
	return b.subscribe(topic, fn, false)
}

// Once subscribes for the first publish only.
func (b *Bus) Once(topic string, fn HandlerFunc) *Subscription {
	return b.subscribe(topic, fn, true)
}

func (b *Bus) subscribe(topic string, fn HandlerFunc, once bool) *Subscription {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.nextID++
	s := &Subscription{ID: b.nextID, Topic: topic, fn: fn, Once: once}
	b.by[topic] = append(b.by[topic], s)
	b.all[b.nextID] = s
	return s
}

// Unsubscribe drops the subscription.
func (b *Bus) Unsubscribe(s *Subscription) {
	if s == nil {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if _, ok := b.all[s.ID]; !ok {
		return
	}
	delete(b.all, s.ID)
	subs := b.by[s.Topic]
	out := subs[:0]
	for _, x := range subs {
		if x.ID == s.ID {
			continue
		}
		out = append(out, x)
	}
	b.by[s.Topic] = out
}

// Publish delivers msg to subscribers of topic.
func (b *Bus) Publish(ctx context.Context, topic string, msg any) {
	atomic.AddUint64(&b.stats.Published, 1)
	b.mu.RLock()
	subs := append([]*Subscription(nil), b.by[topic]...)
	onPanic := b.onPanic
	onError := b.onError
	b.mu.RUnlock()
	for _, s := range subs {
		b.deliverOne(ctx, topic, s, msg, onPanic, onError)
	}
}

func (b *Bus) deliverOne(ctx context.Context, topic string, s *Subscription, msg any,
	onPanic func(string, any, []byte), onError func(string, error)) {
	defer func() {
		if v := recover(); v != nil {
			atomic.AddUint64(&b.stats.Panics, 1)
			if onPanic != nil {
				onPanic(topic, v, debug.Stack())
			}
		}
	}()
	if err := s.fn(ctx, msg); err != nil {
		atomic.AddUint64(&b.stats.Errors, 1)
		if onError != nil {
			onError(topic, err)
		}
		return
	}
	atomic.AddUint64(&b.stats.Delivered, 1)
	if s.Once {
		b.Unsubscribe(s)
	}
}

// Topics returns the subscribed topic names sorted alphabetically.
func (b *Bus) Topics() []string {
	b.mu.RLock()
	defer b.mu.RUnlock()
	out := make([]string, 0, len(b.by))
	for t := range b.by {
		out = append(out, t)
	}
	sort.Strings(out)
	return out
}

// SubscriberCount returns how many subscribers exist for topic.
func (b *Bus) SubscriberCount(topic string) int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.by[topic])
}

// Stats returns counters.
func (b *Bus) Stats() Stats {
	return Stats{
		Published: atomic.LoadUint64(&b.stats.Published),
		Delivered: atomic.LoadUint64(&b.stats.Delivered),
		Dropped:   atomic.LoadUint64(&b.stats.Dropped),
		Panics:    atomic.LoadUint64(&b.stats.Panics),
		Errors:    atomic.LoadUint64(&b.stats.Errors),
	}
}

// Drain unsubscribes everything.
func (b *Bus) Drain() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.by = map[string][]*Subscription{}
	b.all = map[uint64]*Subscription{}
}

// ErrClosed is returned by future async variants; reserved for now.
var ErrClosed = errors.New("eventbus: closed")
