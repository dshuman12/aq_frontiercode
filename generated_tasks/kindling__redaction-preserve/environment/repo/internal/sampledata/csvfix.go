package sampledata

import _ "embed"

//go:embed events.csv
var rawEventsCSV string

// EventsCSV returns the embedded events CSV.
func EventsCSV() string { return rawEventsCSV }
