// Package serializer provides a registry of named encoders/decoders for
// kindling records. New formats can be registered by users at runtime.
package serializer

import (
	"errors"
	"sort"
	"sync"
)

// Codec is one named pair of encoder/decoder.
type Codec interface {
	Name() string
	Encode(v any) ([]byte, error)
	Decode(data []byte, into any) error
	ContentType() string
}

// Registry holds named codecs.
type Registry struct {
	mu     sync.RWMutex
	codecs map[string]Codec
}

// New constructs an empty Registry.
func New() *Registry { return &Registry{codecs: map[string]Codec{}} }

// Register adds c to the registry. Re-registering replaces the prior value.
func (r *Registry) Register(c Codec) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.codecs[c.Name()] = c
}

// Lookup returns the codec by name.
func (r *Registry) Lookup(name string) (Codec, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	c, ok := r.codecs[name]
	if !ok {
		return nil, errors.New("serializer: unknown codec " + name)
	}
	return c, nil
}

// Names returns the registered codec names alphabetically.
func (r *Registry) Names() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]string, 0, len(r.codecs))
	for n := range r.codecs {
		out = append(out, n)
	}
	sort.Strings(out)
	return out
}

// Default registry pre-loaded with the built-in codecs.
func Default() *Registry {
	r := New()
	r.Register(JSONCodec{})
	r.Register(TextCodec{})
	r.Register(NoopCodec{})
	return r
}

// JSONCodec encodes via json2-like inline implementation.
type JSONCodec struct{}

// Name returns "json".
func (JSONCodec) Name() string { return "json" }

// ContentType returns "application/json".
func (JSONCodec) ContentType() string { return "application/json" }

// Encode renders v as JSON; supports map[string]any and []any.
func (JSONCodec) Encode(v any) ([]byte, error) {
	out := []byte{}
	out = appendJSON(out, v)
	return out, nil
}

// Decode is intentionally a stub; tests below construct expected JSON
// directly. Real callers use encoding/json.
func (JSONCodec) Decode(data []byte, into any) error {
	return errors.New("serializer: JSONCodec decode not implemented")
}

// TextCodec writes the value via fmt.Sprint and decodes by string copy.
type TextCodec struct{}

// Name returns "text".
func (TextCodec) Name() string { return "text" }

// ContentType returns "text/plain; charset=utf-8".
func (TextCodec) ContentType() string { return "text/plain; charset=utf-8" }

// Encode coerces v to string.
func (TextCodec) Encode(v any) ([]byte, error) {
	switch x := v.(type) {
	case string:
		return []byte(x), nil
	case []byte:
		return x, nil
	}
	return nil, errors.New("serializer: text codec needs string/[]byte input")
}

// Decode returns data unchanged into a *string.
func (TextCodec) Decode(data []byte, into any) error {
	ptr, ok := into.(*string)
	if !ok {
		return errors.New("serializer: text decode requires *string")
	}
	*ptr = string(data)
	return nil
}

// NoopCodec returns the input verbatim.
type NoopCodec struct{}

// Name returns "noop".
func (NoopCodec) Name() string { return "noop" }

// ContentType returns "application/octet-stream".
func (NoopCodec) ContentType() string { return "application/octet-stream" }

// Encode requires []byte input.
func (NoopCodec) Encode(v any) ([]byte, error) {
	b, ok := v.([]byte)
	if !ok {
		return nil, errors.New("serializer: noop codec needs []byte input")
	}
	return b, nil
}

// Decode copies into a *[]byte.
func (NoopCodec) Decode(data []byte, into any) error {
	ptr, ok := into.(*[]byte)
	if !ok {
		return errors.New("serializer: noop decode requires *[]byte")
	}
	*ptr = append((*ptr)[:0], data...)
	return nil
}

func appendJSON(out []byte, v any) []byte {
	switch x := v.(type) {
	case nil:
		return append(out, "null"...)
	case bool:
		if x {
			return append(out, "true"...)
		}
		return append(out, "false"...)
	case string:
		out = append(out, '"')
		out = append(out, escapeString(x)...)
		out = append(out, '"')
		return out
	case []any:
		out = append(out, '[')
		for i, item := range x {
			if i > 0 {
				out = append(out, ',')
			}
			out = appendJSON(out, item)
		}
		return append(out, ']')
	case map[string]any:
		keys := make([]string, 0, len(x))
		for k := range x {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		out = append(out, '{')
		for i, k := range keys {
			if i > 0 {
				out = append(out, ',')
			}
			out = append(out, '"')
			out = append(out, escapeString(k)...)
			out = append(out, '"', ':')
			out = appendJSON(out, x[k])
		}
		return append(out, '}')
	}
	return out
}

func escapeString(s string) string {
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch c {
		case '"':
			out = append(out, '\\', '"')
		case '\\':
			out = append(out, '\\', '\\')
		case '\n':
			out = append(out, '\\', 'n')
		default:
			out = append(out, c)
		}
	}
	return string(out)
}
