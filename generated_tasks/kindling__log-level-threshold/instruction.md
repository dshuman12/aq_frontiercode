# Task description

The leveled logger in `internal/log/log.go` filters messages against its configured threshold level, but the comparison is off by one: it only emits messages strictly *above* the threshold and drops messages logged *at* the threshold. For example, with the threshold set to `Warn`, `Warn` messages are silently suppressed and only `Error` appears; with the threshold at `Info`, `Info` messages never show.

The intended semantics, matching the `KINDLING_LOG_LEVEL` documentation in the README (`debug`/`info`/`warn`/`error`), are that a message is emitted when its level is greater than *or equal to* the configured threshold. Fix the level filter so that a message whose level equals the threshold is emitted, while messages below the threshold remain suppressed.

Keep the existing logger constructor, level constants, and method signatures unchanged; only the comparison/gating logic should change. Output formatting (`text` vs `json`), field handling, and the ordering of emitted lines must stay identical. Do not adjust unrelated packages or the default level.

# Test guidelines

Run `go test ./internal/log/...` to validate. Tests live in `internal/log`. Cover each threshold setting and confirm that messages exactly at the threshold are emitted, messages above it are emitted, and messages below it are suppressed — including the boundary cases at the lowest and highest levels. Add or extend cases so this off-by-one cannot regress.

# Lint guidelines

Run `go vet ./internal/log/...` and ensure the package builds with `go build ./...`. Code must be `gofmt`-clean.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from main or any other branch.
