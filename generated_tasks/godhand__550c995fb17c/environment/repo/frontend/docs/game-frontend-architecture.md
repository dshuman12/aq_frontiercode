# Game Frontend Architecture

## Scope

This describes the gameplay architecture for `/game` after adding seeded floating islands, bridge-tier traversal, and 4-valley progression.

## World Model

- World is generated from a deterministic seed.
- Terrain is sparse and composed of separated floating islands.
- Each land tile is tagged with valley level `1..4`.
- Empty space between islands is traversed by player-placed bridge chains.
- Bridges are placed on void tiles and must extend from the currently reachable network.

## Valley Progression

The progression path is inspired by large-chain factory staging:

- Valley 1: `iron`, `copper`, `coal`
- Valley 2: `silica`, `aluminum`
- Valley 3: `titanium`, `lithium`
- Valley 4: `tungsten`, `thorium`

Bridge tiers gate valley access:

- `bridge_t1` starts unlocked
- `bridge_t2` unlocks valley 2 expansion
- `bridge_t3` unlocks valley 3 expansion
- `bridge_t4` unlocks valley 4 expansion

## Economy and Progression Data

`src/game/engine/economy.ts` is the source of truth for:

- Build placement costs
- Research unlock costs
- Valley progression table
- Storage capacity rules:
  - base per-resource ore/material caps
  - per-`storage` building cap bonuses
  - clamped resource add/refund behavior

Build metadata is now data-driven and component-tagged:

- `src/game/data/buildingData.json`
  - build categories + category colors
  - per-build label/color
  - ECS-like `components` tags (for example: `belt`, `miner`, `processor`, `bridge`, `storage_provider`, `depot_input`, `depot_output`)
  - optional footprint, cycle timing, miner kind, bridge tier, default-unlock flag
- `src/game/engine/buildingCatalog.ts`
  - validates `buildingData.json` at startup
  - exposes helper predicates (`isBeltBuildId`, `isMinerBuildId`, `isProcessingBuildId`, `isBridgeBuildId`, etc.)
  - exposes derived behavior (`getBuildPlacementSurface`, `getBuildFootprint`, `getBridgeTierForBuild`, default unlocks)

Placement, simulation, and UI build lists now consume these helpers instead of hardcoded build-id chains.

Crafting materials/recipes are now data-driven:

- `src/game/data/craftingData.json`
  - `materials`: craftable item ids + labels
  - `stations`: valid crafting stations (`manual` or building ids)
  - `recipes`: recipe rows (output, ingredients, valley, station, optional `manualTimeSec`)
- `src/game/engine/craftingCatalog.ts`
  - Loads and validates the JSON at startup
  - Exposes `MATERIAL_TYPES`, `MATERIAL_LABELS`, `CRAFT_RECIPES`
  - Exposes station helpers for UI/gameplay checks
  - Enforces that every material has at least one non-manual processing recipe path

This makes adding/removing materials and recipes mostly a data edit instead of a code edit.

Island generation is also data-driven:

- `src/game/data/worldgenData.json`
  - world bounds + non-overlap placement constraints
  - per-valley major/satellite island generation rules
  - Perlin/fBm island shape controls (coast/detail/warp/ripple)
  - ore cluster richness/spawn tuning
  - starter guaranteed ore starts, hub ring size, and starter inventory
- `src/game/engine/worldgenCatalog.ts`
  - Loads and validates the JSON at startup
  - Exposes `WORLDGEN_CONFIG` consumed by `worldgen.ts`

## Engine Structure

- `src/game/engine/types.ts`
  - Core simulation and economy types, including terrain/bridge maps.
- `src/game/engine/worldgen.ts`
  - Seeded island generation using `WORLDGEN_CONFIG`
  - Larger procedural primary islands + satellite islands with non-overlap placement
  - Perlin-based coastline shaping for more varied silhouettes
  - Data-defined ore cluster density and richness tuning
  - Data-defined starter hub/base layout
- `src/game/engine/state.ts`
  - Runtime state mutations and traversal validation.
- `src/game/engine/tick.ts`
  - Item movement, mining extraction, and hub intake simulation.
  - Hub intake now routes through storage-cap-aware resource adds.
  - Belt/hub/deposit lookups now use per-tick hash maps + occupied-belt tracking to avoid repeated linear scans.
- `src/game/engine/simulation.ts`
  - Processing-machine simulation stage (recipe selection, input buffers, output storage checks).
  - Pulls processor/depot/footprint/cycle behavior from `buildingCatalog` metadata.
  - Combines `tick()` + machine simulation into a compact step API for worker execution.

## Placement Rules

- Non-bridge placement requires reachable tiles from the hub network.
- Miners/drills require an ore deposit on target cell.
- Belts require traversable cells.
- Processing machines use anchored multi-cell footprints:
  - `smelter`: `2x3`
  - `assembler`: `3x3`
  - `refinery`: `4x3`
  - `lab`: `4x4`
- Depot logistics footprints:
  - `depot_out`: `2x1` (outputs from both long-edge sides)
  - `depot_in`: `2x2` (accepts belt inputs from all four sides)
- `storage` is a placeable logistics structure that increases per-resource ore/material capacity.
- `depot_in` also contributes to global storage capacity and belts resources into global storage.
- Bridge placement requires:
  - placement on void (not land),
  - required bridge tier met,
  - adjacency to currently reachable network (continuous bridge chain).

Placement internals now track structures in two maps:

- `placedStructures` keyed by anchor cell.
- `occupiedStructureCells` keyed by every covered cell and pointing to anchor id.

This allows clicking/removing any occupied tile of a multi-cell machine while still charging/refunding once.

This enforces physical expansion instead of remote building on disconnected islands.

## Rendering Structure

- `ShaderBackdrop` renders animated background with WebGL.
- `GameCanvas` renders:
  - starfield and void ambience
  - valley terrain tiles
  - placed bridges
  - deposits, hubs, belts, miners, items
  - anchored multi-cell machine footprints
  - machine input/output port markers
  - placement previews and cursor cell feedback
- View-culling keeps draw calls limited to visible cells/entities.
- Terrain rendering now uses chunk indexing (`32x32` cell chunks), so each frame scans only visible chunks rather than the full terrain map.
- Simulation stepping is offloaded to `src/pages/game/workers/simulation.worker.ts`.
  - `GameCanvas` sends compact dynamic snapshots and receives updated simulation snapshots.
  - Main thread remains focused on rendering + input interaction.
- Zoom-dependent LOD is applied in `GameCanvas`:
  - zoomed out: simplified terrain/entity rendering and reduced item drawing density
  - zoomed in: full detail (strokes, arrows, flow lines, machine port/tokens)
- Belt/item lookup path was optimized by building per-frame `beltById` and `beltItemCounts` maps, removing repeated linear scans.

## Interaction Model

- Left mouse hold starts a placement stroke preview while dragging.
- Placement is committed on left mouse release (not during drag).
- Drag placement uses a path preview line; each cell in the path is validated against placement rules.
- Holding `Shift` while dragging axis-locks the path to a straight horizontal/vertical line.
- Right click during an active placement stroke cancels the stroke.
- Right mouse drag pans the camera.
- `Alt` + right click removes a structure/tile and refunds if eligible.
- `Esc` clears/cancels the current placement stroke via `cancel_placement`.
- Wheel zoom uses a native non-passive listener on the canvas so zoom can safely call `preventDefault()`.

Processing machine interactions:

- Machine direction controls input/output sides.
- Input lanes are derived from recipe ingredient counts.
  - Example: ingredient cost `iron: 2` yields two `iron` input lanes.
- Output lanes are derived from output amount.
- Left click on a processing machine while in navigation mode selects it.
- Selected machines open a floating machine panel where player can choose:
  - `Auto Detect` recipe mode, or
  - a locked manual recipe target for that specific machine.
- Each machine has internal buffered input slots (`inputBuffer`) and crafts from its own buffer.
  - Machines no longer pull ingredients directly from global inventory/materials.
  - Ingredients must arrive by belt into machine input ports.
  - Machine crafting consumes buffered inputs, then outputs to global storage if capacity allows.
- Global resource flow is depot-based:
  - belt into `depot_in` to store into global inventory/materials,
  - belt out from `depot_out` to feed machine inputs and logistics lines.
- Hover inspector shows footprint size, facing, recipe, status, cycle time, and lane mapping.

Recipe graph interactions:

- Right mouse drag pans the recipe graph viewport.
- Mouse wheel zooms recipe graph viewport in/out around the cursor.
- Recipe nodes remain draggable with left click.
- Recipe edges are rendered as straight orthogonal segments for readability.

## UI Structure

- `GameScreen` wires:
  - `GameSidebar` component (menu/build/research/manual craft queue)
  - build selection and placement mode
  - crafting panel
  - research panel
  - valley progression cards
  - ore/material objective tracking
  - timed manual crafting queue flow for `manual` recipes:
    - click queues recipe entries (max `8` unique recipes, unlimited count each)
    - queue is shown fixed at the bottom of the sidebar as two-letter chips with counts
    - first queue entry crafts when requirements are met
    - active craft shows progress/remaining seconds in its recipe button
    - completion commits through normal `canvasActions.craft` and decrements queue count

Canvas interaction responsibilities are split to keep `GameCanvas` focused:

- `src/pages/game/components/GameCanvas.tsx`
  - orchestrates render loop, machine simulation, timing metrics, hover inspection, and pointer events
- `src/pages/game/components/CanvasHoverOverlay.tsx`
  - renders bottom-left hover inspector details
- `src/pages/game/components/CanvasShortcutOverlay.tsx`
  - renders bottom shortcut hint overlay
  - mounted by `GameScreen` (not `GameCanvas`) to avoid hover-driven canvas rerenders
- `src/pages/game/components/canvasPlacement.ts`
  - path generation for drag placement
  - placement validation/mutation helpers
  - uses build component tags (`belt`, `miner`, `bridge`, `storage_provider`) for placement/refund/storage logic
  - remove/refund helper for deletion gesture
- `src/pages/game/components/machineLayout.ts`
  - shared footprint + directional port/lane resolution
  - footprint/processor checks are resolved from `buildingCatalog`
- `src/pages/game/components/TimingGraphPanel.tsx`
  - floating timing analytics UI (belt load/utilization graph + per-machine lane requirements)
- `src/pages/game/state/economyStore.tsx`
  - selector-based economy context used by inventory UI to avoid rerendering all inventory rows/chips on every count change

Floating window rendering is also split into memoized wrappers:

- `src/pages/game/components/windows/InventoryFloatingWindow.tsx`
- `src/pages/game/components/windows/RecipesFloatingWindow.tsx`
- `src/pages/game/components/windows/TimingFloatingWindow.tsx`
- `src/pages/game/components/windows/DebugFloatingWindow.tsx`
- `src/pages/game/components/windows/MachineFloatingWindow.tsx` (shown when a machine is selected)

This keeps per-window rerenders isolated to window-specific prop changes.

Debug window access:

- Hidden by default.
- Toggled by secret key chord: hold `Ctrl+Shift`, then press `D`, then `B`.

Debug performance telemetry:

- Debug window now shows live render metrics sourced from `TimingSnapshot.performance`:
  - FPS
  - frame/update/draw milliseconds
  - estimated draw call count
  - visible/total terrain tile counts
  - visible entity counts (belts/miners/structures/items)

State fan-out controls:

- `economyStore` (`useSyncExternalStore`) feeds inventory selectors so only relevant rows/chips update.
- `timingStore` (`useSyncExternalStore`) receives telemetry from `GameCanvas` without forcing `GameScreen` rerenders.
- `hoverInspectorStore` decouples hover overlay updates from `GameCanvas` React state, so pointer hover changes do not rerender the canvas component.

Inventory UI behavior:

- Expanded inventory now shows `cnt/storage` values per resource instead of progress bars.
- Per-row selectors subscribe to only the row's count + relevant storage cap, keeping updates localized.

## Color System

The frontend now defines two palette groups in `src/App.css` via CSS variables:

- UI palette variables (`--ui-*`) for sidebar, floating windows, controls, text, and chips.
- Game palette variables (`--game-*`) for terrain tiles, blocked tiles, grid/stars, bridge accents, machine ports, and hover outline.

Canvas rendering reads game palette variables through `src/pages/game/theme/canvasPalette.ts`, so terrain/tile colors stay aligned with the CSS token palette while still drawing through the 2D canvas API.

Debug tooling architecture is documented in `docs/debug-tool-architecture.md`.

Rendering/threading optimization process is documented in `docs/render-threading-process.md`.

## Starter Base Setup

World generation seeds the hub island with a prebuilt base:

- central hub
- starter conveyor loops
- starter miners on valley-1 ore nodes
- starter inventory for immediate player building

This removes the early deadlock where no initial construction was possible.
