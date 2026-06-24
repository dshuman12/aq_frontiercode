/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { EconomySnapshot } from '../../../game/engine'

type Listener = () => void

export type EconomyStore = {
  getSnapshot: () => EconomySnapshot
  setSnapshot: (snapshot: EconomySnapshot) => void
  subscribe: (listener: Listener) => () => void
}

export function createEconomyStore(initialSnapshot: EconomySnapshot): EconomyStore {
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

const EconomyStoreContext = createContext<EconomyStore | null>(null)

type EconomyStoreProviderProps = {
  store: EconomyStore
  children: ReactNode
}

export function EconomyStoreProvider({ store, children }: EconomyStoreProviderProps) {
  return <EconomyStoreContext.Provider value={store}>{children}</EconomyStoreContext.Provider>
}

function useEconomyStore(): EconomyStore {
  const store = useContext(EconomyStoreContext)
  if (!store) {
    throw new Error('useEconomyStore must be used within EconomyStoreProvider')
  }
  return store
}

export function useEconomySelector<T>(
  selector: (snapshot: EconomySnapshot) => T,
  isEqual: (left: T, right: T) => boolean = Object.is,
): T {
  const store = useEconomyStore()
  const selectorRef = useRef(selector)
  const isEqualRef = useRef(isEqual)

  useEffect(() => {
    selectorRef.current = selector
  }, [selector])

  useEffect(() => {
    isEqualRef.current = isEqual
  }, [isEqual])

  const selectionCacheRef = useRef<{
    snapshot: EconomySnapshot
    selected: T
  } | null>(null)

  const getSelection = useCallback(() => {
    const snapshot = store.getSnapshot()
    const cache = selectionCacheRef.current
    if (cache && cache.snapshot === snapshot) {
      return cache.selected
    }

    const nextSelected = selectorRef.current(snapshot)
    if (cache && isEqualRef.current(cache.selected, nextSelected)) {
      const stable = cache.selected
      selectionCacheRef.current = { snapshot, selected: stable }
      return stable
    }

    selectionCacheRef.current = { snapshot, selected: nextSelected }
    return nextSelected
  }, [store])

  const subscribeToSelection = useCallback(
    (notify: Listener) => {
      let currentSelected = getSelection()
      return store.subscribe(() => {
        const snapshot = store.getSnapshot()
        const nextSelected = selectorRef.current(snapshot)
        if (isEqualRef.current(currentSelected, nextSelected)) {
          selectionCacheRef.current = {
            snapshot,
            selected: currentSelected,
          }
          return
        }
        currentSelected = nextSelected
        selectionCacheRef.current = { snapshot, selected: nextSelected }
        notify()
      })
    },
    [getSelection, store],
  )

  return useSyncExternalStore(subscribeToSelection, getSelection, getSelection)
}

export function useEconomyStoreSnapshot(): EconomySnapshot {
  const store = useEconomyStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function useStableEconomyStore(initialSnapshot: EconomySnapshot): EconomyStore {
  const [store] = useState(() => createEconomyStore(initialSnapshot))
  return store
}
