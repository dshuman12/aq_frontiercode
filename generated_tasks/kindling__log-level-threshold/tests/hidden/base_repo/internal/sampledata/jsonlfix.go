package sampledata

import _ "embed"

//go:embed events.jsonl
var rawEventsJSONL string

//go:embed audit.jsonl
var rawAuditJSONL string

//go:embed api.jsonl
var rawAPIJSONL string

// EventsJSONL returns the embedded events JSONL.
func EventsJSONL() string { return rawEventsJSONL }

// AuditJSONL returns the embedded audit JSONL.
func AuditJSONL() string { return rawAuditJSONL }

// APIJSONL returns the embedded API JSONL.
func APIJSONL() string { return rawAPIJSONL }
