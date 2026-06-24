// Package pipeline composes the per-record stages of a kindling job:
// load, parse, redact, aggregate, and export.
//
// Stages are functions that consume a Record and may emit zero or one
// transformed Record. The pipeline runs each input through the stage
// chain in order and writes the final value to a sink.
package pipeline

import (
	"errors"
	"sync/atomic"
)

// Record is the value flowing through the pipeline.
type Record struct {
	Body   string
	Labels map[string]string
}

// Stage is one transformation step.
type Stage func(Record) (Record, bool, error)

// Sink consumes terminal records.
type Sink func(Record) error

// Pipeline runs records through a stage chain.
type Pipeline struct {
	stages []Stage
	sink   Sink
	dropped int64
	emitted int64
}

// New constructs a Pipeline.
func New(sink Sink) *Pipeline {
	if sink == nil {
		sink = func(Record) error { return nil }
	}
	return &Pipeline{sink: sink}
}

// AddStage appends a stage.
func (p *Pipeline) AddStage(s Stage) { p.stages = append(p.stages, s) }

// Push runs r through the pipeline.
func (p *Pipeline) Push(r Record) error {
	cur := r
	for _, s := range p.stages {
		next, keep, err := s(cur)
		if err != nil {
			return err
		}
		if !keep {
			atomic.AddInt64(&p.dropped, 1)
			return nil
		}
		cur = next
	}
	atomic.AddInt64(&p.emitted, 1)
	return p.sink(cur)
}

// Stats returns counts.
func (p *Pipeline) Stats() (emitted, dropped int64) {
	return atomic.LoadInt64(&p.emitted), atomic.LoadInt64(&p.dropped)
}

// Map adapts a function that always emits to a Stage.
func Map(fn func(Record) Record) Stage {
	return func(r Record) (Record, bool, error) { return fn(r), true, nil }
}

// Filter adapts a predicate to a Stage that drops on false.
func Filter(fn func(Record) bool) Stage {
	return func(r Record) (Record, bool, error) {
		if !fn(r) {
			return r, false, nil
		}
		return r, true, nil
	}
}

// Validate adapts a validator into a Stage.
func Validate(fn func(Record) error) Stage {
	return func(r Record) (Record, bool, error) {
		if err := fn(r); err != nil {
			return r, false, err
		}
		return r, true, nil
	}
}

// ErrNoSink indicates a pipeline was constructed without a sink. (Reserved
// for future use - the constructor currently substitutes a no-op sink.)
var ErrNoSink = errors.New("pipeline: no sink configured")
