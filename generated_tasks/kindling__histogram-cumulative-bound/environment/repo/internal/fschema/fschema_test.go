package fschema_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/fschema"
	"github.com/dleblanc/kindling/internal/record"
)

func TestEmptySchemaPasses(t *testing.T) {
	r := &record.Record{Fields: map[string]string{"x": "1"}}
	if err := fschema.New().Validate(r); err != nil {
		t.Errorf("got %v", err)
	}
}

func TestRequiredField(t *testing.T) {
	s := fschema.New().Add(fschema.Field{Name: "user_id", Type: fschema.TypeInt, Required: true})
	r := &record.Record{Fields: map[string]string{}}
	if err := s.Validate(r); err == nil {
		t.Error("expected error")
	}
}

func TestIntFieldValid(t *testing.T) {
	s := fschema.New().Add(fschema.Field{Name: "n", Type: fschema.TypeInt, Required: true})
	r := &record.Record{Fields: map[string]string{"n": "42"}}
	if err := s.Validate(r); err != nil {
		t.Errorf("got %v", err)
	}
}

func TestIntFieldInvalid(t *testing.T) {
	s := fschema.New().Add(fschema.Field{Name: "n", Type: fschema.TypeInt, Required: true})
	r := &record.Record{Fields: map[string]string{"n": "abc"}}
	if err := s.Validate(r); err == nil {
		t.Error("expected error")
	}
}

func TestFloatField(t *testing.T) {
	s := fschema.New().Add(fschema.Field{Name: "x", Type: fschema.TypeFloat})
	r := &record.Record{Fields: map[string]string{"x": "3.14"}}
	if err := s.Validate(r); err != nil {
		t.Errorf("got %v", err)
	}
}

func TestBoolField(t *testing.T) {
	s := fschema.New().Add(fschema.Field{Name: "ok", Type: fschema.TypeBool})
	for _, v := range []string{"true", "false", "1", "0"} {
		r := &record.Record{Fields: map[string]string{"ok": v}}
		if err := s.Validate(r); err != nil {
			t.Errorf("%q: %v", v, err)
		}
	}
}

func TestBoolFieldInvalid(t *testing.T) {
	s := fschema.New().Add(fschema.Field{Name: "ok", Type: fschema.TypeBool})
	r := &record.Record{Fields: map[string]string{"ok": "maybe"}}
	if err := s.Validate(r); err == nil {
		t.Error("expected error")
	}
}

func TestValidateAll(t *testing.T) {
	s := fschema.New().Add(fschema.Field{Name: "n", Type: fschema.TypeInt, Required: true})
	good := &record.Record{Fields: map[string]string{"n": "1"}}
	bad := &record.Record{Fields: map[string]string{"n": "abc"}}
	if err := s.ValidateAll([]*record.Record{good, good}); err != nil {
		t.Errorf("got %v", err)
	}
	if err := s.ValidateAll([]*record.Record{good, bad}); err == nil {
		t.Error("expected error")
	}
}
