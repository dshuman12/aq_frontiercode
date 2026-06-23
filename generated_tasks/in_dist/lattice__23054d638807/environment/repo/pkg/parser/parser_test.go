package parser

import (
	"errors"
	"path/filepath"
	"strings"
	"testing"
)

func TestFind_FindsConfigInCwd(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "lattice.yaml"), "version: 1\nname: x\ntasks: {}\n")

	got, format, err := Find(dir)
	if err != nil {
		t.Fatalf("Find: unexpected error: %v", err)
	}
	if filepath.Base(got) != "lattice.yaml" {
		t.Errorf("expected to find lattice.yaml, got %s", got)
	}
	if format != FormatYAML {
		t.Errorf("expected FormatYAML, got %v", format)
	}
}

func TestFind_WalksUp(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "lattice.toml"), "version = \"1\"\nname = \"x\"\n")
	deep := filepath.Join(root, "a", "b", "c")
	if err := mkdirAll(deep); err != nil {
		t.Fatal(err)
	}
	got, format, err := Find(deep)
	if err != nil {
		t.Fatalf("Find from deep dir: %v", err)
	}
	if filepath.Base(got) != "lattice.toml" {
		t.Errorf("expected to find lattice.toml, got %s", got)
	}
	if format != FormatTOML {
		t.Errorf("expected FormatTOML, got %v", format)
	}
}

func TestFind_NoConfig(t *testing.T) {
	dir := t.TempDir()
	_, _, err := Find(dir)
	if !errors.Is(err, ErrNoConfig) {
		t.Errorf("expected ErrNoConfig, got %v", err)
	}
}

func TestLoad_BasicYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "lattice.yaml")
	writeFile(t, path, `
version: 1
name: demo
tasks:
  build:
    cmd: "go build"
    inputs: ["**/*.go"]
    outputs: ["bin/demo"]
  test:
    cmd: "go test ./..."
    deps: [build]
`)
	project, err := Load(path, LoadOptions{})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if project.Name != "demo" {
		t.Errorf("name: got %q, want %q", project.Name, "demo")
	}
	if len(project.Tasks) != 2 {
		t.Errorf("expected 2 tasks, got %d", len(project.Tasks))
	}
	if project.Tasks["build"].Command != "go build" {
		t.Errorf("build.cmd: got %q", project.Tasks["build"].Command)
	}
	if project.Tasks["test"].Deps[0] != "build" {
		t.Errorf("test.deps[0]: got %q", project.Tasks["test"].Deps[0])
	}
}

func TestLoad_AppliesDefaults(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "lattice.yaml")
	writeFile(t, path, `
version: 1
name: x
defaults:
  timeout: 30s
tasks:
  a:
    cmd: "echo a"
  b:
    cmd: "echo b"
    timeout: 60s
`)
	p, err := Load(path, LoadOptions{})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if p.Tasks["a"].Timeout.String() != "30s" {
		t.Errorf("a should inherit defaults.timeout=30s, got %v", p.Tasks["a"].Timeout)
	}
	if p.Tasks["b"].Timeout.String() != "1m0s" {
		t.Errorf("b's own 60s should win, got %v", p.Tasks["b"].Timeout)
	}
}

func TestLoad_DanglingDepIsValidationError(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "lattice.yaml")
	writeFile(t, path, `
version: 1
name: x
tasks:
  build:
    cmd: "go build"
    deps: [nonexistent]
`)
	_, err := Load(path, LoadOptions{})
	if err == nil {
		t.Fatal("expected validation error for dangling dep, got nil")
	}
	if !IsValidationError(err) {
		t.Errorf("expected ValidationError, got %T: %v", err, err)
	}
	if !strings.Contains(err.Error(), "nonexistent") {
		t.Errorf("expected error to mention 'nonexistent', got %q", err.Error())
	}
}

func TestLoad_VersionMustBe1(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "lattice.yaml")
	writeFile(t, path, `
version: 2
name: x
tasks:
  a: { cmd: "echo a" }
`)
	_, err := Load(path, LoadOptions{})
	if err == nil {
		t.Fatal("expected version error, got nil")
	}
	if !strings.Contains(err.Error(), "version") {
		t.Errorf("expected version error, got %q", err.Error())
	}
}

func TestLoad_TaskWithoutCmdOrDeps(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "lattice.yaml")
	writeFile(t, path, `
version: 1
name: x
tasks:
  empty: {}
`)
	_, err := Load(path, LoadOptions{})
	if err == nil {
		t.Fatal("expected error: task with no cmd and no deps")
	}
}

func TestLoad_DefaultsCacheDir(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "lattice.yaml")
	writeFile(t, path, `
version: 1
name: x
tasks:
  a: { cmd: "echo a" }
`)
	p, err := Load(path, LoadOptions{})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	expected := filepath.Join(dir, ".lattice", "cache")
	if p.CacheDir != expected {
		t.Errorf("CacheDir: got %q, want %q", p.CacheDir, expected)
	}
}

func TestLoad_TOML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "lattice.toml")
	writeFile(t, path, `
version = "1"
name = "demo"

[tasks.build]
cmd = "go build"

[tasks.test]
cmd = "go test ./..."
deps = ["build"]
`)
	p, err := Load(path, LoadOptions{})
	if err != nil {
		t.Fatalf("Load TOML: %v", err)
	}
	if p.Name != "demo" {
		t.Errorf("TOML name: got %q", p.Name)
	}
	if len(p.Tasks) != 2 {
		t.Errorf("TOML: expected 2 tasks, got %d", len(p.Tasks))
	}
}

func TestExpand_Basic(t *testing.T) {
	env := map[string]string{
		"FOO":  "bar",
		"USER": "alice",
	}
	cases := []struct {
		in, want string
		wantErr  bool
	}{
		{"$FOO", "bar", false},
		{"${FOO}", "bar", false},
		{"prefix-${FOO}-suffix", "prefix-bar-suffix", false},
		{"$$literal", "$literal", false},
		{"${MISSING:-default}", "default", false},
		{"${USER}@host", "alice@host", false},
		{"no vars here", "no vars here", false},
		{"${MISSING}", "", true},
	}
	for _, tc := range cases {
		got, err := expand(tc.in, env)
		if tc.wantErr {
			if err == nil {
				t.Errorf("expand(%q): expected error, got nil", tc.in)
			}
			continue
		}
		if err != nil {
			t.Errorf("expand(%q): unexpected error: %v", tc.in, err)
			continue
		}
		if got != tc.want {
			t.Errorf("expand(%q): got %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestNormalize_TrimsCommand(t *testing.T) {
	p := mockProject("\n  go build\n")
	normalize(p)
	if p.Tasks["a"].Command != "go build" {
		t.Errorf("Command not trimmed: got %q", p.Tasks["a"].Command)
	}
}
