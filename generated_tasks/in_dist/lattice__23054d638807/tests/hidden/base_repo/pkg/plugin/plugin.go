// Package plugin defines extension points for Lattice. The full
// system is on the roadmap (out-of-tree Go plugins via the standard
// `plugin` package, plus a WASM variant for cross-platform use); this
// file pins the contract types so v1 binaries can be linked against
// the eventual implementation without breaking changes.
//
// As of this commit the registry is in-memory only — no plugin loader
// exists. Users who want to extend Lattice today should fork and
// add their TaskHandler implementations directly. Once the loader
// stabilises this package will grow Discover() and a real
// LoadFromPath().
package plugin

import (
	"context"
	"fmt"
	"sync"

	"github.com/manojgowda/lattice/pkg/types"
)

// Plugin is the top-level extension surface. Each plugin can register
// any number of TaskHandlers. A plugin's Name is used in error
// messages and in `lattice plugins list`.
type Plugin interface {
	Name() string
	Register(reg *Registry) error
}

// TaskHandler is invoked by the scheduler in place of running the raw
// task command. Plugins use this to add task "kinds" — for example, a
// "docker-build" handler that takes structured args from Task.Env and
// runs `docker build` with them.
type TaskHandler interface {
	// Kind is the discriminator the user puts on a task to invoke this
	// handler. Example: tasks with `kind: docker-build` route here.
	Kind() string

	// Run executes the task. The handler is responsible for honouring
	// ctx.Done() and writing stdout/stderr to opts.Stdout/Stderr.
	Run(ctx context.Context, task *types.Task, opts types.RunOptions) (types.Result, error)
}

// Registry holds the active set of plugins.
type Registry struct {
	mu       sync.RWMutex
	handlers map[string]TaskHandler
	plugins  []Plugin
}

// NewRegistry returns an empty Registry.
func NewRegistry() *Registry {
	return &Registry{handlers: map[string]TaskHandler{}}
}

// Register installs a plugin and its handlers. Returns an error if
// the plugin's name is empty or if any of its handlers conflict with
// an existing kind.
func (r *Registry) Register(p Plugin) error {
	if p == nil {
		return fmt.Errorf("plugin: nil")
	}
	if p.Name() == "" {
		return fmt.Errorf("plugin: name is empty")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.plugins = append(r.plugins, p)
	return p.Register(r)
}

// AddHandler is what a Plugin calls inside its Register implementation.
func (r *Registry) AddHandler(h TaskHandler) error {
	if h == nil {
		return fmt.Errorf("plugin: nil handler")
	}
	if h.Kind() == "" {
		return fmt.Errorf("plugin: handler with empty kind")
	}
	if _, ok := r.handlers[h.Kind()]; ok {
		return fmt.Errorf("plugin: kind %q already registered", h.Kind())
	}
	r.handlers[h.Kind()] = h
	return nil
}

// Lookup returns the handler for a given kind, or (nil, false) if no
// plugin claims it.
func (r *Registry) Lookup(kind string) (TaskHandler, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	h, ok := r.handlers[kind]
	return h, ok
}

// List returns the registered plugin names in registration order.
// Used by `lattice plugins list`.
func (r *Registry) List() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	names := make([]string, 0, len(r.plugins))
	for _, p := range r.plugins {
		names = append(names, p.Name())
	}
	return names
}
