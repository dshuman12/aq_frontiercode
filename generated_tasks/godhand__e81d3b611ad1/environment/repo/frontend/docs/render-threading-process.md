# Rendering Threading Process

## Goal

Reduce frame drops when zoomed out and under heavy entity detail by:

- moving expensive static terrain rasterization off the main thread,
- reducing per-frame draw calls on the main render loop,
- keeping gameplay simulation and interaction behavior intact.

## Multiplayer Note

- Multiplayer direction is authoritative-server first:
  - server owns canonical simulation state,
  - clients send commands and render replicated snapshots/deltas,
  - client workers remain performance/prediction helpers, not source of truth.
- Rendering migration (WebGPU/WebGL) is independent of authority model and can proceed as a client-side renderer upgrade.

## Why It Was Slow

The main thread was still doing too much work each frame:

- iterating many visible tiles/entities at low zoom,
- issuing large numbers of 2D canvas draw calls,
- doing all terrain fill/stroke work directly in-frame.

Even after culling/LOD improvements, terrain rasterization remained a hot path in large views.

## Implemented Threaded Pipeline

### 1) Terrain chunk indexing (main thread)

- Terrain is grouped into `32x32` cell chunks.
- Visible chunk bounds are computed from camera and zoom.

### 2) Worker-based terrain raster build

- New worker: `src/pages/game/workers/terrainRaster.worker.ts`.
- Main thread sends chunk cell data + palette colors to worker.
- Worker rasterizes each chunk into tier-aware terrain bitmaps (`tier 1..4`) using `OffscreenCanvas`.
- Worker returns transferable `ImageBitmap`s per chunk.

### 3) Main-thread terrain draw path

- At low/mid zoom, renderer draws cached chunk bitmaps (`drawImage`) instead of per-cell terrain rects.
- At high zoom or while cache is building, renderer falls back to per-cell terrain drawing.
- Raster cache is rebuilt on world regeneration / terrain rebuild.

### 4) Worker simulation step pipeline

- New worker: `src/pages/game/workers/simulation.worker.ts`.
- Main thread sends compact dynamic simulation input:
  - belts/items/miners/deposits/hubs
  - inventory/materials/unlocks/storage/nextId
  - processing structure list + machine state
- Worker runs:
  - `tick()` belt/miner/item simulation
  - processing machine input-buffer + recipe execution loop
- Worker returns compact simulation snapshots (dynamic state + machine states).
- Main thread applies snapshots and keeps rendering/UI interaction decoupled from simulation cost.

## Additional Frame Budget Controls

- Zoom-dependent LOD for belts/miners/processing effects.
- Hard caps for expensive per-entity detail effects.
- Item rendering subsampling/hide thresholds at low zoom.
- Camera-navigation optimization mode:
  - while right-drag panning or wheel zooming is active, renderer switches to simplified draw mode
  - animated effects are frozen/hidden (belt flow, miner rotor, twinkle variance, Maxwell sprite)
  - hover inspector is suppressed and item dots are hidden for lower draw pressure
- Tick-path optimization in `engine/tick.ts`:
  - map/set lookups for belts/hubs/deposits,
  - occupied-belt tracking to avoid repeated linear scans.

## Instrumentation

Debug window now includes live render telemetry:

- FPS
- frame/update/draw milliseconds
- draw call estimate
- visible vs total terrain tiles
- raster cache status (`ready/building`) and chunk count
- camera optimization status (`on/off`)
- visible entity counts

Data source: `TimingSnapshot.performance`.

## Current Tradeoffs

- Low/mid zoom terrain uses cached bitmaps for speed; detail styling is intentionally simplified.
- Cache build time appears briefly after regeneration (debug panel shows status).
- Item visuals are intentionally reduced at low zoom to preserve frame time.
- Simulation worker currently runs in stateless step mode (main thread sends snapshot each step), so structured-clone overhead still exists at high entity counts.

## Next Steps (GPU + More Threading)

1. Static layer cache split:
   - pre-raster separate layers (terrain, bridges, static structures) with dirty-region invalidation.
2. Worker authority migration:
   - keep authoritative simulation state in worker and send deltas/compact render buffers back.
   - switch main-thread writes (place/remove/craft/debug) to command messages instead of full snapshot sync.
3. GPU renderer migration:
   - migrate from immediate Canvas2D draw calls to WebGL/WebGPU batched quads/instancing.
   - keep Canvas2D fallback for unsupported environments.
