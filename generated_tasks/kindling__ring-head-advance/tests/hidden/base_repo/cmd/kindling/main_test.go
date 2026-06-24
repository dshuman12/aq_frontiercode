package main

import "testing"

// TestMainPackagePresent is a placeholder smoke test so the main
// package carries at least one test, satisfying coverage tooling that
// checks every package has a test file.
func TestMainPackagePresent(t *testing.T) {
	// Nothing to assert; the real CLI logic lives in internal/cli.
	// This test merely ensures `go test ./...` covers package main.
}
