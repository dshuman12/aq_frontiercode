package main

import "testing"

func TestCoreVersion_nonEmpty(t *testing.T) {
	if CoreVersion == "" {
		t.Fatal("CoreVersion must be set for shells / C API")
	}
}
