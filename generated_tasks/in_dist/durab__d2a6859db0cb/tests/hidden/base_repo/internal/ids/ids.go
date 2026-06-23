// Package ids generates run identifiers. The engine never relies on IDs being
// monotonic — they are content-addressed wherever possible — but generating
// time-ordered IDs is convenient for human debugging and for SQLite indexes.
package ids

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/binary"
	"sync/atomic"
	"time"
)

// alphabet is a Crockford-style base32 (no I,L,O,U) so eyeballed IDs are
// unambiguous in logs.
var alphabet = base32.NewEncoding("0123456789ABCDEFGHJKMNPQRSTVWXYZ").WithPadding(base32.NoPadding)

var seq uint32

// NewRun returns a 26-char ULID-shaped identifier: 10 chars of millisecond
// timestamp + 16 chars of randomness. The format is fixed; callers parse it
// only via Parse, never by slicing.
func NewRun() string {
	var b [16]byte
	binary.BigEndian.PutUint64(b[:8], uint64(time.Now().UnixMilli()))
	// upper 16 bits of [0:2] hold timestamp high bits; we re-use [6:8] for
	// per-process monotonic to make sort-stable bursts in tests.
	binary.BigEndian.PutUint16(b[6:8], uint16(atomic.AddUint32(&seq, 1)))
	if _, err := rand.Read(b[8:]); err != nil {
		// crypto/rand failures are not actionable; the alternative is to
		// crash the worker. Fall back to time noise.
		binary.BigEndian.PutUint64(b[8:], uint64(time.Now().UnixNano()))
	}
	return alphabet.EncodeToString(b[:])
}
