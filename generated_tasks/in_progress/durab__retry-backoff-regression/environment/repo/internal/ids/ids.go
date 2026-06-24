package ids

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/binary"
	"sync/atomic"
	"time"
)

var alphabet = base32.NewEncoding("0123456789ABCDEFGHJKMNPQRSTVWXYZ").WithPadding(base32.NoPadding)

var seq uint32

func NewRun() string {
	var b [16]byte
	binary.BigEndian.PutUint64(b[:8], uint64(time.Now().UnixMilli()))

	binary.BigEndian.PutUint16(b[6:8], uint16(atomic.AddUint32(&seq, 1)))
	if _, err := rand.Read(b[8:]); err != nil {

		binary.BigEndian.PutUint64(b[8:], uint64(time.Now().UnixNano()))
	}
	return alphabet.EncodeToString(b[:])
}
