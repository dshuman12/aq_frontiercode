package env

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/manojgowda/lattice/pkg/types"
)

func TestFromEnvFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	content := `# This is a comment
FOO=bar
BAZ="quoted value"
QUX='single quoted'
export EXPORTED=yes

EMPTY=
`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	layer, err := FromEnvFile(path)
	if err != nil {
		t.Fatalf("FromEnvFile: %v", err)
	}
	want := map[string]string{
		"FOO":      "bar",
		"BAZ":      "quoted value",
		"QUX":      "single quoted",
		"EXPORTED": "yes",
		"EMPTY":    "",
	}
	if !reflect.DeepEqual(layer.Vars, want) {
		t.Errorf("FromEnvFile vars: got %v, want %v", layer.Vars, want)
	}
	if layer.Source != types.EnvSourceEnvFile {
		t.Errorf("Source: got %v, want %v", layer.Source, types.EnvSourceEnvFile)
	}
}

func TestFromEnvFile_MalformedLine(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	if err := os.WriteFile(path, []byte("notavar\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := FromEnvFile(path)
	if err == nil {
		t.Fatal("expected error on malformed line, got nil")
	}
}

func TestResolve_Layering(t *testing.T) {
	layers := []types.EnvLayer{
		{Source: types.EnvSourceOS, Vars: map[string]string{
			"GREETING": "hi",
			"PATH":     "/usr/bin",
		}},
		{Source: types.EnvSourceProject, Vars: map[string]string{
			"GREETING": "hello",
			"PORT":     "8080",
		}},
		{Source: types.EnvSourceTask, Vars: map[string]string{
			"PORT": "9090",
		}},
		{Source: types.EnvSourceOverride, Vars: map[string]string{
			"GREETING": "hey",
		}},
	}
	got := Resolve(layers)
	want := map[string]string{
		"GREETING": "hey",      // override wins
		"PORT":     "9090",     // task over project
		"PATH":     "/usr/bin", // os passes through
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Resolve: got %v, want %v", got, want)
	}
}

func TestExplain(t *testing.T) {
	layers := []types.EnvLayer{
		{Source: types.EnvSourceOS, Vars: map[string]string{"FOO": "1"}},
		{Source: types.EnvSourceProject, Vars: map[string]string{"FOO": "2"}},
		{Source: types.EnvSourceTask, Vars: map[string]string{"BAR": "3"}},
	}
	prov := Explain("FOO", layers)
	if len(prov) != 2 {
		t.Errorf("Explain FOO: expected 2 entries, got %d", len(prov))
	}
	if prov[0].Source != types.EnvSourceOS || prov[0].Value != "1" {
		t.Errorf("Explain[0]: got %+v", prov[0])
	}
	if prov[1].Source != types.EnvSourceProject || prov[1].Value != "2" {
		t.Errorf("Explain[1]: got %+v", prov[1])
	}
}

func TestBuild_ProjectAndTaskLayered(t *testing.T) {
	dir := t.TempDir()
	envFile := filepath.Join(dir, ".env")
	if err := os.WriteFile(envFile, []byte("FROM_FILE=yes\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	project := &types.Project{
		Root:     dir,
		EnvFiles: []string{".env"},
		Env:      map[string]string{"PROJ": "p"},
	}
	task := &types.Task{
		Name: "build",
		Env:  map[string]string{"TASK": "t"},
	}

	noOSEnv := false
	resolved, layers, err := Build(BuildOptions{
		Project:      project,
		Task:         task,
		IncludeOSEnv: &noOSEnv,
	})
	if err != nil {
		t.Fatal(err)
	}
	if resolved["PROJ"] != "p" || resolved["TASK"] != "t" || resolved["FROM_FILE"] != "yes" {
		t.Errorf("resolved: got %v", resolved)
	}
	// Ordering: Project, EnvFile, Task (no OS, no Override)
	if len(layers) != 4 {
		t.Errorf("expected 4 layers (Project, EnvFile, Task, empty Override), got %d", len(layers))
	}
}

func TestStripQuotes(t *testing.T) {
	cases := map[string]string{
		`"hello"`:        "hello",
		`'world'`:        "world",
		`unquoted`:       "unquoted",
		`"mixed'`:        `"mixed'`, // mismatched stays
		`""`:             "",
		`"escaped\""`:    `escaped\"`,
	}
	for in, want := range cases {
		if got := stripQuotes(in); got != want {
			t.Errorf("stripQuotes(%q) = %q; want %q", in, got, want)
		}
	}
}
