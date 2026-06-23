# Plugins

Lattice's plugin system is on the roadmap. The `pkg/plugin` package
defines the contract types so v1 binaries that link the eventual
plugin loader will Just Work — but right now there is no loader and
no way to discover plugins from disk.

## Why not yet?

Three reasons:

1. **Versioning is hard.** Once we ship a `Plugin` interface and
   third parties start writing against it, we can't change it
   without breaking them. We want one or two iterations on real
   in-tree plugins before locking the contract.

2. **Cross-platform Go plugins are awkward.** `plugin.Open` on
   Linux works; on macOS it works under specific build constraints
   that surprise users; on Windows it doesn't work at all. WASM is
   the obvious path but adds a dependency on `wasmtime-go` or
   similar.

3. **Most "plugin" use cases are better served by tasks.** If you
   want a custom Docker build, write a `tasks/docker-build:` entry
   that calls a script. The script doesn't need to be a plugin to
   benefit from Lattice's caching.

## What's defined today

The `pkg/plugin` package exposes:

- `Plugin` — the top-level extension surface. Implementations
  have a `Name()` and a `Register(*Registry) error` method.
- `TaskHandler` — what a plugin actually adds. Tasks with
  `kind: <handler-kind>` route to this handler instead of the
  default shell runner.
- `Registry` — the in-memory registry. Currently used only by
  in-tree code; once the loader exists, `Discover()` will populate
  it from disk.

## Sketch of a future plugin

```go
package main

import (
    "context"

    "github.com/manojgowda/lattice/pkg/plugin"
    "github.com/manojgowda/lattice/pkg/types"
)

type DockerBuild struct{}

func (DockerBuild) Name() string { return "docker-build" }
func (h DockerBuild) Register(reg *plugin.Registry) error {
    return reg.AddHandler(h)
}
func (DockerBuild) Kind() string { return "docker-build" }
func (DockerBuild) Run(ctx context.Context, task *types.Task, opts types.RunOptions) (types.Result, error) {
    // build the image using parameters from task.Env
    // ...
}

func main() {
    plugin.Register(DockerBuild{})
}
```

Once the loader exists, you'd put the compiled `.so` (or `.wasm`)
in `~/.lattice/plugins/`, and `lattice plugins list` would
include it.

If you have a use case the current task model can't cover, please
open an issue. We're collecting motivating examples before we
ship the loader.
