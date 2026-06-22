/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { TimingSnapshot } from '../components/GameCanvas'

type Listener = () => void

const TIMING_WINDOW_SECONDS = 5 * 60

export type TimingHistoryPoint = {
  timestampSec: number
  beltLoad: number
  averageUtilization: number
  outputRateByResource: Record<string, number>
}

export type TimingHistorySnapshot = {
  points: TimingHistoryPoint[]
  joinTimestampSec: number | null
  windowSeconds: number
  lastTimestampSec: number
}

export type TimingStore = {
  getSnapshot: () => TimingSnapshot
  getHistorySnapshot: () => TimingHistorySnapshot
  setSnapshot: (snapshot: TimingSnapshot) => void
  subscribe: (listener: Listener) => () => void
}

function clamp01(value: number): number {
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

function collectOutputRates(snapshot: TimingSnapshot): Record<string, number> {
  const outputRateByResource: Record<string, number> = {}
  outputRateByResource.__power_generated = Math.max(0, snapshot.power.generated)
  outputRateByResource.__power_consumed = Math.max(0, snapshot.power.allocated)
  for (const machine of snapshot.machines) {
    const resource = machine.outputResource
    if (!resource) continue
    const rate = Math.max(0, machine.outputPerSecond * clamp01(machine.utilization))
    if (rate <= 1e-9) continue
    outputRateByResource[resource] = (outputRateByResource[resource] ?? 0) + rate
  }
  return outputRateByResource
}

export function createTimingStore(initialSnapshot: TimingSnapshot): TimingStore {
  let snapshot = initialSnapshot
  let historySnapshot: TimingHistorySnapshot = {
    points: [],
    joinTimestampSec: null,
    windowSeconds: TIMING_WINDOW_SECONDS,
    lastTimestampSec: 0,
  }
  const listeners = new Set<Listener>()

  return {
    getSnapshot: () => snapshot,
    getHistorySnapshot: () => historySnapshot,
    setSnapshot: (nextSnapshot) => {
      snapshot = nextSnapshot
      const timestampSec = nextSnapshot.timestampSec
      if (timestampSec > 0) {
        const lastTimestamp = historySnapshot.lastTimestampSec
        const timestampReset = lastTimestamp > 0 && timestampSec + 1 < lastTimestamp

        if (timestampReset) {
          historySnapshot = {
            points: [],
            joinTimestampSec: null,
            windowSeconds: TIMING_WINDOW_SECONDS,
            lastTimestampSec: 0,
          }
        }

        if (timestampSec > historySnapshot.lastTimestampSec) {
          const beltLoad = nextSnapshot.belts > 0 ? nextSnapshot.itemsInTransit / nextSnapshot.belts : 0
          const averageUtilization =
            nextSnapshot.machines.length > 0
              ? nextSnapshot.machines.reduce((sum, machine) => sum + machine.utilization, 0) /
                nextSnapshot.machines.length
              : 0
          const nextPoint: TimingHistoryPoint = {
            timestampSec,
            beltLoad,
            averageUtilization,
            outputRateByResource: collectOutputRates(nextSnapshot),
          }

          const nextPoints = [...historySnapshot.points, nextPoint]
          const cutoffSec = timestampSec - TIMING_WINDOW_SECONDS
          let firstVisibleIndex = 0
          while (firstVisibleIndex < nextPoints.length && nextPoints[firstVisibleIndex].timestampSec < cutoffSec) {
            firstVisibleIndex += 1
          }

          historySnapshot = {
            points: firstVisibleIndex > 0 ? nextPoints.slice(firstVisibleIndex) : nextPoints,
            joinTimestampSec: historySnapshot.joinTimestampSec ?? timestampSec,
            windowSeconds: TIMING_WINDOW_SECONDS,
            lastTimestampSec: timestampSec,
          }
        }
      }
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

const TimingStoreContext = createContext<TimingStore | null>(null)

type TimingStoreProviderProps = {
  store: TimingStore
  children: ReactNode
}

export function TimingStoreProvider({ store, children }: TimingStoreProviderProps) {
  return <TimingStoreContext.Provider value={store}>{children}</TimingStoreContext.Provider>
}

function useTimingStore(): TimingStore {
  const store = useContext(TimingStoreContext)
  if (!store) {
    throw new Error('useTimingStore must be used within TimingStoreProvider')
  }
  return store
}

export function useTimingStoreSnapshot(): TimingSnapshot {
  const store = useTimingStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function useTimingHistorySnapshot(): TimingHistorySnapshot {
  const store = useTimingStore()
  return useSyncExternalStore(store.subscribe, store.getHistorySnapshot, store.getHistorySnapshot)
}

export function useStableTimingStore(initialSnapshot: TimingSnapshot): TimingStore {
  const [store] = useState(() => createTimingStore(initialSnapshot))
  return store
}
