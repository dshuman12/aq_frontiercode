export type DebugQuickAction = {
  id: string
  label: string
  command: string
}

export type DebugQuickCategory = {
  id: string
  label: string
  actions: readonly DebugQuickAction[]
}

export const DEBUG_QUICK_CATEGORIES: readonly DebugQuickCategory[] = [
  {
    id: 'worldgen',
    label: 'World Gen',
    actions: [
      { id: 'seed-show', label: 'Show Seed', command: 'seed' },
      { id: 'world-regen', label: 'Regenerate', command: 'regen' },
      { id: 'world-reroll', label: 'Random Seed', command: 'seed random' },
    ],
  },
  {
    id: 'research',
    label: 'Research',
    actions: [
      { id: 'unlock-all', label: 'Unlock All', command: 'unlock all' },
      { id: 'bridge-2', label: 'Bridge T2', command: 'bridge 2' },
      { id: 'bridge-3', label: 'Bridge T3', command: 'bridge 3' },
      { id: 'bridge-4', label: 'Bridge T4', command: 'bridge 4' },
    ],
  },
  {
    id: 'items',
    label: 'Items',
    actions: [
      { id: 'iron-100', label: '+100 Iron', command: 'give iron 100' },
      { id: 'copper-100', label: '+100 Copper', command: 'give copper 100' },
      { id: 'coal-100', label: '+100 Coal', command: 'give coal 100' },
      { id: 'silica-100', label: '+100 Silica', command: 'give silica 100' },
      { id: 'aluminum-100', label: '+100 Aluminum', command: 'give aluminum 100' },
    ],
  },
]
