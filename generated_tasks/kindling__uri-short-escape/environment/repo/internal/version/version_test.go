package version_test

import (
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/version"
)

func TestVersionShape(t *testing.T) {
	if version.Version == "" {
		t.Fatal("Version should be non-empty")
	}
	if !strings.Contains(version.Version, ".") {
		t.Fatalf("Version %q should look semver-ish", version.Version)
	}
	if version.Program == "" {
		t.Fatal("Program should be non-empty")
	}
	if version.SchemaVersion <= 0 {
		t.Fatalf("SchemaVersion should be positive, got %d", version.SchemaVersion)
	}
}
