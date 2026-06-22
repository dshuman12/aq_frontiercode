# Task description

HealthBridge's validation entrypoints need to cover the full monorepo operational surface rather than only pytest. Update the CI and local verification workflow so pull requests exercise Python code, npm workspaces, the Go SDK, Helm chart metadata, database schema availability, and Docker build inputs. The repository root should expose npm workspace metadata for the existing frontend apps and Makefile targets for test, lint, frontend test/build, and full verification. `scripts/verify_repository.py` should remain the canonical verify command: it should compile Python sources, run pytest, validate JSON and ordinary YAML files while avoiding Helm templates, run service entrypoints, verify required project directories and frontend lockfiles, run frontend tests/builds from the root workspace, and run Go, Helm, database, and Docker checks when the relevant tools are available. If optional tools such as Docker, Go, Helm, or psql are absent, print clear skip messages instead of failing the whole verification run. The Go SDK also needs to be a real module with a small regression test so `go test ./...` has meaningful coverage. Keep application behavior, healthcare schemas, and service code unchanged unless a verification check genuinely requires a narrow supporting adjustment.

# Test guidelines

Run `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` from the repository root before submitting. This is the visible validation command for this task and should require the root lockfile, install workspace dependencies, and execute the frontend app test scripts.

Also run the targeted commands that match the areas you touch: `make test` for Python tests, `make lint` for compile checks, `make verify` for the full repository verifier, `npm run build` for frontend build coverage, and `go test ./...` from `packages/sdk-go` for the Go SDK. Add or update tests when the change introduces a new executable path. Keep a Go SDK test that proves the package can be discovered and exercised by the Go toolchain. Skipped optional checks should be explicit and limited to tools that may not exist in every developer environment.

# Lint guidelines

Use the repository's local commands instead of ad hoc scripts. Python sources should compile with `python3 -m compileall -q services packages scripts`, JSON files should parse, and YAML validation should skip Helm templates while still checking non-template YAML. If npm dependency metadata changes, update the root lockfile through npm so workspace installs remain reproducible.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Keep the patch focused on repository verification, CI wiring, and the minimal Go/npm workspace support needed for those checks. Avoid broad formatting sweeps, application feature rewrites, schema redesigns, or committed build output. Verification helpers should be straightforward, readable Python with clear command logging and deterministic path checks.
