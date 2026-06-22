/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../../../lib/apiBase'
import { BUILD_COLORS, type BuildId } from '../buildCatalog'
import type {
  GridCell,
  LockstepBootstrap,
  LockstepCommandEnvelope,
  LockstepCommandPayload,
  LockstepPlacementStep,
  LockstepTickPacket,
  LocalPlayerPresenceUpdate,
  MultiplayerStateSnapshot,
  OutboundLockstepCommand,
  RemotePlayerPresence,
} from './types'

type WirePayload = {
  type?: string
  snapshot?: unknown
  presence?: unknown
  presences?: unknown
  userId?: unknown
  currentTick?: unknown
  tickIntervalMs?: unknown
  tick?: unknown
  commands?: unknown
}

type SocketConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed'

type SocketCloseInfo = {
  code: number
  reason: string
  wasClean: boolean
}

export type SocketDiagnostics = {
  packetsIn: number
  packetsOut: number
  bytesIn: number
  bytesOut: number
}

const SNAPSHOT_SEND_INTERVAL_MS = 40
const PRESENCE_SEND_INTERVAL_MS = 60
const NETWORK_STATS_FLUSH_MS = 250

function buildLobbyGameWebSocketUrl(lobbyId: string): string {
  const baseUrl = new URL(API_BASE_URL)
  const wsProtocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProtocol}//${baseUrl.host}/api/v1/ws/game/${encodeURIComponent(lobbyId)}`
}

function parseGridCell(raw: unknown): GridCell | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as { x?: unknown; y?: unknown }
  if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) return null
  return {
    x: Number(candidate.x),
    y: Number(candidate.y),
  }
}

function parseRemotePresence(raw: unknown): RemotePlayerPresence | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as {
    userId?: unknown
    username?: unknown
    cursorCell?: unknown
    placementCell?: unknown
    placementBuildId?: unknown
    placementDirection?: unknown
    updatedAtMs?: unknown
  }
  if (typeof candidate.userId !== 'string' || !candidate.userId) return null
  if (typeof candidate.username !== 'string' || !candidate.username) return null

  const rawDirection = candidate.placementDirection
  const placementDirection =
    rawDirection === 'up' || rawDirection === 'right' || rawDirection === 'down' || rawDirection === 'left'
      ? rawDirection
      : null

  const rawBuildId = candidate.placementBuildId
  const placementBuildId: BuildId | null =
    typeof rawBuildId === 'string' && rawBuildId in BUILD_COLORS ? (rawBuildId as BuildId) : null

  return {
    userId: candidate.userId,
    username: candidate.username,
    cursorCell: parseGridCell(candidate.cursorCell),
    placementCell: parseGridCell(candidate.placementCell),
    placementBuildId,
    placementDirection,
    updatedAtMs: Number.isFinite(candidate.updatedAtMs) ? Number(candidate.updatedAtMs) : Date.now(),
  }
}

function parseDirection(raw: unknown): 'up' | 'right' | 'down' | 'left' | null {
  if (raw === 'up' || raw === 'right' || raw === 'down' || raw === 'left') return raw
  return null
}

function parseLockstepPlacementStep(raw: unknown): LockstepPlacementStep | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as { x?: unknown; y?: unknown; direction?: unknown }
  const direction = parseDirection(candidate.direction)
  if (!direction) return null
  if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) return null
  return {
    x: Number(candidate.x),
    y: Number(candidate.y),
    direction,
  }
}

function parseLockstepCommandPayload(raw: unknown): LockstepCommandPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as {
    type?: unknown
    buildId?: unknown
    steps?: unknown
    cell?: unknown
    machineKey?: unknown
    recipeId?: unknown
  }

  if (candidate.type === 'place_steps') {
    if (typeof candidate.buildId !== 'string' || !(candidate.buildId in BUILD_COLORS)) return null
    if (!Array.isArray(candidate.steps)) return null
    const steps: LockstepPlacementStep[] = []
    for (const rawStep of candidate.steps) {
      const parsed = parseLockstepPlacementStep(rawStep)
      if (!parsed) continue
      steps.push(parsed)
    }
    if (steps.length === 0) return null
    return {
      type: 'place_steps',
      buildId: candidate.buildId as BuildId,
      steps,
    }
  }

  if (candidate.type === 'remove_cell') {
    const cell = parseGridCell(candidate.cell)
    if (!cell) return null
    return {
      type: 'remove_cell',
      cell,
    }
  }

  if (candidate.type === 'set_machine_recipe') {
    if (typeof candidate.machineKey !== 'string' || !candidate.machineKey) return null
    const recipeId =
      candidate.recipeId === null
        ? null
        : typeof candidate.recipeId === 'string'
          ? candidate.recipeId
          : null
    if (candidate.recipeId !== null && typeof candidate.recipeId !== 'string') return null
    return {
      type: 'set_machine_recipe',
      machineKey: candidate.machineKey,
      recipeId,
    }
  }

  return null
}

function parseLockstepCommandEnvelope(raw: unknown): LockstepCommandEnvelope | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as {
    tick?: unknown
    userId?: unknown
    username?: unknown
    command?: unknown
  }
  if (!Number.isFinite(candidate.tick)) return null
  if (typeof candidate.userId !== 'string' || !candidate.userId) return null
  if (typeof candidate.username !== 'string' || !candidate.username) return null
  const command = parseLockstepCommandPayload(candidate.command)
  if (!command) return null
  return {
    tick: Number(candidate.tick),
    userId: candidate.userId,
    username: candidate.username,
    command,
  }
}

function parseLockstepTickPacket(payload: WirePayload): LockstepTickPacket | null {
  if (!Number.isFinite(payload.tick) || !Array.isArray(payload.commands)) return null
  const tick = Number(payload.tick)
  const commands: LockstepCommandEnvelope[] = []
  for (const rawCommand of payload.commands) {
    const parsed = parseLockstepCommandEnvelope(rawCommand)
    if (!parsed) continue
    commands.push(parsed)
  }
  return {
    tick,
    commands,
  }
}

function parseLockstepBootstrap(payload: WirePayload): LockstepBootstrap | null {
  if (!Number.isFinite(payload.currentTick) || !Number.isFinite(payload.tickIntervalMs)) return null
  const currentTick = Number(payload.currentTick)
  const tickIntervalMs = Number(payload.tickIntervalMs)
  if (currentTick < 0 || tickIntervalMs <= 0) return null
  return {
    currentTick,
    tickIntervalMs,
  }
}

export function useLobbyGameSocket(
  lobbyId: string | null,
  reconnectVersion = 0,
  gameSocketUrl: string | null = null,
) {
  const [incomingSnapshot, setIncomingSnapshot] = useState<MultiplayerStateSnapshot | null>(null)
  const [remotePresences, setRemotePresences] = useState<Record<string, RemotePlayerPresence>>({})
  const [lockstepBootstrap, setLockstepBootstrap] = useState<LockstepBootstrap | null>(null)
  const [snapshotRequestVersion, setSnapshotRequestVersion] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<SocketConnectionStatus>('idle')
  const [lastCloseInfo, setLastCloseInfo] = useState<SocketCloseInfo | null>(null)
  const [networkDiagnostics, setNetworkDiagnostics] = useState<SocketDiagnostics>({
    packetsIn: 0,
    packetsOut: 0,
    bytesIn: 0,
    bytesOut: 0,
  })

  const socketRef = useRef<WebSocket | null>(null)
  const pendingSnapshotRef = useRef<MultiplayerStateSnapshot | null>(null)
  const pendingPresenceRef = useRef<LocalPlayerPresenceUpdate | null | undefined>(undefined)
  const lockstepTickQueueRef = useRef<LockstepTickPacket[]>([])
  const snapshotFlushTimerRef = useRef<number | null>(null)
  const presenceFlushTimerRef = useRef<number | null>(null)
  const networkStatsFlushTimerRef = useRef<number | null>(null)
  const networkDiagnosticsRef = useRef<SocketDiagnostics>({
    packetsIn: 0,
    packetsOut: 0,
    bytesIn: 0,
    bytesOut: 0,
  })

  const queueNetworkStatsFlush = useCallback(() => {
    if (networkStatsFlushTimerRef.current !== null) return
    networkStatsFlushTimerRef.current = window.setTimeout(() => {
      networkStatsFlushTimerRef.current = null
      setNetworkDiagnostics({ ...networkDiagnosticsRef.current })
    }, NETWORK_STATS_FLUSH_MS)
  }, [])

  const recordOutgoingBytes = useCallback(
    (bytes: number) => {
      const safeBytes = Number.isFinite(bytes) ? Math.max(0, Math.round(bytes)) : 0
      networkDiagnosticsRef.current = {
        ...networkDiagnosticsRef.current,
        packetsOut: networkDiagnosticsRef.current.packetsOut + 1,
        bytesOut: networkDiagnosticsRef.current.bytesOut + safeBytes,
      }
      queueNetworkStatsFlush()
    },
    [queueNetworkStatsFlush],
  )

  const recordIncomingBytes = useCallback(
    (bytes: number) => {
      const safeBytes = Number.isFinite(bytes) ? Math.max(0, Math.round(bytes)) : 0
      networkDiagnosticsRef.current = {
        ...networkDiagnosticsRef.current,
        packetsIn: networkDiagnosticsRef.current.packetsIn + 1,
        bytesIn: networkDiagnosticsRef.current.bytesIn + safeBytes,
      }
      queueNetworkStatsFlush()
    },
    [queueNetworkStatsFlush],
  )

  const sendWireMessage = useCallback((raw: string): boolean => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    socket.send(raw)
    recordOutgoingBytes(raw.length)
    return true
  }, [recordOutgoingBytes])

  const flushSnapshot = useCallback(() => {
    snapshotFlushTimerRef.current = null
    const snapshot = pendingSnapshotRef.current
    if (!snapshot) return
    const raw = JSON.stringify({
      kind: 'state_sync',
      snapshot,
    })
    if (!sendWireMessage(raw)) return
    pendingSnapshotRef.current = null
  }, [sendWireMessage])

  const flushPresence = useCallback(() => {
    presenceFlushTimerRef.current = null
    const pending = pendingPresenceRef.current
    if (pending === undefined) return
    if (pending === null) {
      if (!sendWireMessage(JSON.stringify({ kind: 'presence_clear' }))) return
      pendingPresenceRef.current = undefined
      return
    }
    if (
      !sendWireMessage(
        JSON.stringify({
          kind: 'presence_update',
          presence: pending,
        }),
      )
    ) {
      return
    }
    pendingPresenceRef.current = undefined
  }, [sendWireMessage])

  const queueSnapshotFlush = useCallback(() => {
    if (snapshotFlushTimerRef.current !== null) return
    snapshotFlushTimerRef.current = window.setTimeout(() => {
      flushSnapshot()
    }, SNAPSHOT_SEND_INTERVAL_MS)
  }, [flushSnapshot])

  const queuePresenceFlush = useCallback(() => {
    if (presenceFlushTimerRef.current !== null) return
    presenceFlushTimerRef.current = window.setTimeout(() => {
      flushPresence()
    }, PRESENCE_SEND_INTERVAL_MS)
  }, [flushPresence])

  const sendSnapshot = useCallback(
    (snapshot: MultiplayerStateSnapshot) => {
      pendingSnapshotRef.current = snapshot
      queueSnapshotFlush()
    },
    [queueSnapshotFlush],
  )

  const sendPresence = useCallback(
    (presence: LocalPlayerPresenceUpdate | null) => {
      pendingPresenceRef.current = presence
      queuePresenceFlush()
    },
    [queuePresenceFlush],
  )

  const sendLockstepCommand = useCallback((outbound: OutboundLockstepCommand) => {
    if (!Number.isFinite(outbound.tick) || outbound.tick < 0) return
    sendWireMessage(
      JSON.stringify({
        kind: 'lockstep_command',
        tick: Math.floor(outbound.tick),
        command: outbound.command,
      }),
    )
  }, [sendWireMessage])

  const drainLockstepTicks = useCallback((): LockstepTickPacket[] => {
    const queued = lockstepTickQueueRef.current
    if (queued.length === 0) return []
    lockstepTickQueueRef.current = []
    return queued
  }, [])

  useEffect(() => {
    setIncomingSnapshot(null)
    setRemotePresences({})
    setLockstepBootstrap(null)
    setSnapshotRequestVersion(0)
    setLastCloseInfo(null)
    setNetworkDiagnostics({
      packetsIn: 0,
      packetsOut: 0,
      bytesIn: 0,
      bytesOut: 0,
    })
    networkDiagnosticsRef.current = {
      packetsIn: 0,
      packetsOut: 0,
      bytesIn: 0,
      bytesOut: 0,
    }
    pendingSnapshotRef.current = null
    pendingPresenceRef.current = undefined
    lockstepTickQueueRef.current = []
    if (snapshotFlushTimerRef.current !== null) {
      window.clearTimeout(snapshotFlushTimerRef.current)
      snapshotFlushTimerRef.current = null
    }
    if (presenceFlushTimerRef.current !== null) {
      window.clearTimeout(presenceFlushTimerRef.current)
      presenceFlushTimerRef.current = null
    }
    if (networkStatsFlushTimerRef.current !== null) {
      window.clearTimeout(networkStatsFlushTimerRef.current)
      networkStatsFlushTimerRef.current = null
    }
    if (!lobbyId) {
      setConnectionStatus('idle')
      return
    }
    setConnectionStatus('connecting')

    const socket = new WebSocket(gameSocketUrl ?? buildLobbyGameWebSocketUrl(lobbyId))
    let effectDisposed = false
    socketRef.current = socket

    socket.onopen = () => {
      if (effectDisposed) return
      setConnectionStatus('open')
      setLastCloseInfo(null)
      flushSnapshot()
      flushPresence()
    }

    socket.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          recordIncomingBytes(event.data.length)
        } else if (event.data instanceof Blob) {
          recordIncomingBytes(event.data.size)
        } else if (event.data instanceof ArrayBuffer) {
          recordIncomingBytes(event.data.byteLength)
        }
        const payload = JSON.parse(event.data) as WirePayload
        if (!payload || typeof payload !== 'object') return

        if (payload.type === 'snapshot' || payload.type === 'state_sync') {
          const snapshot = payload.snapshot
          if (!snapshot || typeof snapshot !== 'object') return
          setIncomingSnapshot(snapshot as MultiplayerStateSnapshot)
          return
        }

        if (payload.type === 'presence_batch') {
          if (!Array.isArray(payload.presences)) return
          const next: Record<string, RemotePlayerPresence> = {}
          for (const rawPresence of payload.presences) {
            const parsed = parseRemotePresence(rawPresence)
            if (!parsed) continue
            next[parsed.userId] = parsed
          }
          setRemotePresences(next)
          return
        }

        if (payload.type === 'presence_sync') {
          const parsed = parseRemotePresence(payload.presence)
          if (!parsed) return
          setRemotePresences((current) => ({
            ...current,
            [parsed.userId]: parsed,
          }))
          return
        }

        if (payload.type === 'presence_clear') {
          const userId = typeof payload.userId === 'string' ? payload.userId : null
          if (!userId) return
          setRemotePresences((current) => {
            if (!(userId in current)) return current
            const next = { ...current }
            delete next[userId]
            return next
          })
          return
        }

        if (payload.type === 'lockstep_bootstrap') {
          const parsed = parseLockstepBootstrap(payload)
          if (!parsed) return
          setLockstepBootstrap(parsed)
          return
        }

        if (payload.type === 'lockstep_tick') {
          const parsed = parseLockstepTickPacket(payload)
          if (!parsed) return
          lockstepTickQueueRef.current = [...lockstepTickQueueRef.current, parsed]
          return
        }

        if (payload.type === 'snapshot_request') {
          setSnapshotRequestVersion((current) => current + 1)
        }
      } catch (error) {
        void error
      }
    }

    socket.onclose = (event) => {
      if (effectDisposed) return
      if (socketRef.current === socket) {
        socketRef.current = null
      }
      setConnectionStatus('closed')
      setLastCloseInfo({
        code: Number.isFinite(event.code) ? event.code : 1006,
        reason: typeof event.reason === 'string' ? event.reason : '',
        wasClean: Boolean(event.wasClean),
      })
    }

    socket.onerror = () => {}

    return () => {
      effectDisposed = true
      if (snapshotFlushTimerRef.current !== null) {
        window.clearTimeout(snapshotFlushTimerRef.current)
        snapshotFlushTimerRef.current = null
      }
      if (presenceFlushTimerRef.current !== null) {
        window.clearTimeout(presenceFlushTimerRef.current)
        presenceFlushTimerRef.current = null
      }
      if (networkStatsFlushTimerRef.current !== null) {
        window.clearTimeout(networkStatsFlushTimerRef.current)
        networkStatsFlushTimerRef.current = null
      }
      if (socketRef.current === socket) {
        socketRef.current = null
      }
      socket.close()
    }
  }, [
    flushPresence,
    flushSnapshot,
    gameSocketUrl,
    lobbyId,
    reconnectVersion,
    recordIncomingBytes,
  ])

  return {
    incomingSnapshot,
    remotePresences,
    lockstepBootstrap,
    snapshotRequestVersion,
    connectionStatus,
    lastCloseInfo,
    networkDiagnostics,
    drainLockstepTicks,
    sendSnapshot,
    sendPresence,
    sendLockstepCommand,
  }
}
