# Tasks

A task is the unit of work Lattice schedules. You define tasks in
`lattice.yaml` (or `lattice.toml`); Lattice resolves dependencies,
hashes inputs, and decides what to run.

## Anatomy

```yaml
build:
  desc: "Build the Go binary."           # shown in `lattice list`
  deps: [generate]                        # tasks that must run first
  inputs: ["**/*.go", "go.mod"]           # files whose content is hashed
  outputs: ["bin/app"]                    # files preserved in the cache
  cmd: "go build -o bin/app ./..."        # the shell command to run
  env:                                    # task-level env layer
    CGO_ENABLED: "0"
  dir: services/api                       # working directory; defaults to project root
  timeout: 5m                             # wall-clock budget
  cache: true                             # toggles the cache subsystem
```

All fields except `cmd` (or `deps`, when the task is purely a meta-target)
are optional.

## Names

Task names allow letters, digits, and the punctuation `-`, `_`, `:`,
`.`. Colons convey namespace, not hierarchy: `lint:go` and `lint:rust`
are sibling tasks, not "rust under go". Lattice doesn't impose any
parent/child semantics on names — it's free-form documentation.

## Meta-targets

A task with `deps:` and no `cmd:` is a meta-target. It's a way to
group: `lattice run check` running `[build, test, lint]` is a common
pattern. Meta-targets cost nothing at runtime — Lattice notices the
empty command and skips execution.

## Globs

`Inputs` and `Outputs` accept the following glob syntax:

- `*`     – any characters except `/` within one path segment
- `?`     – exactly one character, not `/`
- `[abc]` – character class
- `**`    – zero or more path segments (the "doublestar")

A few patterns to keep in mind:

- `**/*.go` matches every `.go` file at any depth
- `pkg/**/*.go` matches `.go` under `pkg/` (does not match `cmd/foo.go`)
- `*` does NOT match `/`; you need `**/` for recursive matches

Brace expansion (`{a,b}`) is not currently supported. Use multiple
`Inputs` entries instead.

## Dependencies and ordering

`Deps` are by name, not by glob. The DAG resolver builds the graph,
detects cycles, and produces a topological order. Tasks at the same
depth in the topology may run in parallel up to `--parallel`.

Within a topological layer Lattice runs tasks in declaration order,
which matters for non-hermetic tasks (those with side effects not
captured by `Outputs`). For tasks with proper `Inputs/Outputs`,
declaration order doesn't matter.

## Caching

See `docs/caching.md`. Briefly: Lattice hashes the resolved command,
the sorted task-level environment, and every input file's content;
that hash is the cache key. Hits restore outputs from a tarball; misses
run the command and write the result. The cache lives at
`<project_root>/.lattice/cache/` by default.

To opt a task out, set `cache: false`. Tasks like `lattice run deploy`
or `lattice run fmt` (which mutate files in place) almost always want
to skip caching.
