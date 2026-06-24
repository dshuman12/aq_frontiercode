package mergesort

import (
	"bufio"
	"encoding/binary"
	"errors"
	"io"
	"sort"
	"testing"
)

func encInt(v int64) []byte {
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], uint64(v))
	return buf[:]
}

func decInt(r *bufio.Reader) (int64, error) {
	var buf [8]byte
	if _, err := io.ReadFull(r, buf[:]); err != nil {
		if errors.Is(err, io.ErrUnexpectedEOF) {
			return 0, io.EOF
		}
		return 0, err
	}
	return int64(binary.BigEndian.Uint64(buf[:])), nil
}

func TestSort(t *testing.T) {
	input := []int64{5, 2, 7, 1, 9, 3, 8, 4, 6, 0}
	pos := 0
	read := func() (int64, error) {
		if pos >= len(input) {
			return 0, io.EOF
		}
		v := input[pos]
		pos++
		return v, nil
	}
	var out []int64
	write := func(v int64) error {
		out = append(out, v)
		return nil
	}
	if err := Sort(read, write, func(a, b int64) bool { return a < b }, Options[int64]{
		ChunkSize: 3,
		Encode:    encInt,
		Decode:    decInt,
	}); err != nil {
		t.Fatal(err)
	}
	want := append([]int64(nil), input...)
	sort.Slice(want, func(i, j int) bool { return want[i] < want[j] })
	for i := range want {
		if out[i] != want[i] {
			t.Fatalf("at %d: got %d want %d", i, out[i], want[i])
		}
	}
}

func TestSortNoEncoder(t *testing.T) {
	pos := 0
	read := func() (int, error) {
		if pos > 0 {
			return 0, io.EOF
		}
		pos++
		return 1, nil
	}
	if err := Sort(read, func(int) error { return nil }, func(a, b int) bool { return a < b }, Options[int]{}); err == nil {
		t.Fatal("expected err")
	}
}

func TestEmptyInput(t *testing.T) {
	read := func() (int64, error) { return 0, io.EOF }
	called := 0
	if err := Sort(read, func(int64) error { called++; return nil }, func(a, b int64) bool { return a < b }, Options[int64]{
		Encode: encInt,
		Decode: decInt,
	}); err != nil {
		t.Fatal(err)
	}
	if called != 0 {
		t.Fatalf("expected no output, got %d", called)
	}
}
