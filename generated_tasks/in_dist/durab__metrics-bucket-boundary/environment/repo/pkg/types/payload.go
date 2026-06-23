package types

import (
	"encoding/json"
	"errors"
)

type Payload struct {
	Encoding string `json:"encoding"`
	Data     []byte `json:"data"`
}

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

var ErrEmptyPayload = errors.New("empty payload")
