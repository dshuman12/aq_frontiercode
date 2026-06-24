// Package otlp emits records in an OpenTelemetry-shaped JSON format.
//
// The wire format follows the OTLP/JSON resource_logs schema closely
// enough that downstream collectors can re-shape it without writing a
// dedicated parser. We deliberately stop short of full OTLP support;
// this package is for human/operator consumption and dashboard previews,
// not for production pipelines.
package otlp

import (
	"encoding/json"
	"errors"
	"io"
	"sort"
	"time"
)

// Severity mirrors OTLP severity numbers.
type Severity int

const (
	SeverityUnspecified Severity = 0
	SeverityTrace       Severity = 1
	SeverityDebug       Severity = 5
	SeverityInfo        Severity = 9
	SeverityWarn        Severity = 13
	SeverityError       Severity = 17
	SeverityFatal       Severity = 21
)

// SeverityFromText maps "info"/"warn"/... to a Severity.
func SeverityFromText(s string) Severity {
	switch s {
	case "trace":
		return SeverityTrace
	case "debug":
		return SeverityDebug
	case "info":
		return SeverityInfo
	case "warn", "warning":
		return SeverityWarn
	case "error", "err":
		return SeverityError
	case "fatal", "panic":
		return SeverityFatal
	}
	return SeverityUnspecified
}

// LogRecord is one structured log entry.
type LogRecord struct {
	Time     time.Time
	Severity Severity
	Body     string
	Attrs    map[string]string
	Trace    string
	Span     string
}

// Resource describes the producer.
type Resource struct {
	ServiceName string
	Hostname    string
	Attrs       map[string]string
}

// Batch is a complete OTLP-shaped payload.
type Batch struct {
	Resource Resource
	Scope    string
	Records  []LogRecord
}

// MarshalJSON renders b as OTLP-style JSON.
func (b Batch) MarshalJSON() ([]byte, error) {
	if b.Scope == "" {
		b.Scope = "kindling"
	}
	type kv struct {
		Key   string `json:"key"`
		Value any    `json:"value"`
	}
	resAttrs := []kv{
		{Key: "service.name", Value: b.Resource.ServiceName},
		{Key: "host.name", Value: b.Resource.Hostname},
	}
	keys := make([]string, 0, len(b.Resource.Attrs))
	for k := range b.Resource.Attrs {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		resAttrs = append(resAttrs, kv{Key: k, Value: b.Resource.Attrs[k]})
	}

	records := make([]map[string]any, len(b.Records))
	for i, r := range b.Records {
		attrs := make([]kv, 0, len(r.Attrs))
		ks := make([]string, 0, len(r.Attrs))
		for k := range r.Attrs {
			ks = append(ks, k)
		}
		sort.Strings(ks)
		for _, k := range ks {
			attrs = append(attrs, kv{Key: k, Value: r.Attrs[k]})
		}
		records[i] = map[string]any{
			"timeUnixNano":   r.Time.UnixNano(),
			"severityNumber": int(r.Severity),
			"body":           map[string]string{"stringValue": r.Body},
			"attributes":     attrs,
			"traceId":        r.Trace,
			"spanId":         r.Span,
		}
	}

	envelope := map[string]any{
		"resourceLogs": []map[string]any{{
			"resource": map[string]any{"attributes": resAttrs},
			"scopeLogs": []map[string]any{{
				"scope":      map[string]any{"name": b.Scope},
				"logRecords": records,
			}},
		}},
	}
	return json.Marshal(envelope)
}

// WriteBatch writes b as OTLP JSON to w.
func WriteBatch(w io.Writer, b Batch) error {
	if w == nil {
		return errors.New("otlp: nil writer")
	}
	data, err := b.MarshalJSON()
	if err != nil {
		return err
	}
	_, err = w.Write(data)
	return err
}
