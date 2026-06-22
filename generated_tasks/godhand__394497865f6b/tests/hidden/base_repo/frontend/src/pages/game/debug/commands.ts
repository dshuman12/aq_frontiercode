import type { DebugCommandContext, DebugCommandDefinition, DebugCommandResult } from './types'

function ok(message: string): DebugCommandResult {
  return { ok: true, message }
}

function err(message: string): DebugCommandResult {
  return { ok: false, message }
}

function requireApi(context: DebugCommandContext): DebugCommandResult | null {
  if (context.api) return null
  return err('debug API unavailable (canvas not ready yet)')
}

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000)
}

function parseSeedInput(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const integer = Math.floor(parsed)
  if (integer < 0) return null
  return integer
}

export const DEBUG_COMMANDS: readonly DebugCommandDefinition[] = [
  {
    name: 'help',
    aliases: ['?'],
    usage: 'help',
    description: 'List all debug commands.',
    execute: (_args, _context, allCommands) => {
      const lines = allCommands
        .map((command) => `${command.usage} - ${command.description}`)
        .join(' | ')
      return ok(lines)
    },
  },
  {
    name: 'give',
    usage: 'give <resource> <amount>',
    description: 'Add ore/material to inventory.',
    execute: (args, context) => {
      const apiCheck = requireApi(context)
      if (apiCheck) return apiCheck
      if (args.length < 2) return err('usage: give <resource> <amount>')
      const amount = Number(args[1])
      if (!Number.isFinite(amount) || amount <= 0) {
        return err('amount must be a positive number')
      }
      return context.api!.addResource(args[0], amount)
    },
  },
  {
    name: 'fill',
    usage: 'fill <half|max>',
    description: 'Fill all known resources to half or max capacity.',
    execute: (args, context) => {
      const apiCheck = requireApi(context)
      if (apiCheck) return apiCheck
      if (args.length < 1) return err('usage: fill <half|max>')
      const mode = args[0].trim().toLowerCase()
      if (mode !== 'half' && mode !== 'max') {
        return err('mode must be "half" or "max"')
      }
      return context.api!.fillResources(mode)
    },
  },
  {
    name: 'capacity',
    usage: 'capacity infinite',
    description: 'Set extremely high storage capacity.',
    execute: (args, context) => {
      const apiCheck = requireApi(context)
      if (apiCheck) return apiCheck
      if (args.length < 1) return err('usage: capacity infinite')
      const mode = args[0].trim().toLowerCase()
      if (mode !== 'infinite') {
        return err('usage: capacity infinite')
      }
      return context.api!.setInfiniteCapacity()
    },
  },
  {
    name: 'unlock',
    usage: 'unlock <buildId|all>',
    description: 'Unlock one build or all builds.',
    execute: (args, context) => {
      const apiCheck = requireApi(context)
      if (apiCheck) return apiCheck
      if (args.length < 1) return err('usage: unlock <buildId|all>')
      if (args[0].toLowerCase() === 'all') {
        return context.api!.unlockAll()
      }
      return context.api!.unlockBuild(args[0])
    },
  },
  {
    name: 'bridge',
    usage: 'bridge <tier>',
    description: 'Unlock bridges up to tier 1..4.',
    execute: (args, context) => {
      const apiCheck = requireApi(context)
      if (apiCheck) return apiCheck
      if (args.length < 1) return err('usage: bridge <tier>')
      const tier = Number(args[0])
      if (!Number.isFinite(tier) || tier < 1 || tier > 4) {
        return err('tier must be in range 1..4')
      }
      return context.api!.setBridgeTier(tier)
    },
  },
  {
    name: 'regen',
    aliases: ['regenerate'],
    usage: 'regen [seed|random]',
    description: 'Regenerate world with current or provided seed.',
    execute: (args, context) => {
      const apiCheck = requireApi(context)
      if (apiCheck) return apiCheck
      if (args.length > 1) return err('usage: regen [seed|random]')
      if (args.length === 0) {
        return context.api!.regenerateWorld()
      }
      const token = args[0].trim().toLowerCase()
      if (token === 'random') {
        return context.api!.regenerateWorld(randomSeed())
      }
      const seed = parseSeedInput(token)
      if (seed === null) {
        return err('seed must be a non-negative integer or "random"')
      }
      return context.api!.regenerateWorld(seed)
    },
  },
  {
    name: 'seed',
    aliases: ['worldseed'],
    usage: 'seed [value|random]',
    description: 'Print current seed or set seed and regenerate world.',
    execute: (args, context) => {
      const apiCheck = requireApi(context)
      if (apiCheck) return apiCheck
      if (args.length > 1) return err('usage: seed [value|random]')
      if (args.length === 0) {
        return ok(`current seed=${context.api!.getWorldSeed()}`)
      }
      const token = args[0].trim().toLowerCase()
      if (token === 'random') {
        return context.api!.regenerateWorld(randomSeed())
      }
      const seed = parseSeedInput(token)
      if (seed === null) {
        return err('seed must be a non-negative integer or "random"')
      }
      return context.api!.regenerateWorld(seed)
    },
  },
  {
    name: 'focus',
    usage: 'focus <recipeId|clear>',
    description: 'Focus recipe graph on a recipe chain.',
    execute: (args, context) => {
      if (args.length < 1) return err('usage: focus <recipeId|clear>')
      const value = args[0].trim()
      if (value === 'clear') {
        context.setRecipeFocus(null)
        return ok('recipe focus cleared')
      }
      if (!context.recipeIds.has(value)) {
        return err(`unknown recipe '${value}'`)
      }
      context.setRecipeFocus(value)
      return ok(`focused recipe chain for '${value}'`)
    },
  },
  {
    name: 'status',
    usage: 'status',
    description: 'Print economy status summary.',
    execute: (_args, context) => {
      const apiCheck = requireApi(context)
      if (apiCheck) return apiCheck
      const snapshot = context.api!.snapshot()
      const oreTotal = Object.values(snapshot.inventory).reduce((sum, value) => sum + value, 0)
      const materialTotal = Object.values(snapshot.materials).reduce((sum, value) => sum + value, 0)
      const unlockedCount = Object.values(snapshot.unlocked).filter(Boolean).length
      return ok(`ore=${oreTotal} materials=${materialTotal} unlocked=${unlockedCount}`)
    },
  },
]

function tokenizeDebugInput(input: string): string[] {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function findCommand(token: string): DebugCommandDefinition | null {
  const lowered = token.toLowerCase()
  for (const command of DEBUG_COMMANDS) {
    if (command.name === lowered) return command
    if (command.aliases?.includes(lowered)) return command
  }
  return null
}

export function executeDebugCommand(rawInput: string, context: DebugCommandContext): DebugCommandResult {
  const tokens = tokenizeDebugInput(rawInput)
  if (tokens.length === 0) return err('enter a command, try: help')
  const command = findCommand(tokens[0])
  if (!command) return err(`unknown command '${tokens[0]}'`)
  return command.execute(tokens.slice(1), context, DEBUG_COMMANDS)
}
