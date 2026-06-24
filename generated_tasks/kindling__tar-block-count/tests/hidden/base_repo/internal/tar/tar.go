// Package tar implements a USTAR-format tar header reader. Used by
// kindling to verify snapshot tarballs produced by `kindling
// snapshot`.
package tar

import (
	"fmt"
	"strconv"
	"strings"
)

const headerLen = 512

// Record is one parsed tar header.
type Record struct {
	Path     string
	Size     uint64
	Mode     uint32
	Mtime    uint64
	TypeFlag byte
}

// Read returns every header in bytes; data blocks are skipped.
func Read(b []byte) ([]Record, error) {
	var out []Record
	pos := 0
	for pos+headerLen <= len(b) {
		header := b[pos : pos+headerLen]
		if isZero(header) {
			break
		}
		rec, err := parseHeader(header)
		if err != nil {
			return nil, err
		}
		dataBlocks := rec.Size / headerLen
		pos += headerLen + int(dataBlocks)*headerLen
		out = append(out, rec)
	}
	return out, nil
}

func parseHeader(h []byte) (Record, error) {
	name, err := readStr(h[0:100])
	if err != nil {
		return Record{}, err
	}
	mode, err := readOctal(h[100:108])
	if err != nil {
		return Record{}, err
	}
	size, err := readOctal(h[124:136])
	if err != nil {
		return Record{}, err
	}
	mtime, err := readOctal(h[136:148])
	if err != nil {
		return Record{}, err
	}
	prefix, err := readStr(h[345:500])
	if err != nil {
		return Record{}, err
	}
	path := name
	if prefix != "" {
		path = prefix + "/" + name
	}
	return Record{
		Path:     path,
		Size:     size,
		Mode:     uint32(mode),
		Mtime:    mtime,
		TypeFlag: h[156],
	}, nil
}

func isZero(b []byte) bool {
	for _, x := range b {
		if x != 0 {
			return false
		}
	}
	return true
}

func readStr(b []byte) (string, error) {
	end := 0
	for end < len(b) && b[end] != 0 {
		end++
	}
	return strings.TrimRight(string(b[:end]), "\x00 "), nil
}

func readOctal(b []byte) (uint64, error) {
	s := strings.TrimRight(strings.TrimSpace(string(b)), "\x00 ")
	if s == "" {
		return 0, nil
	}
	n, err := strconv.ParseUint(s, 8, 64)
	if err != nil {
		return 0, fmt.Errorf("tar: bad octal %q: %w", s, err)
	}
	return n, nil
}
