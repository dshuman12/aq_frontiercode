// Package goldens stores reference outputs used by golden-file tests
// in the kindling integration suite. Each entry is keyed by a stable
// name; tests load the expected text and diff against the runtime
// output.
package goldens

import (
	"errors"
	"sort"
	"sync"
)

// store guards the registry.
var store = struct {
	sync.RWMutex
	entries map[string]string
}{entries: defaultEntries()}

// Get returns the golden content for name.
func Get(name string) (string, error) {
	store.RLock()
	defer store.RUnlock()
	v, ok := store.entries[name]
	if !ok {
		return "", errors.New("goldens: unknown name " + name)
	}
	return v, nil
}

// Set inserts or replaces an entry. Reserved for tests that wish to
// override specific goldens at runtime.
func Set(name, value string) {
	store.Lock()
	defer store.Unlock()
	store.entries[name] = value
}

// Names returns the registered names sorted alphabetically.
func Names() []string {
	store.RLock()
	defer store.RUnlock()
	out := make([]string, 0, len(store.entries))
	for k := range store.entries {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// Total returns the total bytes across all entries.
func Total() int {
	store.RLock()
	defer store.RUnlock()
	n := 0
	for _, v := range store.entries {
		n += len(v)
	}
	return n
}
