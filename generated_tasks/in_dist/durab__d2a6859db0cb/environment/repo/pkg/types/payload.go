package types

import (
	"encoding/json"
	"errors"
)

// Payload is the wire-format unit of input/output exchanged with workflows
// and activities. The engine itself does not interpret payloads; encoding is
// the SDK's responsibility.
type Payload struct {
	Encoding string `json:"encoding"`
	Data     []byte `json:"data"`
}

// NewJSONPayload encodes v as JSON. The empty Payload is returned for nil
// inputs so that "no input" stays distinguishable from "JSON null".
func NewJSONPayload(v any) (Payload, error) {
	if v == nil {
		return Payload{}, nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return Payload{}, err
	}
	return Payload{Encoding: "json/plain", Data: b}, nil
}

// Decode unmarshals p into out according to its encoding. It returns
// ErrEmptyPayload when p is the zero value, so callers can distinguish an
// absent payload from a present-but-null one.
func (p Payload) Decode(out any) error {
	if p.Encoding == "" && len(p.Data) == 0 {
		return ErrEmptyPayload
	}
	switch p.Encoding {
	case "json/plain":
		return json.Unmarshal(p.Data, out)
	default:
		return errors.New("unknown payload encoding: " + p.Encoding)
	}
}

// ErrEmptyPayload is returned by Payload.Decode when no input was provided.
var ErrEmptyPayload = errors.New("empty payload")
