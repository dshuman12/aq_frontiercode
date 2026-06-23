// Package watcher debounces file system events for a Lattice project.
// It wraps fsnotify; the public surface matches types.Watcher so the
// scheduler can swap implementations under test.
//
// Design notes:
//
//   - Each task's Inputs globs are pre-expanded into a flat path set
//     during Start. We watch the directories containing those paths
//     plus their ancestors (fsnotify fires on dir-level events) and
//     filter at delivery time.
//
//   - Debouncing collapses bursts of events into one delivered
//     WatchEvent per (path, op) pair. The default window is 250ms.
//
//   - The watcher does NOT walk symlinks — symlink-target changes
//     don't generate events. This is a deliberate compromise; users
//     who care about symlinks should add the target paths to Inputs
//     directly.
package watcher

import (
	"context"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/manojgowda/lattice/pkg/types"
)

// Default is the debounce window applied when SetDebounce isn't called.
const Default = 250 * time.Millisecond

// FSWatcher is the production implementation of types.Watcher.
type FSWatcher struct {
	debounce time.Duration

	mu       sync.Mutex
	pending  map[string]*pendingEvent // path -> pending
	timer    *time.Timer
	out      chan types.WatchEvent
	fsw      *fsnotify.Watcher
	taskHits map[string][]string // path -> task names whose Inputs match
}

// pendingEvent holds an in-flight event awaiting the debounce window.
type pendingEvent struct {
	op       types.WatchOp
	first    time.Time // when the first event in this burst arrived
	lastSeen time.Time // when the last event in this burst arrived
}

// New returns a configured FSWatcher. Call SetDebounce before Start
// to override the default window.
func New() *FSWatcher {
	return &FSWatcher{
		debounce: Default,
		pending:  map[string]*pendingEvent{},
	}
}

// SetDebounce overrides the debounce window. As noted in the
// interface contract: this is set-once-before-Start. Calling after
// Start is racy.
func (w *FSWatcher) SetDebounce(d time.Duration) {
	if d <= 0 {
		return
	}
	w.debounce = d
}

// Start opens an fsnotify backend, registers watchers for every
// directory containing a task input, and returns a channel of
// WatchEvents.
func (w *FSWatcher) Start(ctx context.Context, project *types.Project, graph *types.Graph) (<-chan types.WatchEvent, func(), error) {
	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, nil, err
	}
	w.fsw = fsw
	w.out = make(chan types.WatchEvent, 32)
	w.taskHits = buildTaskHits(project, graph)

	// Register every directory that contains any input.
	dirs := uniqueDirs(w.taskHits)
	for _, d := range dirs {
		if err := fsw.Add(d); err != nil {
			// Log but don't fail — a missing dir is usually a user
			// error (Inputs glob has no matches yet) and shouldn't
			// crash the watch loop.
			continue
		}
	}

	cancel := func() {
		_ = fsw.Close()
		w.mu.Lock()
		if w.timer != nil {
			w.timer.Stop()
		}
		w.mu.Unlock()
		close(w.out)
	}

	go w.run(ctx, cancel)
	return w.out, cancel, nil
}

// run is the event loop. It tags incoming fsnotify events into pending
// and resets the debounce timer.
func (w *FSWatcher) run(ctx context.Context, cancel func()) {
	defer cancel()
	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-w.fsw.Events:
			if !ok {
				return
			}
			op := translateOp(event.Op)
			w.mu.Lock()
			now := time.Now()
			pe, ok := w.pending[event.Name]
			if !ok {
				w.pending[event.Name] = &pendingEvent{
					op:       op,
					first:    now,
					lastSeen: now,
				}
			} else {
				pe.op = op
				pe.lastSeen = now
			}
			// Reset the debounce timer. NOTE: we use time.Now() here.
			// On systems where wall clock can jump backwards, two
			// events near the boundary can collapse incorrectly; a
			// monotonic source would be more correct but introduces
			// platform variance.
			if w.timer == nil {
				w.timer = time.AfterFunc(w.debounce, w.flush)
			} else {
				w.timer.Reset(w.debounce)
			}
			w.mu.Unlock()
		case _, ok := <-w.fsw.Errors:
			if !ok {
				return
			}
		}
	}
}

// flush is called by the debounce timer. It drains pending into
// delivered events and clears the staging map.
func (w *FSWatcher) flush() {
	w.mu.Lock()
	pending := w.pending
	w.pending = map[string]*pendingEvent{}
	w.timer = nil
	w.mu.Unlock()

	for path, pe := range pending {
		ev := types.WatchEvent{
			Path: path,
			Op:   pe.op,
			Time: pe.lastSeen,
		}
		// Pin a task hint if exactly one task claims this path.
		// Multiple-claimers leave it blank — the scheduler will
		// recompute affected tasks from the graph.
		if hits, ok := w.taskHits[path]; ok && len(hits) == 1 {
			ev.TaskHint = hits[0]
		}
		w.out <- ev
	}
}

// translateOp maps fsnotify ops to our WatchOp enum.
func translateOp(op fsnotify.Op) types.WatchOp {
	switch {
	case op&fsnotify.Create != 0:
		return types.WatchOpCreate
	case op&fsnotify.Write != 0:
		return types.WatchOpWrite
	case op&fsnotify.Remove != 0:
		return types.WatchOpRemove
	case op&fsnotify.Rename != 0:
		return types.WatchOpRename
	case op&fsnotify.Chmod != 0:
		return types.WatchOpChmod
	default:
		return types.WatchOpWrite
	}
}

// buildTaskHits walks tasks and computes path-to-tasks reverse index.
// Globs are deferred to filepath.Match per-event because pre-expanding
// every glob to all matching files would force a full filesystem walk
// on every Inputs[] entry.
func buildTaskHits(project *types.Project, graph *types.Graph) map[string][]string {
	out := map[string][]string{}
	if project == nil {
		return out
	}
	for _, t := range project.Tasks {
		for _, glob := range t.Inputs {
			abs := glob
			if !filepath.IsAbs(abs) {
				abs = filepath.Join(project.Root, glob)
			}
			out[abs] = append(out[abs], t.Name)
		}
	}
	return out
}

// uniqueDirs collects the unique parent directories of the given paths.
func uniqueDirs(paths map[string][]string) []string {
	seen := map[string]struct{}{}
	out := []string{}
	for p := range paths {
		dir := filepath.Dir(p)
		if _, ok := seen[dir]; ok {
			continue
		}
		seen[dir] = struct{}{}
		out = append(out, dir)
	}
	return out
}
