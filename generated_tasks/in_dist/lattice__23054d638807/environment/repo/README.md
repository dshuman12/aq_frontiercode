# Lattice

Lattice is a content-hashed parallel task runner for polyglot
codebases. You declare your build/test/lint/codegen tasks in a YAML
or TOML file, and Lattice figures out the dependency graph, runs
tasks in parallel up to N workers, and skips work whose inputs
haven't changed since the last run.

It is a personal project. The motivation: every team I've worked
with eventually grows a `Makefile`, `package.json` script bag, and
`scripts/` directory that disagree about what runs first, what's
cached, and how environment variables should layer. Lattice is one
opinionated answer.

## Installation

```sh
go install github.com/manojgowda/lattice/cmd/lattice@latest
```

Or build from source:

```sh
git clone <this repo>
cd lattice
go build -o bin/lattice ./cmd/lattice
./bin/lattice --help
```

Lattice has no runtime dependencies beyond a Unix-like shell
(`/bin/sh`). Every commit is tested on Linux and macOS; Windows
support is best-effort and contributions are welcome.

## Quickstart

Create a config:

```sh
lattice init
```

Edit the generated `lattice.yaml` to match your project. Then:

```sh
lattice list                  # show all tasks
lattice run build             # run "build" and its dependencies
lattice run test --force      # ignore cache, re-run everything
lattice graph --format dot    # emit a Graphviz DOT graph
lattice watch test            # re-run tests on every file change
lattice config validate       # parse-check without running
```

## Configuration

A minimal `lattice.yaml`:

```yaml
version: 1
name: my-project

tasks:
  build:
    inputs: ["**/*.go", "go.mod"]
    outputs: ["bin/app"]
    cmd: "go build -o bin/app ./..."
  test:
    deps: [build]
    inputs: ["**/*.go"]
    cmd: "go test ./..."
```

See `examples/lattice.yaml` for a more complete reference. The
`docs/` directory has deep-dives on caching, environment-variable
precedence, and the plugin contract.

## How caching works

Lattice computes a stable hash from the union of:

- Task command (after `${VAR}` interpolation)
- Sorted task-level environment
- Hash of every input file matched by `Inputs[]` globs
- Hash of every input glob string (so changing the glob invalidates
  the cache even when the matched file set is the same)

A hit restores `Outputs[]` from a tarball stashed in the cache
directory, replays the captured stdout/stderr, and returns the
recorded exit code. A miss runs the task normally and writes the
result back to the cache on success. Failed tasks are not cached;
re-running them re-executes the command.

## Environment-variable precedence

Lattice composes environments in layers. Later layers win:

1. Process environment (`os.Environ()`)
2. Project-level `env:` block in `lattice.yaml`
3. `.env` files referenced by `env_files:`, in declaration order
4. Task-level `env:` block
5. CLI overrides via `-e KEY=VALUE`

Run `lattice env --explain FOO` to see which layer set `FOO` and
which layers were overridden. The full precedence rules are
documented in `docs/env-precedence.md`.

## Contributing

This is a personal project — drive-by patches welcome but please open
an issue first if your change touches the cache key, scheduler
contract, or plugin types. Anything beyond ~10 lines should come with
a test.

```sh
lattice run test                    # the recommended dev loop
lattice run lint                    # vet + golangci-lint
lattice run fmt                     # gofmt + goimports
```

## License

MIT. See `LICENSE`.
