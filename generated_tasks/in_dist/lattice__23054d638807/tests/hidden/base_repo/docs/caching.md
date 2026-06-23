# Caching

The cache is the reason Lattice is faster than your hand-rolled
build script. This document explains what's in the key, what's
in the value, and the failure modes you should know about.

## The cache key

For each task that has `cache: true` (the default), Lattice computes
a 32-byte BLAKE3 hash from:

1. The task name (so `build` and `test` with identical commands and
   identical inputs don't collide)
2. The resolved command string (after `${VAR}` interpolation)
3. The task-level environment map, sorted by key
4. For each input glob: the glob string itself, then the BLAKE3 hash
   of every file matching the glob, sorted by path

The hex-encoded hash becomes the `CacheKey` (a `string`). The hash
function uses length-prefixed framing internally — concatenating
`"abc" + "def"` produces a different hash than `"ab" + "cdef"`,
which means tweaking a glob's slash position can't accidentally
collide with another task.

## What's stored on disk

For every cache hit, the entry directory `<cache_dir>/<key[:2]>/<key>/`
contains:

- `entry.json` — `{key, outputs:{path:hash}, exit_code, duration}`
- `outputs.tar.gz` — gzipped tarball of every file in `Outputs[]`
- `stdout.log` and `stderr.log` — captured task output (rolled in
  with the cache so cache hits "replay" the original output)

The 2-character prefix sharding keeps any one directory under ~10k
entries even on long-running CI hosts.

## Cache hits and misses

On a hit:

- Lattice extracts `outputs.tar.gz` into the project root
- Prints stdout/stderr as if the task had just run
- Returns the recorded exit code
- Increments the `hits` counter you can see in `lattice cache stats`

On a miss:

- Lattice runs the task
- On success (exit 0), captures `Outputs[]` into a tarball, writes
  `entry.json`, and stores stdout/stderr
- On failure (non-zero exit), DOES NOT write a cache entry — the
  next run re-executes the task

This means failures are never cached. We've debated changing this
for tasks that legitimately produce non-zero exits (e.g. linters
that signal warnings) but the current behaviour wins on user-
expectation grounds: people running `lattice run lint` and seeing
"cached" don't expect the lint to have actually failed.

## Eviction

The current eviction policy is "off by default". The cache grows
without bound until you `lattice cache prune --max-age 7d` or
`lattice clean`. There is a stub LRU implementation in
`pkg/cache/eviction.go` that we plan to wire up properly once we
have field data on the typical cache size in production
projects. For now: prune in CI nightly.

## Known sharp edges

A few cases where the cache will surprise you:

- **Indirect imports:** if `pkg/foo.go` imports `internal/util`,
  Lattice does NOT walk the import graph. If your `Inputs:` is
  `pkg/**/*.go`, edits to `internal/util/util.go` will not invalidate
  the cache. This is by design — Lattice doesn't know your build
  system. **Workaround:** either include the transitive paths in
  `Inputs:` or scope the cache more tightly per package.

- **Symlinks:** the input hash reads the symlink target's content.
  The watcher, however, watches the symlink itself. If you edit the
  symlink target from outside the watched tree, the watcher won't
  fire and your cache won't invalidate.

- **Project-level env:** task-level `env:` is included in the cache
  key, but project-level `env:` (declared at the root of
  `lattice.yaml`) is not currently merged into the hash. Two tasks
  with identical task-level env but different project-level env
  will produce the same cache key. We treat this as a bug; the fix
  is on the roadmap.

If any of these bite you, please open an issue with a minimal
repro.
