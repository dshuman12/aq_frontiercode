import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GodhandButtonBase from '../../components/GodhandButtonBase'
import {
  BUILD_COSTS,
  CRAFTING_STATIONS,
  CRAFT_RECIPES,
  EMPTY_MATERIALS,
  MATERIAL_LABELS,
  ORE_TYPES,
  STARTING_UNLOCKS,
  canAffordCost,
  getStorageSnapshot,
  getCraftingStationLabel,
  isCraftingStationAvailable,
  type CraftRecipeDefinition,
  type CraftRecipeId,
  type Direction,
  type EconomySnapshot,
  type Inventory,
} from '../../game/engine'
import { useInputSystem } from '../../game/input'
import { executeDebugCommand } from './debug/commands'
import type { DebugConsoleEntry, DebugCommandContext, DebugLogLevel } from './debug/types'
import { BUILD_CATEGORIES, type BuildCategoryId, type BuildId } from './buildCatalog'
import CanvasShortcutOverlay from './components/CanvasShortcutOverlay'
import GameSidebar from './components/GameSidebar'
import GameCanvas, { type GameCanvasActions, type TimingSnapshot } from './components/GameCanvas.tsx'
import ShaderBackdrop from './components/ShaderBackdrop'
import ChatFloatingWindow from './components/windows/ChatFloatingWindow'
import DebugFloatingWindow from './components/windows/DebugFloatingWindow'
import InventoryFloatingWindow from './components/windows/InventoryFloatingWindow'
import RecipesFloatingWindow from './components/windows/RecipesFloatingWindow'
import SettingsFloatingWindow from './components/windows/SettingsFloatingWindow'
import TimingFloatingWindow from './components/windows/TimingFloatingWindow'
import {
  DEFAULT_MULTIPLAYER_OVERLAY_SETTINGS,
  type OutboundLockstepCommand,
  type LocalPlayerPresenceUpdate,
  type MultiplayerOverlaySettings,
  type MultiplayerStateSnapshot,
} from './multiplayer/types'
import { useLobbyGameSocket, type SocketDiagnostics } from './multiplayer/useLobbyGameSocket'
import { EconomyStoreProvider, useStableEconomyStore } from './state/economyStore'
import { TimingStoreProvider, useStableTimingStore } from './state/timingStore'
import { ORE_VISUALS } from './oreCatalog'
import { canPlace, type PlacementIntent } from './placement'
import { API_BASE_URL } from '../../lib/apiBase'
import { getCurrentUser } from '../../lib/authApi'
import { measureBackendPingMs } from '../../lib/healthApi'

const DIRECTION_ORDER: Direction[] = ['up', 'right', 'down', 'left']
const ORE_TYPE_SET = new Set<string>(ORE_TYPES as readonly string[])
const DEFAULT_PINNED_RESOURCE_IDS = ['iron', 'copper', 'coal']
const RECIPE_NODE_WIDTH = 220
const RECIPE_NODE_HEIGHT = 120
const RECIPE_ROOT_WIDTH = 150
const MAX_MANUAL_QUEUE_UNIQUE = 8
const REJOIN_COOLDOWN_MS = 8000
const OVERLAY_SETTINGS_STORAGE_KEY = 'game.overlay.settings.v1'
const PERFORMANCE_HUD_STORAGE_KEY = 'game.performance-hud.enabled.v1'

const EMPTY_INVENTORY: Inventory = ORE_TYPES.reduce(
  (acc, ore) => {
    acc[ore] = 0
    return acc
  },
  {} as Inventory,
)

const EMPTY_ECONOMY: EconomySnapshot = {
  inventory: EMPTY_INVENTORY,
  materials: { ...EMPTY_MATERIALS },
  unlocked: { ...STARTING_UNLOCKS },
  storage: getStorageSnapshot(0),
}

const EMPTY_TIMING: TimingSnapshot = {
  timestampSec: 0,
  beltCellsPerSecond: 0,
  belts: 0,
  itemsInTransit: 0,
  power: {
    generated: 0,
    allocated: 0,
    demandInCoverage: 0,
    demandTotal: 0,
    surplus: 0,
    deficit: 0,
  },
  machines: [],
  performance: {
    fps: 0,
    frameMs: 0,
    updateMs: 0,
    drawMs: 0,
    terrainTilesTotal: 0,
    terrainTilesVisible: 0,
    bridgesVisible: 0,
    depositsVisible: 0,
    beltsVisible: 0,
    minersVisible: 0,
    itemsVisible: 0,
    structuresVisible: 0,
    drawCallsEstimate: 0,
    terrainRasterReady: false,
    terrainRasterChunks: 0,
    cameraOptimizationActive: false,
  },
}

const INITIAL_CATEGORY: BuildCategoryId =
  BUILD_CATEGORIES.find((category) => category.items.some((item) => STARTING_UNLOCKS[item.id]))?.id ??
  BUILD_CATEGORIES[0].id

type RecipeGraphEntry = {
  recipe: CraftRecipeDefinition
  depth: number
  affordable: boolean
  stationAvailable: boolean
  availableNow: boolean
}

type ManualCraftState = {
  recipeId: string
  startedAtMs: number
  durationMs: number
}

type ManualCraftQueueEntry = {
  recipeId: string
  count: number
}

type JoinLobbyResponse = {
  gameWsUrl?: unknown
  lobby?: {
    id?: unknown
    _id?: unknown
  } | null
}

type SidebarDiagnostics = SocketDiagnostics & {
  fps: number
  frameMs: number
  updateMs: number
  drawMs: number
  pingMs: number | null | undefined
  socketStatus: 'idle' | 'connecting' | 'open' | 'closed'
}

function firstUnlockedBuild(
  categoryId: BuildCategoryId,
  unlocked: EconomySnapshot['unlocked'],
): BuildId | null {
  const category = BUILD_CATEGORIES.find((candidate) => candidate.id === categoryId)
  if (!category) return null
  return category.items.find((item) => unlocked[item.id])?.id ?? null
}

function resourceLabel(resource: string): string {
  if (resource in ORE_VISUALS) return ORE_VISUALS[resource as keyof typeof ORE_VISUALS].label
  if (resource in MATERIAL_LABELS) return MATERIAL_LABELS[resource as keyof typeof MATERIAL_LABELS]
  return resource
}

function tokenLabel(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]/g, '')
  if (cleaned.length >= 2) return cleaned.slice(0, 2).toUpperCase()
  return value.slice(0, 2).toUpperCase()
}

function isTextInputTarget(target: EventTarget | null): boolean {
  const node = target as HTMLElement | null
  if (!node) return false
  const tag = node.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable
}

function formatCost(cost: Partial<Record<string, number>>): string {
  const entries = Object.entries(cost)
  if (entries.length === 0) return 'none'
  return entries
    .map(([resource, amount]) => `${amount} ${resourceLabel(resource).toLowerCase()}`)
    .join(', ')
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
}

function ingredientEdgeColor(ingredient: string): string {
  let hash = 0
  for (let index = 0; index < ingredient.length; index += 1) {
    hash = (hash * 31 + ingredient.charCodeAt(index)) % 360
  }
  return `hsl(${(hash + 122) % 360}deg 28% 36%)`
}

function resolveManualCraftDurationMs(recipe: CraftRecipeDefinition): number {
  if (recipe.manualTimeSec !== undefined && recipe.manualTimeSec > 0) {
    return recipe.manualTimeSec * 1000
  }
  let complexity = 0
  for (const amount of Object.values(recipe.cost)) {
    complexity += amount ?? 0
  }
  return (1.2 + Math.min(4.8, complexity * 0.45)) * 1000
}

function parseOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export default function GameScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const inputSystem = useInputSystem()
  const economyStore = useStableEconomyStore(EMPTY_ECONOMY)
  const timingStore = useStableTimingStore(EMPTY_TIMING)

  const initialLobbyId =
    ((location.state as { lobbyId?: string } | null)?.lobbyId ?? window.sessionStorage.getItem('activeLobbyId')) ||
    null
  const initialLobbyGameWsUrl =
    ((location.state as { lobbyGameWsUrl?: string | null } | null)?.lobbyGameWsUrl ??
      window.sessionStorage.getItem('activeLobbyGameWsUrl')) ||
    null
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(initialLobbyId)
  const [activeLobbyGameWsUrl, setActiveLobbyGameWsUrl] = useState<string | null>(initialLobbyGameWsUrl)
  const routeLobbyId = (location.state as { lobbyId?: string } | null)?.lobbyId ?? null
  const routeLobbyGameWsUrl = (location.state as { lobbyGameWsUrl?: string | null } | null)?.lobbyGameWsUrl ?? null
  const resolvedLobbyId = routeLobbyId ?? activeLobbyId
  const resolvedLobbyGameWsUrl = routeLobbyGameWsUrl ?? activeLobbyGameWsUrl
  const leaveInFlightRef = useRef(false)
  const hasLeftLobbyRef = useRef(false)

  const [selectedCategoryId, setSelectedCategoryId] = useState<BuildCategoryId>(INITIAL_CATEGORY)
  const [collapsedBuildCategoryIds, setCollapsedBuildCategoryIds] = useState<BuildCategoryId[]>(() =>
    BUILD_CATEGORIES.filter((category) => category.id !== INITIAL_CATEGORY).map((category) => category.id),
  )
  const [placementEnabled, setPlacementEnabled] = useState(false)
  const [placementDirection, setPlacementDirection] = useState<Direction>('right')
  const [economy, setEconomy] = useState<EconomySnapshot>(EMPTY_ECONOMY)
  const [canvasActions, setCanvasActions] = useState<GameCanvasActions | null>(null)
  const [chatWindowOpen, setChatWindowOpen] = useState(true)
  const [inventoryWindowOpen, setInventoryWindowOpen] = useState(true)
  const [recipesWindowOpen, setRecipesWindowOpen] = useState(true)
  const [timingWindowOpen, setTimingWindowOpen] = useState(true)
  const [settingsWindowOpen, setSettingsWindowOpen] = useState(false)
  const [debugWindowOpen, setDebugWindowOpen] = useState(false)
  const [bridgeTier, setBridgeTier] = useState(1)
  const [multiplayerOverlaySettings, setMultiplayerOverlaySettings] = useState<MultiplayerOverlaySettings>(() => {
    try {
      const raw = window.localStorage.getItem(OVERLAY_SETTINGS_STORAGE_KEY)
      if (!raw) return DEFAULT_MULTIPLAYER_OVERLAY_SETTINGS
      const parsed = JSON.parse(raw) as Partial<MultiplayerOverlaySettings>
      return {
        showPeerCursors:
          typeof parsed.showPeerCursors === 'boolean'
            ? parsed.showPeerCursors
            : DEFAULT_MULTIPLAYER_OVERLAY_SETTINGS.showPeerCursors,
        showPeerPlacementHints:
          typeof parsed.showPeerPlacementHints === 'boolean'
            ? parsed.showPeerPlacementHints
            : DEFAULT_MULTIPLAYER_OVERLAY_SETTINGS.showPeerPlacementHints,
        showPeerNames:
          typeof parsed.showPeerNames === 'boolean'
            ? parsed.showPeerNames
            : DEFAULT_MULTIPLAYER_OVERLAY_SETTINGS.showPeerNames,
        presenceScale:
          typeof parsed.presenceScale === 'number' && Number.isFinite(parsed.presenceScale)
            ? Math.min(1.6, Math.max(0.6, parsed.presenceScale))
            : DEFAULT_MULTIPLAYER_OVERLAY_SETTINGS.presenceScale,
      }
    } catch {
      return DEFAULT_MULTIPLAYER_OVERLAY_SETTINGS
    }
  })
  const [performanceHudEnabled, setPerformanceHudEnabled] = useState<boolean>(() => {
    try {
      const raw = window.localStorage.getItem(PERFORMANCE_HUD_STORAGE_KEY)
      if (raw === null) return true
      return raw === '1'
    } catch {
      return true
    }
  })
  const [latestTimingSnapshot, setLatestTimingSnapshot] = useState<TimingSnapshot>(EMPTY_TIMING)
  const [backendPingMs, setBackendPingMs] = useState<number | null | undefined>(undefined)
  const [pinnedResourceIds, setPinnedResourceIds] = useState<string[]>(DEFAULT_PINNED_RESOURCE_IDS)
  const [recipeSearch, setRecipeSearch] = useState('')
  const [recipeValleyFilter, setRecipeValleyFilter] = useState<'all' | number>('all')
  const [recipeStationFilter, setRecipeStationFilter] = useState<string>('all')
  const [recipeAvailableOnly, setRecipeAvailableOnly] = useState(false)
  const [recipeAffordableOnly, setRecipeAffordableOnly] = useState(false)
  const [recipeFocusId, setRecipeFocusId] = useState<string | null>(null)
  const [recipeNodePositions, setRecipeNodePositions] = useState<Record<string, { x: number; y: number }>>({})
  const [debugEntries, setDebugEntries] = useState<DebugConsoleEntry[]>([])
  const [manualCraftQueue, setManualCraftQueue] = useState<ManualCraftQueueEntry[]>([])
  const [activeManualCraft, setActiveManualCraft] = useState<ManualCraftState | null>(null)
  const [manualCraftTickMs, setManualCraftTickMs] = useState(0)
  const [serverConnectionBlocked, setServerConnectionBlocked] = useState<{
    code: number
    reason: string
    wasClean: boolean
  } | null>(null)
  const [lobbyMembershipStatus, setLobbyMembershipStatus] = useState<'idle' | 'joining' | 'ready' | 'error'>('idle')
  const [gameWorldReady, setGameWorldReady] = useState(false)
  const [reconnectVersion, setReconnectVersion] = useState(0)
  const [rejoinInFlight, setRejoinInFlight] = useState(false)
  const [rejoinCooldownUntilMs, setRejoinCooldownUntilMs] = useState(0)
  const [rejoinClockMs, setRejoinClockMs] = useState(() => Date.now())

  const canvasWrapRef = useRef<HTMLDivElement | null>(null)
  const recipeGraphViewportRef = useRef<HTMLDivElement | null>(null)
  const recipeGraphTransformRef = useRef<HTMLDivElement | null>(null)
  const [recipeGraphViewportEl, setRecipeGraphViewportEl] = useState<HTMLDivElement | null>(null)
  const recipeGraphPanRef = useRef<{
    active: boolean
    lastClientX: number
    lastClientY: number
  } | null>(null)
  const recipeGraphViewRef = useRef({ scale: 1, offsetX: 16, offsetY: 16 })
  const recipeNodeDragRef = useRef<{
    recipeId: string
    offsetX: number
    offsetY: number
  } | null>(null)
  const debugHotkeyStepRef = useRef<{
    sawD: boolean
    expiresAtMs: number
  }>({ sawD: false, expiresAtMs: 0 })
  const debugEntryIdRef = useRef(1)
  const recipeEntriesCacheRef = useRef<{
    fingerprint: string
    entries: RecipeGraphEntry[]
  }>({
    fingerprint: '',
    entries: [],
  })
  const joinRequestVersionRef = useRef(0)

  const readCookie = useCallback((name: string): string | null => {
    const key = `${name}=`
    const parts = document.cookie.split(';')
    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed.startsWith(key)) continue
      return decodeURIComponent(trimmed.slice(key.length))
    }
    return null
  }, [])

  const ensureAccessCsrfToken = useCallback(async (): Promise<string> => {
    await getCurrentUser()
    const accessCsrfToken = readCookie('csrf_access_token')
    if (!accessCsrfToken) throw new Error('Missing csrf_access_token. Please sign in again.')
    return accessCsrfToken
  }, [readCookie])

  const clearActiveLobby = useCallback(() => {
    hasLeftLobbyRef.current = true
    setActiveLobbyId(null)
    setActiveLobbyGameWsUrl(null)
    window.sessionStorage.removeItem('activeLobbyId')
    window.sessionStorage.removeItem('activeLobbyGameWsUrl')
  }, [])

  const leaveActiveLobby = useCallback(async () => {
    if (!activeLobbyId || hasLeftLobbyRef.current || leaveInFlightRef.current) return

    leaveInFlightRef.current = true
    try {
      const accessCsrfToken = await ensureAccessCsrfToken()
      await fetch(`${API_BASE_URL}/api/v1/lobbies/${activeLobbyId}/leave`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-TOKEN': accessCsrfToken,
        },
      })
    } catch (error) {
      void error
    } finally {
      leaveInFlightRef.current = false
      clearActiveLobby()
    }
  }, [activeLobbyId, clearActiveLobby, ensureAccessCsrfToken])

  const ensureLobbyMembership = useCallback(
    async (lobbyId: string) => {
      const accessCsrfToken = await ensureAccessCsrfToken()
      const response = await fetch(`${API_BASE_URL}/api/v1/lobbies/${lobbyId}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-TOKEN': accessCsrfToken,
        },
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null
        const detail = parseOptionalString(payload?.detail) ?? 'Failed to refresh lobby membership.'
        throw new Error(detail)
      }

      const payload = (await response.json()) as JoinLobbyResponse
      const nextWsUrl = parseOptionalString(payload.gameWsUrl)
      if (nextWsUrl) {
        setActiveLobbyGameWsUrl(nextWsUrl)
      }
      setActiveLobbyId(lobbyId)
      hasLeftLobbyRef.current = false
    },
    [ensureAccessCsrfToken],
  )

  const navigateAfterLeavingLobby = useCallback(
    async (path: string) => {
      await leaveActiveLobby()
      navigate(path)
    },
    [leaveActiveLobby, navigate],
  )

  const navigateToTitle = useCallback(() => {
    void navigateAfterLeavingLobby('/')
  }, [navigateAfterLeavingLobby])

  const navigateToLobby = useCallback(() => {
    void navigateAfterLeavingLobby('/lobby')
  }, [navigateAfterLeavingLobby])

  const navigateToProfile = useCallback(() => {
    navigate('/profile')
  }, [navigate])

  const socketLobbyId = lobbyMembershipStatus === 'ready' ? resolvedLobbyId : null
  const socketLobbyGameWsUrl = lobbyMembershipStatus === 'ready' ? resolvedLobbyGameWsUrl : null

  const {
    incomingSnapshot: incomingMultiplayerSnapshot,
    remotePresences,
    lockstepBootstrap,
    snapshotRequestVersion,
    connectionStatus: multiplayerSocketStatus,
    lastCloseInfo: multiplayerSocketCloseInfo,
    networkDiagnostics: multiplayerNetworkDiagnostics,
    drainLockstepTicks,
    sendSnapshot: sendMultiplayerSnapshot,
    sendPresence: sendMultiplayerPresence,
    sendLockstepCommand: sendMultiplayerLockstepCommand,
  } = useLobbyGameSocket(socketLobbyId, reconnectVersion, socketLobbyGameWsUrl)

  const handleMultiplayerStateChange = useCallback((snapshot: MultiplayerStateSnapshot) => {
    sendMultiplayerSnapshot(snapshot)
  }, [sendMultiplayerSnapshot])

  const handleLocalPresenceUpdate = useCallback(
    (presence: LocalPlayerPresenceUpdate | null) => {
      sendMultiplayerPresence(presence)
    },
    [sendMultiplayerPresence],
  )

  const handleLockstepCommand = useCallback(
    (command: OutboundLockstepCommand) => {
      sendMultiplayerLockstepCommand(command)
    },
    [sendMultiplayerLockstepCommand],
  )

  const serverConnectionBlockedMessage = useMemo(() => {
    if (!serverConnectionBlocked) return ''
    if (serverConnectionBlocked.reason.trim().length > 0) {
      return serverConnectionBlocked.reason
    }
    if (serverConnectionBlocked.code === 1000 || serverConnectionBlocked.code === 1001) {
      return 'The multiplayer server closed the connection. Rejoin from lobby.'
    }
    return 'Lost connection to the multiplayer server. This can happen during a backend restart.'
  }, [serverConnectionBlocked])

  const rejoinCooldownSeconds = useMemo(() => {
    const remainingMs = rejoinCooldownUntilMs - rejoinClockMs
    if (remainingMs <= 0) return 0
    return Math.ceil(remainingMs / 1000)
  }, [rejoinClockMs, rejoinCooldownUntilMs])

  const showJoinLoadingOverlay =
    Boolean(resolvedLobbyId) &&
    !serverConnectionBlocked &&
    (lobbyMembershipStatus !== 'ready' || multiplayerSocketStatus !== 'open' || !gameWorldReady)

  const joinLoadingMessage = useMemo(() => {
    if (lobbyMembershipStatus !== 'ready') return 'Joining lobby...'
    if (multiplayerSocketStatus !== 'open') return 'Connecting to server...'
    if (!gameWorldReady) return 'Loading world...'
    return 'Loading...'
  }, [gameWorldReady, lobbyMembershipStatus, multiplayerSocketStatus])

  const joinLoadingProgress = useMemo(() => {
    if (lobbyMembershipStatus !== 'ready') return 28
    if (multiplayerSocketStatus !== 'open') return 62
    if (!gameWorldReady) return 92
    return 100
  }, [gameWorldReady, lobbyMembershipStatus, multiplayerSocketStatus])

  const handleTryRejoin = useCallback(() => {
    if (!resolvedLobbyId) return
    if (rejoinInFlight || rejoinCooldownSeconds > 0) return

    const requestVersion = joinRequestVersionRef.current + 1
    joinRequestVersionRef.current = requestVersion
    setRejoinInFlight(true)
    const now = Date.now()
    setRejoinClockMs(now)
    setRejoinCooldownUntilMs(now + REJOIN_COOLDOWN_MS)
    setLobbyMembershipStatus('joining')

    void (async () => {
      try {
        await ensureLobbyMembership(resolvedLobbyId)
        if (joinRequestVersionRef.current !== requestVersion) return
        setLobbyMembershipStatus('ready')
        setReconnectVersion((current) => current + 1)
      } catch (error) {
        if (joinRequestVersionRef.current !== requestVersion) return
        const reason = error instanceof Error ? error.message : 'Failed to rejoin this lobby.'
        setLobbyMembershipStatus('error')
        setServerConnectionBlocked({
          code: 1008,
          reason,
          wasClean: false,
        })
      } finally {
        if (joinRequestVersionRef.current === requestVersion) {
          setRejoinInFlight(false)
        }
      }
    })()
  }, [ensureLobbyMembership, rejoinCooldownSeconds, rejoinInFlight, resolvedLobbyId])

  useEffect(() => {
    economyStore.setSnapshot(economy)
  }, [economy, economyStore])

  useEffect(() => {
    if (!routeLobbyId) return
    setActiveLobbyId(routeLobbyId)
    setActiveLobbyGameWsUrl(routeLobbyGameWsUrl)
    setGameWorldReady(false)
    hasLeftLobbyRef.current = false
    window.sessionStorage.setItem('activeLobbyId', routeLobbyId)
  }, [routeLobbyGameWsUrl, routeLobbyId])

  useEffect(() => {
    if (!resolvedLobbyId || hasLeftLobbyRef.current) {
      setLobbyMembershipStatus('idle')
      return
    }
    const requestVersion = joinRequestVersionRef.current + 1
    joinRequestVersionRef.current = requestVersion
    setLobbyMembershipStatus('joining')
    setServerConnectionBlocked(null)

    void (async () => {
      try {
        await ensureLobbyMembership(resolvedLobbyId)
        if (joinRequestVersionRef.current !== requestVersion) return
        setLobbyMembershipStatus('ready')
      } catch (error) {
        if (joinRequestVersionRef.current !== requestVersion) return
        const reason = error instanceof Error ? error.message : 'Failed to join this lobby.'
        setLobbyMembershipStatus('error')
        setServerConnectionBlocked({
          code: 1008,
          reason,
          wasClean: false,
        })
      }
    })()
  }, [ensureLobbyMembership, resolvedLobbyId])

  useEffect(() => {
    if (!activeLobbyId) return
    window.sessionStorage.setItem('activeLobbyId', activeLobbyId)
  }, [activeLobbyId])

  useEffect(() => {
    if (!activeLobbyGameWsUrl) {
      window.sessionStorage.removeItem('activeLobbyGameWsUrl')
      return
    }
    window.sessionStorage.setItem('activeLobbyGameWsUrl', activeLobbyGameWsUrl)
  }, [activeLobbyGameWsUrl])

  useEffect(() => {
    window.localStorage.setItem(OVERLAY_SETTINGS_STORAGE_KEY, JSON.stringify(multiplayerOverlaySettings))
  }, [multiplayerOverlaySettings])

  useEffect(() => {
    window.localStorage.setItem(PERFORMANCE_HUD_STORAGE_KEY, performanceHudEnabled ? '1' : '0')
  }, [performanceHudEnabled])

  useEffect(() => {
    if (!performanceHudEnabled || !resolvedLobbyId || multiplayerSocketStatus === 'idle') {
      setBackendPingMs(undefined)
      return
    }

    let cancelled = false
    let inFlight = false
    let abortController: AbortController | null = null

    const samplePing = async () => {
      if (inFlight || cancelled) return
      inFlight = true
      abortController?.abort()
      abortController = new AbortController()
      try {
        const pingMs = await measureBackendPingMs(abortController.signal)
        if (!cancelled) {
          setBackendPingMs(pingMs)
        }
      } finally {
        inFlight = false
      }
    }

    void samplePing()
    const intervalId = window.setInterval(() => {
      void samplePing()
    }, 7000)

    return () => {
      cancelled = true
      abortController?.abort()
      window.clearInterval(intervalId)
    }
  }, [multiplayerSocketStatus, performanceHudEnabled, resolvedLobbyId])

  useEffect(() => {
    if (!resolvedLobbyId) {
      setServerConnectionBlocked(null)
      return
    }
    if (multiplayerSocketStatus === 'open') {
      setServerConnectionBlocked(null)
      return
    }
    if (multiplayerSocketStatus !== 'closed') return
    if (leaveInFlightRef.current || hasLeftLobbyRef.current) return
    setServerConnectionBlocked({
      code: multiplayerSocketCloseInfo?.code ?? 1006,
      reason: multiplayerSocketCloseInfo?.reason ?? '',
      wasClean: multiplayerSocketCloseInfo?.wasClean ?? false,
    })
  }, [multiplayerSocketCloseInfo, multiplayerSocketStatus, resolvedLobbyId])

  useEffect(() => {
    if (rejoinCooldownUntilMs <= Date.now()) return
    const timerId = window.setInterval(() => {
      setRejoinClockMs(Date.now())
    }, 250)
    return () => {
      window.clearInterval(timerId)
    }
  }, [rejoinCooldownUntilMs])

  useEffect(() => {
    if (!activeManualCraft) return
    setManualCraftTickMs(Date.now())
    const interval = window.setInterval(() => {
      setManualCraftTickMs(Date.now())
    }, 100)
    return () => {
      window.clearInterval(interval)
    }
  }, [activeManualCraft])

  useEffect(() => {
    if (!activeManualCraft) return
    const elapsedMs = manualCraftTickMs - activeManualCraft.startedAtMs
    if (elapsedMs < activeManualCraft.durationMs) return
    const recipeId = activeManualCraft.recipeId
    const crafted = canvasActions?.craft(recipeId) ?? false
    setActiveManualCraft(null)
    if (!crafted) return
    setManualCraftQueue((current) => {
      const index = current.findIndex((entry) => entry.recipeId === recipeId)
      if (index < 0) return current
      const next = [...current]
      const entry = next[index]
      if (entry.count <= 1) {
        next.splice(index, 1)
      } else {
        next[index] = { ...entry, count: entry.count - 1 }
      }
      return next
    })
  }, [activeManualCraft, canvasActions, manualCraftTickMs])

  const handleTimingChange = useCallback(
    (snapshot: TimingSnapshot) => {
      timingStore.setSnapshot(snapshot)
      setLatestTimingSnapshot(snapshot)
      if (snapshot.performance.terrainRasterReady) {
        setGameWorldReady(true)
      }
    },
    [timingStore],
  )

  const screenToRecipeGraphPoint = useCallback((clientX: number, clientY: number) => {
    const viewport = recipeGraphViewportRef.current
    if (!viewport) return null
    const rect = viewport.getBoundingClientRect()
    const localX = clientX - rect.left
    const localY = clientY - rect.top
    const view = recipeGraphViewRef.current
    return {
      x: (localX - view.offsetX) / view.scale,
      y: (localY - view.offsetY) / view.scale,
    }
  }, [])

  const hideChatWindow = useCallback(() => {
    setChatWindowOpen(false)
  }, [])

  const applyRecipeGraphView = useCallback(() => {
    const transformEl = recipeGraphTransformRef.current
    if (!transformEl) return
    const view = recipeGraphViewRef.current
    transformEl.style.transform = `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale})`
  }, [])

  const setRecipeGraphViewportNode = useCallback((node: HTMLDivElement | null) => {
    recipeGraphViewportRef.current = node
    setRecipeGraphViewportEl(node)
  }, [])

  const setRecipeGraphTransformNode = useCallback(
    (node: HTMLDivElement | null) => {
      recipeGraphTransformRef.current = node
      if (node) applyRecipeGraphView()
    },
    [applyRecipeGraphView],
  )

  const clearRecipeFocus = useCallback(() => {
    setRecipeFocusId(null)
  }, [])

  const toggleRecipeFocus = useCallback((recipeId: string) => {
    setRecipeFocusId((current) => (current === recipeId ? null : recipeId))
  }, [])

  const resetRecipeView = useCallback(() => {
    recipeGraphViewRef.current = { scale: 1, offsetX: 16, offsetY: 16 }
    applyRecipeGraphView()
  }, [applyRecipeGraphView])

  const [selectedBuildId, setSelectedBuildId] = useState<BuildId | null>(
    firstUnlockedBuild(INITIAL_CATEGORY, EMPTY_ECONOMY.unlocked),
  )

  const recipeList = useMemo(
    () =>
      Object.values(CRAFT_RECIPES).sort((a, b) => {
        if (a.valley !== b.valley) return a.valley - b.valley
        return a.label.localeCompare(b.label)
      }),
    [],
  )

  const recipeDepths = useMemo(() => {
    const outputToRecipe = new Map<string, CraftRecipeDefinition>()
    for (const recipe of recipeList) {
      if (!outputToRecipe.has(recipe.output.material)) {
        outputToRecipe.set(recipe.output.material, recipe)
      }
    }

    const depthMemo = new Map<string, number>()
    const visiting = new Set<string>()

    const resourceDepth = (resource: string): number => {
      if (ORE_TYPE_SET.has(resource)) return 0
      const memoValue = depthMemo.get(resource)
      if (memoValue !== undefined) return memoValue
      if (visiting.has(resource)) return 0

      visiting.add(resource)
      const recipe = outputToRecipe.get(resource)
      let depth = 0
      if (recipe) {
        const ingredientDepths = Object.keys(recipe.cost).map((ingredient) => resourceDepth(ingredient))
        depth = 1 + (ingredientDepths.length > 0 ? Math.max(...ingredientDepths) : 0)
      }
      visiting.delete(resource)
      depthMemo.set(resource, depth)
      return depth
    }

    const byRecipeId = new Map<string, number>()
    for (const recipe of recipeList) {
      byRecipeId.set(recipe.id, resourceDepth(recipe.output.material))
    }
    return byRecipeId
  }, [recipeList])

  const selectedBuildLabel = useMemo(() => {
    for (const category of BUILD_CATEGORIES) {
      const item = category.items.find((candidate) => candidate.id === selectedBuildId)
      if (item) return item.label
    }
    return null
  }, [selectedBuildId])

  const selectedBuildCost = useMemo(() => {
    if (!selectedBuildId) return null
    return BUILD_COSTS[selectedBuildId]
  }, [selectedBuildId])

  const selectedBuildAffordable = useMemo(() => {
    if (!selectedBuildCost) return false
    return canAffordCost(economy, selectedBuildCost)
  }, [economy, selectedBuildCost])

  const placementIntent = useMemo<PlacementIntent>(
    () => ({
      enabled: placementEnabled,
      selectedBuildId,
    }),
    [placementEnabled, selectedBuildId],
  )

  const rotateDirection = useCallback(() => {
    setPlacementDirection((current) => {
      const index = DIRECTION_ORDER.indexOf(current)
      const nextIndex = (index + 1) % DIRECTION_ORDER.length
      return DIRECTION_ORDER[nextIndex]
    })
  }, [])

  const selectBuildCategory = useCallback(
    (categoryId: BuildCategoryId) => {
      setSelectedCategoryId(categoryId)
      const nextBuild = firstUnlockedBuild(categoryId, economy.unlocked)
      setSelectedBuildId(nextBuild)
      if (!nextBuild) setPlacementEnabled(false)
    },
    [economy.unlocked],
  )

  const selectBuildItem = useCallback((buildId: BuildId) => {
    setSelectedBuildId(buildId)
    setPlacementEnabled(true)
  }, [])

  const toggleResourcePin = useCallback((resource: string) => {
    setPinnedResourceIds((current) =>
      current.includes(resource) ? current.filter((id) => id !== resource) : [...current, resource],
    )
  }, [])

  const toggleChatWindow = useCallback(() => {
    setChatWindowOpen((current) => !current)
  }, [])

  const toggleInventoryWindow = useCallback(() => {
    setInventoryWindowOpen((current) => !current)
  }, [])

  const toggleRecipesWindow = useCallback(() => {
    setRecipesWindowOpen((current) => !current)
  }, [])

  const toggleTimingWindow = useCallback(() => {
    setTimingWindowOpen((current) => !current)
  }, [])

  const toggleSettingsWindow = useCallback(() => {
    setSettingsWindowOpen((current) => !current)
  }, [])

  const toggleBuildCategoryCollapsed = useCallback((categoryId: BuildCategoryId) => {
    setCollapsedBuildCategoryIds((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId],
    )
  }, [])

  const hideInventoryWindow = useCallback(() => {
    setInventoryWindowOpen(false)
  }, [])

  const hideRecipesWindow = useCallback(() => {
    setRecipesWindowOpen(false)
  }, [])

  const hideTimingWindow = useCallback(() => {
    setTimingWindowOpen(false)
  }, [])

  const hideSettingsWindow = useCallback(() => {
    setSettingsWindowOpen(false)
  }, [])

  const hideDebugWindow = useCallback(() => {
    setDebugWindowOpen(false)
  }, [])

  const clearDebugEntries = useCallback(() => {
    setDebugEntries([])
  }, [])

  const queueManualRecipe = useCallback((recipeId: CraftRecipeId) => {
    setManualCraftQueue((current) => {
      const index = current.findIndex((entry) => entry.recipeId === recipeId)
      if (index >= 0) {
        const next = [...current]
        const entry = next[index]
        next[index] = { ...entry, count: entry.count + 1 }
        return next
      }
      if (current.length >= MAX_MANUAL_QUEUE_UNIQUE) return current
      return [...current, { recipeId, count: 1 }]
    })
  }, [])

  const craftRecipeInstant = useCallback(
    (recipeId: CraftRecipeId) => {
      canvasActions?.craft(recipeId)
    },
    [canvasActions],
  )

  const unlockBuildById = useCallback(
    (buildId: BuildId) => {
      canvasActions?.unlock(buildId)
    },
    [canvasActions],
  )

  useEffect(() => {
    if (activeManualCraft) return
    if (!canvasActions) return
    const nextEntry = manualCraftQueue[0]
    if (!nextEntry) return
    const recipe = CRAFT_RECIPES[nextEntry.recipeId]
    if (!recipe || recipe.station !== 'manual') {
      setManualCraftQueue((current) => current.filter((entry) => entry.recipeId !== nextEntry.recipeId))
      return
    }
    if (!isCraftingStationAvailable(economy.unlocked, recipe.station)) return
    if (bridgeTier < recipe.valley) return
    if (!canAffordCost(economy, recipe.cost)) return

    setActiveManualCraft((current) => {
      if (current) return current
      return {
        recipeId: nextEntry.recipeId,
        startedAtMs: Date.now(),
        durationMs: resolveManualCraftDurationMs(recipe),
      }
    })
  }, [activeManualCraft, bridgeTier, canvasActions, economy, manualCraftQueue])

  const manualQueueChips = useMemo(
    () =>
      manualCraftQueue.map((entry) => {
        const recipe = CRAFT_RECIPES[entry.recipeId]
        const token = recipe ? tokenLabel(resourceLabel(recipe.output.material)) : tokenLabel(entry.recipeId)
        return {
          recipeId: entry.recipeId,
          token,
          count: entry.count,
          label: recipe?.label ?? entry.recipeId,
        }
      }),
    [manualCraftQueue],
  )

  const recipeAllEntries = useMemo(() => {
    const nextEntries = recipeList.map((recipe) => {
      const stationAvailable = isCraftingStationAvailable(economy.unlocked, recipe.station)
      const availableNow = stationAvailable && bridgeTier >= recipe.valley
      const affordable = canAffordCost(economy, recipe.cost)
      const depth = recipeDepths.get(recipe.id) ?? 0
      return {
        recipe,
        depth,
        affordable,
        stationAvailable,
        availableNow,
      }
    })

    const fingerprint = nextEntries
      .map(
        (entry) =>
          `${entry.recipe.id}:${entry.depth}:${entry.stationAvailable ? 1 : 0}:${entry.availableNow ? 1 : 0}:${entry.affordable ? 1 : 0}`,
      )
      .join('|')
    const previous = recipeEntriesCacheRef.current
    if (previous.fingerprint === fingerprint) {
      return previous.entries
    }

    recipeEntriesCacheRef.current = {
      fingerprint,
      entries: nextEntries,
    }
    return nextEntries
  }, [bridgeTier, economy, recipeDepths, recipeList])

  const recipeFilteredEntries = useMemo(() => {
    const normalizedSearch = recipeSearch.trim().toLowerCase()
    return recipeAllEntries
      .filter((entry) => {
        const recipe = entry.recipe
        if (recipeValleyFilter !== 'all' && recipe.valley !== recipeValleyFilter) return false
        if (recipeStationFilter !== 'all' && recipe.station !== recipeStationFilter) return false
        if (recipeAvailableOnly && !entry.availableNow) return false
        if (recipeAffordableOnly && !entry.affordable) return false

        if (normalizedSearch.length > 0) {
          const ingredients = Object.keys(recipe.cost)
          const searchText = [
            recipe.id,
            recipe.label,
            recipe.output.material,
            resourceLabel(recipe.output.material),
            ...ingredients,
            ...ingredients.map((ingredient) => resourceLabel(ingredient)),
            recipe.station,
            getCraftingStationLabel(recipe.station),
          ]
            .join(' ')
            .toLowerCase()
          if (!searchText.includes(normalizedSearch)) return false
        }

        return true
      })
  }, [
    recipeAllEntries,
    recipeAffordableOnly,
    recipeAvailableOnly,
    recipeSearch,
    recipeStationFilter,
    recipeValleyFilter,
  ])

  const recipeById = useMemo(() => {
    const byId = new Map<string, CraftRecipeDefinition>()
    for (const recipe of recipeList) {
      byId.set(recipe.id, recipe)
    }
    return byId
  }, [recipeList])

  const recipeByOutput = useMemo(() => {
    const byOutput = new Map<string, CraftRecipeDefinition>()
    for (const recipe of recipeList) {
      if (!byOutput.has(recipe.output.material)) {
        byOutput.set(recipe.output.material, recipe)
      }
    }
    return byOutput
  }, [recipeList])

  const recipeFocusSet = useMemo(() => {
    if (!recipeFocusId) return null
    const start = recipeById.get(recipeFocusId)
    if (!start) return null

    const focused = new Set<string>()
    const visit = (recipe: CraftRecipeDefinition) => {
      if (focused.has(recipe.id)) return
      focused.add(recipe.id)
      for (const ingredient of Object.keys(recipe.cost)) {
        const source = recipeByOutput.get(ingredient)
        if (source) visit(source)
      }
    }
    visit(start)
    return focused
  }, [recipeById, recipeByOutput, recipeFocusId])

  const recipeGraphEntries = useMemo(() => {
    if (!recipeFocusSet) return recipeFilteredEntries
    return recipeAllEntries.filter((entry) => recipeFocusSet.has(entry.recipe.id))
  }, [recipeAllEntries, recipeFilteredEntries, recipeFocusSet])

  const focusedRecipe = useMemo(
    () => (recipeFocusId ? recipeById.get(recipeFocusId) ?? null : null),
    [recipeById, recipeFocusId],
  )

  const recipeOutputSet = useMemo(() => {
    const outputs = new Set<string>()
    for (const recipe of recipeList) {
      outputs.add(recipe.output.material)
    }
    return outputs
  }, [recipeList])

  const recipeInputRoots = useMemo(() => {
    const roots = new Set<string>()
    for (const entry of recipeGraphEntries) {
      for (const ingredient of Object.keys(entry.recipe.cost)) {
        if (!recipeOutputSet.has(ingredient) || ORE_TYPE_SET.has(ingredient)) {
          roots.add(ingredient)
        }
      }
    }
    return Array.from(roots).sort((a, b) => resourceLabel(a).localeCompare(resourceLabel(b)))
  }, [recipeGraphEntries, recipeOutputSet])

  const recipeOutputToEntry = useMemo(() => {
    const byOutput = new Map<string, RecipeGraphEntry>()
    for (const entry of recipeGraphEntries) {
      if (!byOutput.has(entry.recipe.output.material)) {
        byOutput.set(entry.recipe.output.material, entry)
      }
    }
    return byOutput
  }, [recipeGraphEntries])

  const recipeGraphLayout = useMemo(() => {
    const byDepth = new Map<number, RecipeGraphEntry[]>()
    for (const entry of recipeGraphEntries) {
      const bucket = byDepth.get(entry.depth) ?? []
      bucket.push(entry)
      byDepth.set(entry.depth, bucket)
    }

    const sortedDepths = Array.from(byDepth.keys()).sort((a, b) => a - b)
    const defaultRecipePositions: Record<string, { x: number; y: number }> = {}
    let maxRecipeX = 0
    let maxRecipeY = 0
    for (const depth of sortedDepths) {
      const entries =
        byDepth
          .get(depth)
          ?.sort((a, b) => {
            if (a.recipe.valley !== b.recipe.valley) return a.recipe.valley - b.recipe.valley
            return a.recipe.label.localeCompare(b.recipe.label)
          }) ?? []
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index]
        const x = 220 + depth * 280
        const y = 40 + index * 170
        defaultRecipePositions[entry.recipe.id] = { x, y }
        maxRecipeX = Math.max(maxRecipeX, x + RECIPE_NODE_WIDTH)
        maxRecipeY = Math.max(maxRecipeY, y + RECIPE_NODE_HEIGHT)
      }
    }

    const rootPositions: Record<string, { x: number; y: number }> = {}
    let maxRootY = 0
    for (let index = 0; index < recipeInputRoots.length; index += 1) {
      const resource = recipeInputRoots[index]
      const x = 26
      const y = 62 + index * 58
      rootPositions[resource] = { x, y }
      maxRootY = Math.max(maxRootY, y + 32)
    }

    const width = Math.max(920, maxRecipeX + 80)
    const height = Math.max(540, Math.max(maxRecipeY, maxRootY) + 90)
    return {
      defaultRecipePositions,
      rootPositions,
      width,
      height,
    }
  }, [recipeGraphEntries, recipeInputRoots])

  const resolvedRecipeNodePositions = useMemo(() => {
    const resolved: Record<string, { x: number; y: number }> = {}
    for (const entry of recipeGraphEntries) {
      resolved[entry.recipe.id] = recipeNodePositions[entry.recipe.id] ?? recipeGraphLayout.defaultRecipePositions[entry.recipe.id]
    }
    return resolved
  }, [recipeGraphEntries, recipeGraphLayout.defaultRecipePositions, recipeNodePositions])

  const recipeGraphEdges = useMemo(() => {
    const edges: Array<{
      key: string
      ingredient: string
      sx: number
      sy: number
      tx: number
      ty: number
    }> = []
    for (const entry of recipeGraphEntries) {
      const target = resolvedRecipeNodePositions[entry.recipe.id]
      if (!target) continue
      const ingredients = Object.keys(entry.recipe.cost).sort((a, b) => resourceLabel(a).localeCompare(resourceLabel(b)))
      for (let index = 0; index < ingredients.length; index += 1) {
        const ingredient = ingredients[index]
        const laneOffset = (index - (ingredients.length - 1) / 2) * 11
        const targetY = target.y + RECIPE_NODE_HEIGHT / 2 + laneOffset
        const sourceRecipe = recipeOutputToEntry.get(ingredient)
        if (sourceRecipe) {
          const source = resolvedRecipeNodePositions[sourceRecipe.recipe.id]
          if (!source) continue
          edges.push({
            key: `${sourceRecipe.recipe.id}->${entry.recipe.id}:${ingredient}`,
            ingredient,
            sx: source.x + RECIPE_NODE_WIDTH,
            sy: source.y + RECIPE_NODE_HEIGHT / 2 + laneOffset * 0.35,
            tx: target.x,
            ty: targetY,
          })
          continue
        }

        const root = recipeGraphLayout.rootPositions[ingredient]
        if (!root) continue
        edges.push({
          key: `root:${ingredient}->${entry.recipe.id}`,
          ingredient,
          sx: root.x + RECIPE_ROOT_WIDTH,
          sy: root.y + 15 + laneOffset * 0.25,
          tx: target.x,
          ty: targetY,
        })
      }
    }
    return edges
  }, [recipeGraphLayout.rootPositions, recipeGraphEntries, recipeOutputToEntry, resolvedRecipeNodePositions])

  const stationOptions = useMemo(
    () => Object.values(CRAFTING_STATIONS).sort((a, b) => a.label.localeCompare(b.label)),
    [],
  )

  const placementShortcutText = useMemo(
    () =>
      canPlace(placementIntent)
        ? `Placing ${selectedBuildLabel ?? placementIntent.selectedBuildId}: Hold left to preview · Release to place · Shift locks straight line · Right click cancels stroke · R rotate · Esc cancel`
        : 'Right drag pans · Mouse wheel zoom · Alt+right click removes · B toggles build mode',
    [placementIntent, selectedBuildLabel],
  )

  const sidebarDiagnostics = useMemo<SidebarDiagnostics>(
    () => ({
      fps: latestTimingSnapshot.performance.fps,
      frameMs: latestTimingSnapshot.performance.frameMs,
      updateMs: latestTimingSnapshot.performance.updateMs,
      drawMs: latestTimingSnapshot.performance.drawMs,
      pingMs: backendPingMs,
      packetsIn: multiplayerNetworkDiagnostics.packetsIn,
      packetsOut: multiplayerNetworkDiagnostics.packetsOut,
      bytesIn: multiplayerNetworkDiagnostics.bytesIn,
      bytesOut: multiplayerNetworkDiagnostics.bytesOut,
      socketStatus: multiplayerSocketStatus,
    }),
    [
      backendPingMs,
      latestTimingSnapshot.performance.drawMs,
      latestTimingSnapshot.performance.fps,
      latestTimingSnapshot.performance.frameMs,
      latestTimingSnapshot.performance.updateMs,
      multiplayerNetworkDiagnostics.bytesIn,
      multiplayerNetworkDiagnostics.bytesOut,
      multiplayerNetworkDiagnostics.packetsIn,
      multiplayerNetworkDiagnostics.packetsOut,
      multiplayerSocketStatus,
    ],
  )

  const appendDebugEntry = useCallback((level: DebugLogLevel, message: string) => {
    const nextId = debugEntryIdRef.current
    debugEntryIdRef.current += 1
    setDebugEntries((current) => {
      const next = [...current, { id: nextId, level, message }]
      if (next.length <= 120) return next
      return next.slice(next.length - 120)
    })
  }, [])

  const debugCommandContext = useMemo<DebugCommandContext>(
    () => ({
      api: canvasActions?.debug ?? null,
      setRecipeFocus: setRecipeFocusId,
      recipeIds: new Set(recipeList.map((recipe) => recipe.id)),
    }),
    [canvasActions, recipeList],
  )

  const runDebugCommand = useCallback(
    (input: string) => {
      appendDebugEntry('info', `> ${input}`)
      const result = executeDebugCommand(input, debugCommandContext)
      appendDebugEntry(result.ok ? 'success' : 'error', result.message)
    },
    [appendDebugEntry, debugCommandContext],
  )

  useEffect(() => {
    const unsubscribe = inputSystem.onPress((action) => {
      if (action === 'cancel_placement') {
        setPlacementEnabled(false)
      }
      if (action === 'toggle_placement' && selectedBuildId && economy.unlocked[selectedBuildId]) {
        setPlacementEnabled((current) => !current)
      }
      if (action === 'rotate_clockwise') rotateDirection()
    })
    return unsubscribe
  }, [economy.unlocked, inputSystem, rotateDirection, selectedBuildId])

  useEffect(() => {
    const resetDebugHotkey = () => {
      debugHotkeyStepRef.current = { sawD: false, expiresAtMs: 0 }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) return

      const key = event.key.toLowerCase()
      if (!event.ctrlKey || !event.shiftKey) {
        if (key !== 'control' && key !== 'shift') {
          resetDebugHotkey()
        }
        return
      }

      if (event.repeat) return
      const now = Date.now()
      if (now > debugHotkeyStepRef.current.expiresAtMs) {
        debugHotkeyStepRef.current.sawD = false
      }

      if (key === 'd') {
        debugHotkeyStepRef.current = { sawD: true, expiresAtMs: now + 1600 }
        event.preventDefault()
        return
      }

      if (key === 'b' && debugHotkeyStepRef.current.sawD) {
        resetDebugHotkey()
        setDebugWindowOpen((current) => !current)
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'control' || key === 'shift') {
        resetDebugHotkey()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    if (!recipeGraphViewportEl) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = recipeGraphViewportEl.getBoundingClientRect()
      const pointerX = event.clientX - rect.left
      const pointerY = event.clientY - rect.top
      const current = recipeGraphViewRef.current
      const nextScale = clamp(current.scale * (event.deltaY < 0 ? 1.1 : 0.9), 0.45, 2.4)
      if (nextScale === current.scale) return
      const graphX = (pointerX - current.offsetX) / current.scale
      const graphY = (pointerY - current.offsetY) / current.scale
      recipeGraphViewRef.current = {
        scale: nextScale,
        offsetX: pointerX - graphX * nextScale,
        offsetY: pointerY - graphY * nextScale,
      }
      applyRecipeGraphView()
    }

    recipeGraphViewportEl.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      recipeGraphViewportEl.removeEventListener('wheel', onWheel)
    }
  }, [applyRecipeGraphView, recipeGraphViewportEl])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = recipeNodeDragRef.current
      if (drag) {
        const pointer = screenToRecipeGraphPoint(event.clientX, event.clientY)
        if (!pointer) return
        const maxX = Math.max(8, recipeGraphLayout.width - RECIPE_NODE_WIDTH - 8)
        const maxY = Math.max(8, recipeGraphLayout.height - RECIPE_NODE_HEIGHT - 8)
        const x = clamp(pointer.x - drag.offsetX, 8, maxX)
        const y = clamp(pointer.y - drag.offsetY, 8, maxY)

        setRecipeNodePositions((current) => ({
          ...current,
          [drag.recipeId]: { x, y },
        }))
        return
      }

      const pan = recipeGraphPanRef.current
      if (!pan?.active) return
      const dx = event.clientX - pan.lastClientX
      const dy = event.clientY - pan.lastClientY
      pan.lastClientX = event.clientX
      pan.lastClientY = event.clientY
      recipeGraphViewRef.current = {
        ...recipeGraphViewRef.current,
        offsetX: recipeGraphViewRef.current.offsetX + dx,
        offsetY: recipeGraphViewRef.current.offsetY + dy,
      }
      applyRecipeGraphView()
    }

    const endDrag = () => {
      recipeGraphPanRef.current = null
      recipeNodeDragRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [applyRecipeGraphView, recipeGraphLayout.height, recipeGraphLayout.width, screenToRecipeGraphPoint])

  useEffect(() => {
    if (!resolvedLobbyId) {
      navigate('/lobby')
    }
  }, [navigate, resolvedLobbyId])

  return (
    <EconomyStoreProvider store={economyStore}>
      <TimingStoreProvider store={timingStore}>
        <div className={`app ${serverConnectionBlocked ? 'app-server-blocked' : ''}`}>
          <GameSidebar
            onNavigateTitle={navigateToTitle}
            onNavigateLobby={navigateToLobby}
            onNavigateProfile={navigateToProfile}
            performanceHudEnabled={performanceHudEnabled}
            diagnostics={sidebarDiagnostics}
            chatWindowOpen={chatWindowOpen}
            inventoryWindowOpen={inventoryWindowOpen}
            recipesWindowOpen={recipesWindowOpen}
            timingWindowOpen={timingWindowOpen}
            settingsWindowOpen={settingsWindowOpen}
            onToggleChatWindow={toggleChatWindow}
            onToggleInventoryWindow={toggleInventoryWindow}
            onToggleRecipesWindow={toggleRecipesWindow}
            onToggleTimingWindow={toggleTimingWindow}
            onToggleSettingsWindow={toggleSettingsWindow}
            selectedBuildId={selectedBuildId}
            selectedBuildLabel={selectedBuildLabel}
            selectedBuildCost={selectedBuildCost}
            selectedBuildAffordable={selectedBuildAffordable}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={selectBuildCategory}
            collapsedCategoryIds={collapsedBuildCategoryIds}
            onToggleCategoryCollapsed={toggleBuildCategoryCollapsed}
            onSelectBuildItem={selectBuildItem}
            economy={economy}
            bridgeTier={bridgeTier}
            manualCraftQueue={manualCraftQueue}
            manualQueueChips={manualQueueChips}
            manualCraftTickMs={manualCraftTickMs}
            activeManualCraft={activeManualCraft}
            canvasActionsReady={Boolean(canvasActions)}
            onQueueManualRecipe={queueManualRecipe}
            onCraftRecipe={craftRecipeInstant}
            onUnlock={unlockBuildById}
            formatCost={formatCost}
            resourceLabel={resourceLabel}
            maxManualQueueUnique={MAX_MANUAL_QUEUE_UNIQUE}
          />

          <main className="main">
            <div className="canvas-wrap" ref={canvasWrapRef}>
              <ShaderBackdrop />
              <GameCanvas
                placementIntent={placementIntent}
                placementDirection={placementDirection}
                inputSystem={inputSystem}
                onEconomyChange={setEconomy}
                onTimingChange={handleTimingChange}
                onProgressionTierChange={setBridgeTier}
                onBindActions={setCanvasActions}
                multiplayerEnabled={Boolean(resolvedLobbyId)}
                multiplayerSnapshot={incomingMultiplayerSnapshot}
                onMultiplayerStateChange={handleMultiplayerStateChange}
                lockstepBootstrap={lockstepBootstrap}
                snapshotRequestVersion={snapshotRequestVersion}
                drainLockstepTicks={drainLockstepTicks}
                onMultiplayerCommand={handleLockstepCommand}
                remotePresences={remotePresences}
                overlaySettings={multiplayerOverlaySettings}
                onLocalPresenceUpdate={handleLocalPresenceUpdate}
              />
              <CanvasShortcutOverlay shortcutText={placementShortcutText} />

              {showJoinLoadingOverlay ? (
                <div className="game-loading-overlay" role="status" aria-live="polite">
                  <section className="game-loading-card">
                    <h2 className="game-loading-title">Loading</h2>
                    <p className="game-loading-text">{joinLoadingMessage}</p>
                    <div className="game-loading-progress" aria-hidden="true">
                      <span className="game-loading-progress-fill" style={{ width: `${joinLoadingProgress}%` }} />
                    </div>
                  </section>
                </div>
              ) : null}

              <ChatFloatingWindow
                open={chatWindowOpen}
                lobbyId={resolvedLobbyId ?? ''}
                containerRef={canvasWrapRef}
                onClose={hideChatWindow}
              />

              <InventoryFloatingWindow
                open={inventoryWindowOpen}
                containerRef={canvasWrapRef}
                pinnedResourceIds={pinnedResourceIds}
                onTogglePin={toggleResourcePin}
                onClose={hideInventoryWindow}
              />

              <RecipesFloatingWindow
                open={recipesWindowOpen}
                containerRef={canvasWrapRef}
                onClose={hideRecipesWindow}
                recipeGraphEntries={recipeGraphEntries}
                recipeListLength={recipeList.length}
                recipeSearch={recipeSearch}
                setRecipeSearch={setRecipeSearch}
                recipeValleyFilter={recipeValleyFilter}
                setRecipeValleyFilter={setRecipeValleyFilter}
                recipeStationFilter={recipeStationFilter}
                setRecipeStationFilter={setRecipeStationFilter}
                stationOptions={stationOptions}
                recipeAvailableOnly={recipeAvailableOnly}
                setRecipeAvailableOnly={setRecipeAvailableOnly}
                recipeAffordableOnly={recipeAffordableOnly}
                setRecipeAffordableOnly={setRecipeAffordableOnly}
                setRecipeNodePositions={setRecipeNodePositions}
                focusedRecipeLabel={focusedRecipe?.label ?? null}
                clearFocusedRecipe={clearRecipeFocus}
                resetRecipeView={resetRecipeView}
                setRecipeGraphViewportNode={setRecipeGraphViewportNode}
                recipeGraphPanRef={recipeGraphPanRef}
                setRecipeGraphTransformNode={setRecipeGraphTransformNode}
                recipeGraphLayout={recipeGraphLayout}
                recipeGraphEdges={recipeGraphEdges}
                recipeInputRoots={recipeInputRoots}
                resolvedRecipeNodePositions={resolvedRecipeNodePositions}
                recipeFocusId={recipeFocusId}
                toggleRecipeFocus={toggleRecipeFocus}
                recipeNodeDragRef={recipeNodeDragRef}
                screenToRecipeGraphPoint={screenToRecipeGraphPoint}
                resourceLabel={resourceLabel}
                ingredientEdgeColor={ingredientEdgeColor}
              />

              <TimingFloatingWindow open={timingWindowOpen} containerRef={canvasWrapRef} onClose={hideTimingWindow} />

              <SettingsFloatingWindow
                open={settingsWindowOpen}
                containerRef={canvasWrapRef}
                settings={multiplayerOverlaySettings}
                onChange={setMultiplayerOverlaySettings}
                performanceHudEnabled={performanceHudEnabled}
                onTogglePerformanceHud={setPerformanceHudEnabled}
                onClose={hideSettingsWindow}
              />

              <DebugFloatingWindow
                open={debugWindowOpen}
                containerRef={canvasWrapRef}
                entries={debugEntries}
                onExecute={runDebugCommand}
                onClear={clearDebugEntries}
                onClose={hideDebugWindow}
              />

              {serverConnectionBlocked ? (
                <div
                  className="server-blocking-modal-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="server-blocking-title"
                >
                  <section className="server-blocking-modal">
                    <h2 id="server-blocking-title" className="server-blocking-modal-title">
                      Server Connection Lost
                    </h2>
                    <p className="server-blocking-modal-text">{serverConnectionBlockedMessage}</p>
                    <p className="server-blocking-modal-meta">
                      close code {serverConnectionBlocked.code}
                      {serverConnectionBlocked.wasClean ? ' (clean close)' : ' (abnormal close)'}
                    </p>
                    {rejoinInFlight || multiplayerSocketStatus === 'connecting' ? (
                      <p className="server-blocking-modal-meta" aria-live="polite">
                        Joining...
                      </p>
                    ) : null}
                    <div className="server-blocking-modal-actions">
                      <GodhandButtonBase
                        className="ui-button server-blocking-modal-rejoin-button"
                        onClick={handleTryRejoin}
                        disabled={!resolvedLobbyId || rejoinInFlight || rejoinCooldownSeconds > 0}
                      >
                        {rejoinInFlight
                          ? 'Trying Rejoin...'
                          : rejoinCooldownSeconds > 0
                            ? `Rejoin (${rejoinCooldownSeconds}s)`
                            : 'Rejoin'}
                      </GodhandButtonBase>
                      <GodhandButtonBase
                        className="ui-button"
                        onClick={() => {
                          void navigateAfterLeavingLobby('/lobby')
                        }}
                      >
                        Return to Lobby
                      </GodhandButtonBase>
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </TimingStoreProvider>
    </EconomyStoreProvider>
  )
}
