// Package fschema validates structured field schemas at runtime.
package fschema

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/dleblanc/kindling/internal/record"
)

// Type tags supported field kinds.
type Type int

const (
	TypeString Type = iota
	TypeInt
	TypeFloat
	TypeBool
)

// Field describes one expected field.
type Field struct {
	Name     string
	Type     Type
	Required bool
}

// Schema is a list of fields.
type Schema struct {
	Fields []Field
}

// New returns an empty schema.
func New() *Schema { return &Schema{} }

// Add adds a field to the schema.
func (s *Schema) Add(f Field) *Schema {
	s.Fields = append(s.Fields, f)
	return s
}

// Validate returns nil when r matches s.
func (s *Schema) Validate(r *record.Record) error {
	for _, f := range s.Fields {
		v, present := r.Fields[f.Name]
		if !present {
			if f.Required {
				return fmt.Errorf("fschema: required field %q missing", f.Name)
			}
			continue
		}
		if err := checkType(f.Type, v); err != nil {
			return fmt.Errorf("fschema: %s: %w", f.Name, err)
		}
	}
	return nil
}

func checkType(t Type, v string) error {
	switch t {
	case TypeString:
		return nil
	case TypeInt:
		if _, err := strconv.ParseInt(v, 10, 64); err != nil {
			return errors.New("not an integer")
		}
	case TypeFloat:
		if _, err := strconv.ParseFloat(v, 64); err != nil {
			return errors.New("not a float")
		}
	case TypeBool:
		switch v {
		case "true", "false", "1", "0":
		default:
			return errors.New("not a bool")
		}
	}
	return nil
}

// ValidateAll returns the first encountered error across recs.
func (s *Schema) ValidateAll(recs []*record.Record) error {
	for i, r := range recs {
		if err := s.Validate(r); err != nil {
			return fmt.Errorf("record %d: %w", i, err)
		}
	}
	return nil
}
