package template_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/template"
)

func TestText(t *testing.T) {
	got, err := template.Render("hello", nil)
	if err != nil || got != "hello" {
		t.Errorf("got %q err=%v", got, err)
	}
}

func TestVarSubst(t *testing.T) {
	vars := template.Vars{"name": {Kind: template.KStr, Str: "world"}}
	got, _ := template.Render("hello {{name}}", vars)
	if got != "hello world" {
		t.Errorf("got %q", got)
	}
}

func TestSectionTruthy(t *testing.T) {
	vars := template.Vars{"flag": {Kind: template.KBool, Bool: true}}
	got, _ := template.Render("x{{#flag}}y{{/flag}}z", vars)
	if got != "xyz" {
		t.Errorf("got %q", got)
	}
}

func TestSectionFalsy(t *testing.T) {
	vars := template.Vars{"flag": {Kind: template.KBool, Bool: false}}
	got, _ := template.Render("x{{#flag}}y{{/flag}}z", vars)
	if got != "xz" {
		t.Errorf("got %q", got)
	}
}

func TestList(t *testing.T) {
	items := []template.Vars{
		{"n": {Kind: template.KStr, Str: "a"}},
		{"n": {Kind: template.KStr, Str: "b"}},
	}
	vars := template.Vars{"items": {Kind: template.KList, List: items}}
	got, _ := template.Render("{{#items}}-{{n}}{{/items}}", vars)
	if got != "-a-b" {
		t.Errorf("got %q", got)
	}
}

func TestComment(t *testing.T) {
	got, _ := template.Render("a{{! comment }}b", nil)
	if got != "ab" {
		t.Errorf("got %q", got)
	}
}

func TestUnterminatedHandlebar(t *testing.T) {
	if _, err := template.Render("hello {{name", nil); err == nil {
		t.Error("expected error")
	}
}

func TestUnclosedSection(t *testing.T) {
	vars := template.Vars{"flag": {Kind: template.KBool, Bool: true}}
	if _, err := template.Render("{{#flag}}body", vars); err == nil {
		t.Error("expected error")
	}
}

func TestNestedSections(t *testing.T) {
	items := []template.Vars{
		{"inner": {Kind: template.KBool, Bool: true}},
	}
	vars := template.Vars{"outer": {Kind: template.KList, List: items}}
	got, _ := template.Render("{{#outer}}-{{#inner}}!{{/inner}}{{/outer}}", vars)
	if got != "-!" {
		t.Errorf("got %q", got)
	}
}
