package types

import (
	"errors"
	"testing"
)

func TestIDStringers(t *testing.T) {
	if WorkflowID("w").String() != "w" {
		t.Fatal("WorkflowID.String")
	}
	if RunID("r").String() != "r" {
		t.Fatal("RunID.String")
	}
	if TaskQueue("q").String() != "q" {
		t.Fatal("TaskQueue.String")
	}
	if Namespace("n").String() != "n" {
		t.Fatal("Namespace.String")
	}
}

func TestFailureErrorAndNil(t *testing.T) {
	var f *Failure
	if f.Error() != "<nil failure>" {
		t.Fatalf("nil failure: %q", f.Error())
	}
	root := &Failure{Type: FailureApplication, Message: "boom"}
	if root.Error() != "application: boom" {
		t.Fatalf("error string: %q", root.Error())
	}
	wrap := &Failure{Type: FailureApplication, Message: "wrap", Cause: root}
	if !errors.Is(wrap, root) {
		t.Fatal("errors.Is should follow Cause")
	}
	if (*Failure)(nil).Unwrap() != nil {
		t.Fatal("nil failure Unwrap should return nil")
	}
	if root.Unwrap() != nil {
		t.Fatal("Unwrap with no cause should return nil")
	}
}

func TestPayloadDecodeUnknownEncoding(t *testing.T) {
	p := Payload{Encoding: "weird/format", Data: []byte("x")}
	var out any
	if err := p.Decode(&out); err == nil {
		t.Fatal("expected error on unknown encoding")
	}
}
