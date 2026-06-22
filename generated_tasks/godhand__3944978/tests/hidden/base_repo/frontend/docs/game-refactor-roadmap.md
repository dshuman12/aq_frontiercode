# Game Refactor Roadmap

## Why this exists

The game code is feature-rich but hard to extend because core behavior is concentrated in a few large files:

- `src/pages/game/components/GameCanvas.tsx`
- `src/pages/game/GameScreen.tsx`
- `src/game/engine/simulation.ts`

This document defines incremental refactor steps so new gameplay additions do not require editing large UI components directly.

## Target principles

1. React components should mostly compose behavior, not define game rules.
2. Shared gameplay types/utilities should never live inside a UI component file.
3. Data-driven catalogs (`craftingData.json`, `buildingData.json`, `worldgenData.json`) remain the first place to add content.
4. Side effects (workers, debug commands, persistence) should be isolated behind small APIs.

## Current foundation (completed)

This iteration introduced shared modules to reduce coupling:

- `src/pages/game/types/timing.ts`
  - canonical timing/telemetry types for canvas, screen, and stores
- `src/pages/game/utils/resourceLabel.ts`
  - shared resource labeling used by screen + windows + inventory
- `src/pages/game/components/gameCanvasShared.ts`
  - extracted GameCanvas domain constants/helpers:
    - recipes by station
    - bridge-tier build mapping
    - simulation-structure predicates
    - timing constants
    - build/machine status labels

This removes direct `TimingSnapshot`/label utility dependencies on `GameCanvas.tsx`.

## Next slices

### Slice 1: Canvas runtime split

- Extract worker orchestration and mutable refs from `GameCanvas.tsx` into:
  - `src/pages/game/canvas/runtime.ts`
  - `src/pages/game/canvas/useCanvasRuntime.ts`
- Keep `GameCanvas.tsx` as view + input event wiring only.

### Slice 2: Render layers split

- Move draw functions into deterministic layer modules:
  - `terrainLayer.ts`
  - `entityLayer.ts`
  - `overlayLayer.ts`
- Make each layer consume a single immutable frame snapshot.

### Slice 3: Game screen state split

- Split `GameScreen.tsx` into hooks:
  - `useBuildSelection`
  - `useRecipeGraphState`
  - `useManualCraftQueue`
  - `useDebugConsoleState`
- Screen component becomes composition-only.

### Slice 4: Engine boundaries

- Separate pure simulation from state mutation bridges in `simulation.ts`.
- Add clear input/output DTO types for worker handoff.
- Add unit tests around:
  - machine input/output lane behavior
  - depot storage in/out behavior
  - storage cap clamping

## File organization direction

Preferred game page structure:

- `src/pages/game/components/` UI components only
- `src/pages/game/canvas/` runtime + rendering modules
- `src/pages/game/state/` stores/selectors
- `src/pages/game/types/` shared game-page types
- `src/pages/game/utils/` pure formatting and utility helpers
- `src/pages/game/debug/` debug command domain

## Contribution rule of thumb

When adding a new feature:

1. Put data in catalog JSON if possible.
2. Put rules in engine or shared domain module.
3. Keep component changes thin and declarative.
4. If a helper is imported by 2+ components, move it out of component files.
