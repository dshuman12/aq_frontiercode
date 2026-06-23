# Environment-variable precedence

Lattice composes a task's effective environment from several layers,
applied in order. Later layers override earlier ones.

## The five layers

1. **OS environment** — `os.Environ()` from the process Lattice was
   invoked from. Always the bottom layer unless tests pin
   `IncludeOSEnv = false`.

2. **Project `env:`** — the top-level `env:` block in `lattice.yaml`.
   Available to every task in the project.

3. **`.env` files** — files listed in `env_files:`, loaded in
   declaration order. Earlier files lose to later ones. Each file is
   parsed with the same shell-style `KEY=VALUE` syntax `dotenv` uses
   (with optional `export` prefix and quoted values).

4. **Task-level `env:`** — fields under each task's `env:` block.
   Available only to that task.

5. **CLI overrides** — `-e KEY=VALUE` flags. Win over everything
   else.

## Resolution example

```yaml
# lattice.yaml
env:
  GREETING: "hello"
  PORT: "8080"

env_files:
  - .env

tasks:
  serve:
    env:
      PORT: "9090"        # task-level wins over project-level
    cmd: "echo $GREETING on $PORT"
```

`.env`:

```
GREETING=hi
DB_URL=postgres://localhost
```

Running `lattice run serve -e GREETING=hey`:

- `GREETING` from CLI override → `"hey"`
- `PORT` from task-level → `"9090"`
- `DB_URL` from `.env` → `"postgres://localhost"`
- All `os.Environ()` keys not overridden

## The `--explain` flag

```sh
lattice env --explain GREETING
# os:        (unset)
# project:   "hello"
# .env:      "hi"
# task[serve]: (unset)
# override:  "hey"
# resolved:  "hey"
```

Each row shows what each layer contributed. The resolved value is
the last non-empty entry. Useful for debugging "why does my task
see this value?"

## Reserved key prefix

Keys starting with `LATTICE_` are reserved for the runner itself
(currently `LATTICE_LOG_FORMAT`, `LATTICE_LOG_NO_TIME`). User
configuration that defines a `LATTICE_*` key still applies to the
task — Lattice doesn't strip them — but the behaviour is
considered undefined and may change in a future release. Don't
rely on overriding `LATTICE_*` from `.env` files.

## Caveat: project env not in the cache key

The cache hash currently includes the task-level `env:` block but
not the project-level `env:` block. Two tasks with identical
task-level env but different project-level env will collide in
the cache. See `docs/caching.md` "Known sharp edges". Track the
fix in the issue tracker.
