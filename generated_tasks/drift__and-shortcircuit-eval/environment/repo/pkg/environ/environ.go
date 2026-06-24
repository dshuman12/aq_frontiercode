package environ

import (
	"fmt"
	"strings"
)

type Value interface {
	Type() string
	Inspect() string
}

type Binding struct {
	Value   Value
	Mutable bool
}

type Env struct {
	store     map[string]*Binding
	parent    *Env
	depth     int
	totalSize int
}

func New() *Env {
	return &Env{
		store: make(map[string]*Binding),
		depth: 0,
	}
}

func NewEnclosed(parent *Env) *Env {
	return &Env{
		store:     make(map[string]*Binding),
		parent:    parent,
		depth:     parent.depth + 1,
		totalSize: parent.totalSize,
	}
}

func (e *Env) Get(name string) (Value, bool) {
	b, ok := e.store[name]
	if ok {
		return b.Value, true
	}
	if e.parent != nil {
		return e.parent.Get(name)
	}
	return nil, false
}

func (e *Env) GetBinding(name string) (*Binding, bool) {
	b, ok := e.store[name]
	if ok {
		return b, true
	}
	if e.parent != nil {
		return e.parent.GetBinding(name)
	}
	return nil, false
}

func (e *Env) Set(name string, val Value, mutable bool) {
	if _, exists := e.store[name]; !exists {
		e.totalSize++
	}
	e.store[name] = &Binding{Value: val, Mutable: mutable}
}

func (e *Env) Update(name string, val Value) error {
	b, ok := e.store[name]
	if ok {
		if !b.Mutable {
			return fmt.Errorf("cannot assign to immutable variable %q", name)
		}
		b.Value = val
		return nil
	}
	if e.parent != nil {
		return e.parent.Update(name, val)
	}
	return fmt.Errorf("undefined variable %q", name)
}

func (e *Env) Has(name string) bool {
	_, ok := e.store[name]
	if ok {
		return true
	}
	if e.parent != nil {
		return e.parent.Has(name)
	}
	return false
}

func (e *Env) HasLocal(name string) bool {
	_, ok := e.store[name]
	return ok
}

func (e *Env) Depth() int {
	return e.depth
}

func (e *Env) Parent() *Env {
	return e.parent
}

func (e *Env) LocalNames() []string {
	names := make([]string, 0, len(e.store))
	for k := range e.store {
		names = append(names, k)
	}
	return names
}

func (e *Env) AllNames() []string {
	seen := make(map[string]bool)
	var names []string
	for env := e; env != nil; env = env.parent {
		for k := range env.store {
			if !seen[k] {
				seen[k] = true
				names = append(names, k)
			}
		}
	}
	return names
}

func (e *Env) Clone() *Env {
	clone := &Env{
		store:  make(map[string]*Binding, len(e.store)),
		parent: e.parent,
		depth:  e.depth,
	}
	for k, v := range e.store {
		clone.store[k] = &Binding{Value: v.Value, Mutable: v.Mutable}
	}
	return clone
}

func (e *Env) Dump() string {
	var b strings.Builder
	for env := e; env != nil; env = env.parent {
		fmt.Fprintf(&b, "--- scope depth %d ---\n", env.depth)
		for name, bind := range env.store {
			mut := "let"
			if bind.Mutable {
				mut = "mut"
			}
			fmt.Fprintf(&b, "  %s %s = %s\n", mut, name, bind.Value.Inspect())
		}
	}
	return b.String()
}

func (e *Env) Size() int {
	return e.totalSize
}

func (e *Env) LocalSize() int {
	return len(e.store)
}

func (e *Env) Delete(name string) bool {
	if _, ok := e.store[name]; ok {
		delete(e.store, name)
		e.totalSize--
		return true
	}
	return false
}

func (e *Env) Merge(other *Env) {
	for k, v := range other.store {
		e.store[k] = v
	}
}
