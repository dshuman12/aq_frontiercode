import type { EconomySnapshot } from '../../../game/engine'

export type DebugLogLevel = 'info' | 'success' | 'error'

export type DebugCommandResult = {
  ok: boolean
  message: string
}

export type DebugConsoleEntry = {
  id: number
  level: DebugLogLevel
  message: string
}

export type DebugConsoleApi = {
  addResource: (resource: string, amount: number) => DebugCommandResult
  fillResources: (mode: 'half' | 'max') => DebugCommandResult
  setInfiniteCapacity: () => DebugCommandResult
  unlockBuild: (buildId: string) => DebugCommandResult
  unlockAll: () => DebugCommandResult
  setBridgeTier: (tier: number) => DebugCommandResult
  regenerateWorld: (seed?: number) => DebugCommandResult
  getWorldSeed: () => number
  snapshot: () => EconomySnapshot
}

export type DebugCommandContext = {
  api: DebugConsoleApi | null
  setRecipeFocus: (recipeId: string | null) => void
  recipeIds: Set<string>
}

export type DebugCommandDefinition = {
  name: string
  aliases?: string[]
  usage: string
  description: string
  execute: (
    args: string[],
    context: DebugCommandContext,
    allCommands: readonly DebugCommandDefinition[],
  ) => DebugCommandResult
}
