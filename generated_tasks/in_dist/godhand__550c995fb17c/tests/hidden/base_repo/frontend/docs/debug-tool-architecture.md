# Debug Tool Architecture

## Goals

- Provide an in-game debug console for rapid iteration.
- Keep command handling scalable as the command surface grows.
- Keep simulation authority in `GameCanvas` while command parsing/UI stays in `GameScreen`.
- Keep debug UI hidden from normal play flow unless explicitly toggled.

## Layers

### 1. UI Layer

- `src/pages/game/components/DebugConsole.tsx`
  - Renders input + log output.
  - Has no game logic; only emits raw command strings.
- `src/pages/game/components/windows/DebugFloatingWindow.tsx`
  - Renders expandable quick-action categories above the raw console:
    - World Gen
    - Research
    - Items
  - Quick-action buttons still execute through command strings so one execution path is shared.
- Debug window visibility is toggled only by hotkey:
  - Hold `Ctrl+Shift`, then press `D`, then `B`.
  - No sidebar toggle button is exposed.

### 2. Command Layer

- `src/pages/game/debug/commands.ts`
  - Registry-based command definitions (`DEBUG_COMMANDS`).
  - Each command declares:
    - `name`/`aliases`
    - `usage`
    - `description`
    - `execute(args, context, allCommands)`
  - `executeDebugCommand()` tokenizes input and dispatches to a command.
- `src/pages/game/debug/quickActions.ts`
  - Data-driven quick-action categories/buttons.
  - Keeps button catalogs centralized and easy to extend without touching UI rendering code.

- `src/pages/game/debug/types.ts`
  - Shared debug types for command results, context, and log entries.
  - Defines the `DebugCommandContext` contract so command handlers stay decoupled from React components.

### 3. Simulation API Layer

- `GameCanvas` exposes a debug API through `GameCanvasActions.debug`:
  - `addResource`
  - `unlockBuild`
  - `unlockAll`
  - `setBridgeTier`
  - `regenerateWorld`
  - `getWorldSeed`
  - `snapshot`

This keeps world-state mutations centralized in the simulation owner.

## Execution Flow

1. User enters text in `DebugConsole`.
2. `GameScreen` calls `executeDebugCommand(raw, context)`.
3. Command dispatcher resolves a command from the registry.
4. Command calls context APIs (`GameCanvasActions.debug`) and/or UI callbacks (for recipe focus).
5. `GameScreen` appends a log entry with success/error output.

## Adding New Commands

1. Add a new `DebugCommandDefinition` to `DEBUG_COMMANDS`.
2. Use existing context APIs, or extend `DebugConsoleApi`/`GameCanvasActions.debug` if a new simulation primitive is needed.
3. Keep parsing/validation inside command definition, not in UI.
4. Document usage/description in the command object so `help` stays accurate automatically.

## Why This Scales

- Commands are data-driven registry entries, not `switch` statements scattered across components.
- UI does not need to know command semantics.
- Simulation mutation points stay constrained to `GameCanvas`.
- New command domains can be introduced by extending context with new sub-APIs without rewriting dispatcher flow.
