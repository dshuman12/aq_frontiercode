// Package bencode is a minimal Bencode encoder.
package bencode

import (
	"fmt"
	"sort"
	"strings"
)

// Kind tags variant types.
type Kind int

const (
	KInt Kind = iota
	KBytes
	KList
	KDict
)

// Value is a Bencode value tree.
type Value struct {
	Kind  Kind
	Int   int64
	Bytes []byte
	List  []Value
	Dict  map[string]Value
}

// Encode renders v as bencoded bytes.
func Encode(v Value) []byte {
	var sb strings.Builder
	encodeInto(&sb, v)
	return []byte(sb.String())
}

func encodeInto(sb *strings.Builder, v Value) {
	switch v.Kind {
	case KInt:
		fmt.Fprintf(sb, "i%de", v.Int)
	case KBytes:
		fmt.Fprintf(sb, "%d:", len(v.Bytes))
		sb.Write(v.Bytes)
	case KList:
		sb.WriteByte('l')
		for _, item := range v.List {
			encodeInto(sb, item)
		}
		sb.WriteByte('e')
	case KDict:
		sb.WriteByte('d')
		keys := make([]string, 0, len(v.Dict))
		for k := range v.Dict {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			fmt.Fprintf(sb, "%d:%s", len(k), k)
			encodeInto(sb, v.Dict[k])
		}
		sb.WriteByte('e')
	}
}

// Int builds a KInt value.
func Int(n int64) Value { return Value{Kind: KInt, Int: n} }

// Bytes builds a KBytes value.
func Bytes(b []byte) Value { return Value{Kind: KBytes, Bytes: append([]byte(nil), b...)} }

// String builds a KBytes value from a string.
func String(s string) Value { return Bytes([]byte(s)) }

// List builds a KList value.
func List(items ...Value) Value { return Value{Kind: KList, List: items} }

// Dict builds a KDict value.
func Dict(pairs map[string]Value) Value { return Value{Kind: KDict, Dict: pairs} }
