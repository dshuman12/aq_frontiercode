export type HoverInspector = {
  title: string
  lines: string[]
  meter?: {
    label: string
    value: number
    max: number
    displayText?: string
  }
}

type Listener = () => void

export type HoverInspectorStore = {
  getSnapshot: () => HoverInspector | null
  setSnapshot: (snapshot: HoverInspector | null) => void
  subscribe: (listener: Listener) => () => void
}

export function createHoverInspectorStore(initialSnapshot: HoverInspector | null): HoverInspectorStore {
  let snapshot = initialSnapshot
  const listeners = new Set<Listener>()

  return {
    getSnapshot: () => snapshot,
    setSnapshot: (nextSnapshot) => {
      snapshot = nextSnapshot
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
