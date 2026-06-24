package sampledata

import _ "embed"

//go:embed runbook.md
var rawRunbook string

//go:embed architecture.md
var rawArchitecture string

// Runbook returns the embedded runbook markdown.
func Runbook() string { return rawRunbook }

// Architecture returns the embedded architecture doc markdown.
func Architecture() string { return rawArchitecture }
