import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GodhandButtonBase from '../../components/GodhandButtonBase'
import { API_BASE_URL } from '../../lib/apiBase'
import { getAuthErrorMessage, getCurrentUser } from '../../lib/authApi'
import { measureBackendPingMs } from '../../lib/healthApi'
import ShaderBackdrop from '../game/components/ShaderBackdrop'

type LobbyPlayer = {
  userId: string
  username: string
  isOwner: boolean
  isOnline: boolean
}

type LobbyStatus = 'online' | 'full' | 'offline'

type LobbySummary = {
  id: string
  name: string
  region: string
  description: string
  status: LobbyStatus
  maxPlayers: number
  playerCount: number
  populationCount: number
  playersOnline: number
  players: LobbyPlayer[]
}

type JoinLobbyResponse = {
  lobby?: { id?: unknown; _id?: unknown } | null
  gameWsUrl?: unknown
}

function parseString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function parseBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function parseLobbyStatus(value: unknown): LobbyStatus {
  if (value === 'full') return 'full'
  if (value === 'offline') return 'offline'
  return 'online'
}

function parseLobbyPlayer(value: unknown): LobbyPlayer | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const userId = parseString(record.userId)
  if (!userId) return null
  return {
    userId,
    username: parseString(record.username, 'unknown'),
    isOwner: parseBoolean(record.isOwner),
    isOnline: parseBoolean(record.isOnline),
  }
}

function parseLobbySummary(value: unknown): LobbySummary | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = parseString(record.id)
  const name = parseString(record.name)
  if (!id || !name) return null

  const parsedPlayers: LobbyPlayer[] = Array.isArray(record.players)
    ? record.players
        .map(parseLobbyPlayer)
        .filter((player): player is LobbyPlayer => player !== null)
    : []

  const maxPlayers = Math.max(1, parseNumber(record.maxPlayers, 1))
  const playerCount = Math.max(0, parseNumber(record.playerCount, parsedPlayers.length))
  const populationCount = Math.max(0, parseNumber(record.populationCount, parsedPlayers.length))
  const playersOnline = Math.max(0, parseNumber(record.playersOnline, 0))

  return {
    id,
    name,
    region: parseString(record.region, 'Global'),
    description: parseString(record.description, 'Official hosted server.'),
    status: parseLobbyStatus(record.status),
    maxPlayers,
    playerCount,
    populationCount,
    playersOnline,
    players: parsedPlayers,
  }
}

function statusLabel(status: LobbyStatus): string {
  if (status === 'full') return 'Full'
  if (status === 'offline') return 'Offline'
  return 'Online'
}

function formatPing(pingMs: number | null | undefined): string {
  if (pingMs === undefined) return '...'
  if (pingMs === null) return 'n/a'
  return `${pingMs}ms`
}

function parseWsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function readCookie(name: string): string | null {
  const key = `${name}=`
  const parts = document.cookie.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(key)) continue
    return decodeURIComponent(trimmed.slice(key.length))
  }
  return null
}

export default function LobbyScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(null)
  const [oauthNoticeMessage, setOauthNoticeMessage] = useState('')
  const [isOauthNoticeVisible, setIsOauthNoticeVisible] = useState(false)
  const [lobbies, setLobbies] = useState<LobbySummary[]>([])
  const [pingByLobbyId, setPingByLobbyId] = useState<Record<string, number | null | undefined>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pingRequestIdRef = useRef(0)

  useEffect(() => {
    const notice = searchParams.get('oauth_notice')
    if (notice !== 'linked_existing_email') return

    setOauthNoticeMessage('Signed in with Google and linked to your existing account with the same email.')
    setIsOauthNoticeVisible(true)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('oauth_notice')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!isOauthNoticeVisible) return
    const timeoutId = window.setTimeout(() => {
      setIsOauthNoticeVisible(false)
    }, 6000)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isOauthNoticeVisible])

  const fetchLobbies = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/v1/lobbies?kind=official`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to fetch official servers.')
      }

      const payload = (await response.json()) as { lobbies?: unknown[] }
      const normalized = Array.isArray(payload.lobbies)
        ? payload.lobbies
            .map(parseLobbySummary)
            .filter((lobby): lobby is LobbySummary => lobby !== null)
        : []

      setLobbies(normalized)
      setPingByLobbyId((current) => {
        const next: Record<string, number | null | undefined> = {}
        for (const lobby of normalized) {
          next[lobby.id] = current[lobby.id] ?? undefined
        }
        return next
      })
      setSelectedLobbyId((current) => {
        if (current && normalized.some((lobby) => lobby.id === current)) return current
        return normalized[0]?.id ?? null
      })

      const pingRequestId = pingRequestIdRef.current + 1
      pingRequestIdRef.current = pingRequestId
      void (async () => {
        const pingMs = await measureBackendPingMs()
        if (pingRequestId !== pingRequestIdRef.current) return
        setPingByLobbyId((current) => {
          const next = { ...current }
          for (const lobby of normalized) {
            next[lobby.id] = pingMs
          }
          return next
        })
      })()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchLobbies()
    const intervalId = window.setInterval(() => {
      void fetchLobbies()
    }, 12000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [fetchLobbies])

  const selectedLobby = useMemo(() => {
    if (!selectedLobbyId) return lobbies[0] ?? null
    return lobbies.find((lobby) => lobby.id === selectedLobbyId) ?? lobbies[0] ?? null
  }, [lobbies, selectedLobbyId])

  const joinDisabled =
    !selectedLobby || loading || selectedLobby.status === 'offline' || selectedLobby.status === 'full'

  const handleJoinLobby = async () => {
    if (!selectedLobby) return

    try {
      setLoading(true)
      setError(null)

      await getCurrentUser()
      const accessCsrfToken = readCookie('csrf_access_token')
      if (!accessCsrfToken) throw new Error('Missing csrf_access_token. Please sign in again.')

      const response = await fetch(`${API_BASE_URL}/api/v1/lobbies/${selectedLobby.id}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-TOKEN': accessCsrfToken,
        },
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null
        throw new Error(parseString(payload?.detail, 'Failed to join server.'))
      }

      const joinPayload = (await response.json()) as JoinLobbyResponse
      const resolvedLobbyId = parseString(joinPayload.lobby?.id ?? joinPayload.lobby?._id, selectedLobby.id)
      const lobbyGameWsUrl = parseWsUrl(joinPayload.gameWsUrl)

      void fetchLobbies()
      navigate('/game', { state: { lobbyId: resolvedLobbyId, lobbyGameWsUrl } })
    } catch (err) {
      const authMessage = getAuthErrorMessage(err)
      if (authMessage !== 'Network error. Please try again.') {
        setError(authMessage)
      } else {
        setError(err instanceof Error ? err.message : authMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="lobby-shell">
      <ShaderBackdrop />
      <section className="lobby-panel lobby-browser-panel">
        <header className="lobby-header">
          <div className="lobby-header-copy">
            <h1 className="lobby-title title-cinzel">Official Servers</h1>
            <p className="lobby-subtitle">Choose a hosted realm and jump directly into multiplayer.</p>
          </div>
          <div className="lobby-header-actions">
            <GodhandButtonBase className="ui-button" onClick={() => navigate('/profile')}>
              Profile
            </GodhandButtonBase>
            <GodhandButtonBase className="ui-button lobby-back-button" onClick={() => navigate('/')} aria-label="Back to title">
              <svg viewBox="0 0 20 20" aria-hidden="true" className="lobby-back-button-icon">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </GodhandButtonBase>
          </div>
        </header>

        {isOauthNoticeVisible && oauthNoticeMessage ? (
          <div className="auth-alert auth-alert-success lobby-notice-banner" role="status">
            <span>{oauthNoticeMessage}</span>
            <GodhandButtonBase
              type="button"
              className="lobby-notice-dismiss"
              onClick={() => {
                setIsOauthNoticeVisible(false)
              }}
            >
              Dismiss
            </GodhandButtonBase>
          </div>
        ) : null}

        {error ? (
          <p className="auth-alert auth-alert-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="lobby-browser-layout">
          <section className="lobby-server-list-panel" aria-label="Official server list">
            <div className="lobby-server-list-head">
              <span>{loading ? 'Refreshing...' : `${lobbies.length} servers online`}</span>
              <GodhandButtonBase className="ui-button" onClick={() => void fetchLobbies()} disabled={loading}>
                Refresh
              </GodhandButtonBase>
            </div>

            <div className="lobby-server-list">
              {lobbies.length === 0 ? (
                <p className="lobby-empty-state">No official servers are available right now.</p>
              ) : (
                lobbies.map((lobby) => (
                  <GodhandButtonBase
                    key={lobby.id}
                    type="button"
                    className={`lobby-server-row ${selectedLobby?.id === lobby.id ? 'lobby-server-row-selected' : ''}`}
                    onClick={() => setSelectedLobbyId(lobby.id)}
                  >
                    <span
                      className={`lobby-status-dot ${
                        lobby.status === 'full'
                          ? 'lobby-status-dot-full'
                          : lobby.status === 'offline'
                            ? 'lobby-status-dot-offline'
                            : 'lobby-status-dot-online'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="lobby-server-row-main">
                      <span className="lobby-server-row-name">{lobby.name}</span>
                      <span className="lobby-server-row-meta">
                        <span>{lobby.region}</span>
                        <span className="lobby-server-ping">{formatPing(pingByLobbyId[lobby.id])}</span>
                      </span>
                    </span>
                    <span className="lobby-server-row-count">
                      {lobby.playerCount}/{lobby.maxPlayers} online
                    </span>
                  </GodhandButtonBase>
                ))
              )}
            </div>
          </section>

          <aside className="lobby-server-details" aria-label="Selected server details">
            {selectedLobby ? (
              <>
                <div className="lobby-server-badge-row">
                  <span className={`lobby-status-pill lobby-status-pill-${selectedLobby.status}`}>
                    {statusLabel(selectedLobby.status)}
                  </span>
                  <span className="lobby-server-region">{selectedLobby.region}</span>
                </div>

                <h2 className="lobby-server-title">{selectedLobby.name}</h2>
                <p className="lobby-server-description">{selectedLobby.description}</p>

                <div className="lobby-population-row">
                  <div className="lobby-population-label">
                    Online: {selectedLobby.playersOnline}/{selectedLobby.maxPlayers} | Population:{' '}
                    {selectedLobby.populationCount}/{selectedLobby.maxPlayers}
                  </div>
                  <div className="lobby-population-bar" aria-hidden="true">
                    <span
                      className="lobby-population-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((selectedLobby.playersOnline / selectedLobby.maxPlayers) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <section className="lobby-player-roster" aria-label="Current players">
                  <h3>Players</h3>
                  {selectedLobby.players.length === 0 ? (
                    <p className="lobby-empty-roster">No players connected yet.</p>
                  ) : (
                    <ul className="lobby-player-list">
                      {selectedLobby.players.map((player) => (
                        <li
                          key={player.userId}
                          className={`lobby-player-item ${player.isOnline ? 'lobby-player-item-online' : ''}`}
                        >
                          <span className="lobby-player-name">{player.username}</span>
                          <span className="lobby-player-tag">
                            {player.isOwner ? 'Owner' : player.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="lobby-action-stack">
                  <GodhandButtonBase className="ui-button lobby-join-button" disabled={joinDisabled} onClick={handleJoinLobby}>
                    {loading ? 'Joining...' : selectedLobby.status === 'full' ? 'Server Full' : 'Join Server'}
                  </GodhandButtonBase>
                </div>
              </>
            ) : (
              <p className="lobby-selection-empty">Select a server from the list to view details.</p>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}
