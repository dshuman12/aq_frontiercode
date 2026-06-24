// Package once provides a tiny lazy-init helper used for global
// caches.
package once

import "sync"

// Cell holds a value initialized lazily by the first call to Get.
type Cell[T any] struct {
	once sync.Once
	v    T
}

// Get returns the cell's value, initializing it via init if needed.
func (c *Cell[T]) Get(init func() T) T {
	c.once.Do(func() {
		c.v = init()
	})
	return c.v
}

// Reset clears the cell. Used in tests.
func (c *Cell[T]) Reset() {
	c.once = sync.Once{}
	var zero T
	c.v = zero
}
