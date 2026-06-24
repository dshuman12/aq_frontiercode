# Observability

## Logs

The structured logger emits one line per event to stderr. Two formats:

- `text` (default) -- human-readable.
- `json` -- one JSON object per line, suitable for ingestion into Loki etc.

Switch with `KINDLING_LOG_FORMAT=json` and `KINDLING_LOG_LEVEL=info|debug|warn|error`.

JSON record schema:

| Field   | Type   | Notes                                       |
| ------- | ------ | ------------------------------------------- |
| `ts`    | string | ISO 8601 timestamp in UTC.                  |
| `level` | string | One of debug/info/warn/error.               |
| `msg`   | string | Human-readable message.                     |
| ...     | misc   | Additional structured fields per call site. |

## Metrics

Set `KINDLING_METRICS_BIND=host:port` to expose `/metrics`.

| Metric                          | Type    | Labels   | Notes                                    |
| ------------------------------- | ------- | -------- | ---------------------------------------- |
| `kindling_records_total`        | counter |          | Records processed since startup.         |
| `kindling_imports_total`        | counter | `source` | Records imported, by source.             |
| `kindling_lock_wait_seconds`    | gauge   |          | Most recent advisory-lock wait time.     |
| `kindling_schema_version`       | gauge   |          | Active manifest schema version.          |
| `kindling_build_info`           | gauge   | `version`| Always 1; the version label is the payload. |

## Recommended alerts

```yaml
groups:
  - name: kindling
    rules:
      - alert: KindlingSchemaMismatch
        expr: kindling_schema_version != 3
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: "kindling schema version drifted"
```
