# kindling

> Self-hosted structured log analyzer for small operations.

`kindling` is a single-binary CLI tool for indexing JSONL or plain
text log files and answering queries (filter, group, time-bucket,
distinct, count) without spinning up a heavier observability stack.
It targets operators who already have logs sitting on disk and need
to slice them quickly.

[![CI](https://img.shields.io/badge/CI-passing-success)]()
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Go](https://img.shields.io/badge/go-%E2%89%A51.22-00ADD8)](go.mod)

---

## Why kindling

Most log analysis tools fall into one of two camps:

1. **Streaming pipelines** (Loki, Vector, etc.) -- fast, scalable,
   but require a long-running process and external storage.
2. **Ad-hoc grep / awk** -- light but doesn't scale past a few MiB
   and offers no structured semantics.

`kindling` sits between: it understands JSONL records natively,
indexes them in memory for fast queries, and writes nothing back to
disk by default. A single static binary; zero external dependencies.

## Quick start

```bash
go build -o bin/kindling ./cmd/kindling
./bin/kindling --version
./bin/kindling --help

# Search
./bin/kindling search 'level=error' /var/log/myapp.log

# Group
./bin/kindling group --by service /var/log/myapp.log

# Time-bucket
./bin/kindling bucket --window 1h /var/log/myapp.log
```

## Container

```bash
docker pull ghcr.io/kindling-tools/kindling:0.6.0
docker run --rm -v /var/log:/data:ro \
  ghcr.io/kindling-tools/kindling:0.6.0 search 'level=error' /data/myapp.log
```

## Configuration

Driven by environment variables with no config file:

| Variable                  | Default              | Purpose                            |
| ------------------------- | -------------------- | ---------------------------------- |
| `KINDLING_DATA_DIR`       | `~/.local/share/kindling` | Manifest archive root.       |
| `KINDLING_CACHE_DIR`      | `~/.cache/kindling`  | Idempotent cache directory.        |
| `KINDLING_LOG_FORMAT`     | `text`               | `text` or `json`.                  |
| `KINDLING_LOG_LEVEL`      | `info`               | `debug`/`info`/`warn`/`error`.     |
| `KINDLING_HTTP_BIND`      | _(unset)_            | Bind address for `kindling serve`. |
| `KINDLING_METRICS_BIND`   | _(unset)_            | Prometheus metrics bind address.   |
| `TZ`                      | `UTC`                | Time zone for renders.             |

Validate with `kindling config check`.

## Operations

| Command                | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `kindling scan`        | Load files, report record count.              |
| `kindling search`      | Filter records using the query language.      |
| `kindling group`       | Group records by a field, sorted by count.    |
| `kindling bucket`      | Aggregate records into time buckets.          |
| `kindling head/tail`   | First / last N records.                       |
| `kindling count`       | Count records.                                |
| `kindling fields`      | List distinct field names.                    |
| `kindling distinct`    | List distinct values for one field.           |
| `kindling validate`    | Verify a log file parses cleanly.             |
| `kindling export`      | Convert between text/json/csv.                |
| `kindling serve`       | Run an HTTP metrics endpoint.                 |
| `kindling healthcheck` | Probe-friendly health endpoint.               |
| `kindling config`      | `show` or `check` the active configuration.   |
| `kindling metrics`     | Print Prometheus-format metrics.              |
| `kindling version`     | Print version.                                |

## Query language

```
level=info
level=info AND service=auth
service=auth OR service=users
msg:slow                  # contains
service~^(auth|users)$    # regex
size>1024                 # numeric
```

## Compatibility

| Version | Status      | Go minimum | Maintained until |
| ------- | ----------- | ---------- | ---------------- |
| 0.6.x   | Current     | 1.22       | 2027-05          |
| 0.5.x   | Maintenance | 1.21       | 2026-11          |

## License

Apache License 2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
