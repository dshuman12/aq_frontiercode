# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `kindling healthcheck` for probe-friendly liveness checks.
- `kindling config check` validates env vars before service start.
- `kindling serve` exposes optional Prometheus metrics endpoint.
- Structured JSON log output via `KINDLING_LOG_FORMAT=json`.
- Reference deployment artifacts under `deploy/`.

### Changed
- Container runtime user is `kindler` at uid 1110.

### Security
- Documented disclosure process in `SECURITY.md`.
- Added CodeQL workflow against the Go source.
- Added Trivy scan against the published container image.

## [0.6.0] - 2026-04-22

### Added
- Time-bucket aggregation (`kindling bucket`).
- Distinct + fields commands.
- HTML / Markdown / YAML render adapters.

### Changed
- Manifest schema bumped to v3 (per-entry algorithm column).

## [0.5.0] - 2026-02-11

### Added
- Index inverted-list backed query engine.
- Group-by report.
- Inline regex predicate.

## [0.4.0] - 2025-12-03

### Added
- Initial query language with AND/OR composition.
- JSONL + plain log loaders.

## [0.3.0] - 2025-10-21

### Added
- Public API: parse + query + records + store packages.

## [0.2.0] - 2025-09-12

### Added
- Initial public release.
- CLI dispatcher + scan command.
