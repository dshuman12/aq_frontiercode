import { memo, useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import { API_BASE_URL } from '../../../../lib/apiBase'
import { getCurrentUser } from '../../../../lib/authApi'
import ProfileQuickMenu from '../../../../components/ProfileQuickMenu'
import FloatingWindow from '../FloatingWindow'

type UiMessage = {
  id: string
  sender: 'user' | 'other' | 'system'
  text: string
  timestamp: Date
}

type ChatWireMessage = {
  type?: unknown
  user?: unknown
  text?: unknown
  detail?: unknown
  ts?: unknown
  messages?: unknown
}

type ChatFloatingWindowProps = {
  open: boolean
  lobbyId: string
  containerRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}

type ChatFloatingWindowBodyProps = {
  open: boolean
  lobbyId: string
  containerRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}

const CHAT_DEFAULT_WIDTH = 360
const CHAT_DEFAULT_HEIGHT = 300
const CHAT_BOTTOM_LIFT_PX = 56
const CHAT_RECONNECT_MAX_DELAY_MS = 5000

function resolveChatInitialRect() {
  const viewportHeight = typeof window === 'undefined' ? CHAT_DEFAULT_HEIGHT + 16 : window.innerHeight
  return {
    x: 9999,
    y: Math.max(8, viewportHeight - CHAT_DEFAULT_HEIGHT - 8 - CHAT_BOTTOM_LIFT_PX),
    width: CHAT_DEFAULT_WIDTH,
    height: CHAT_DEFAULT_HEIGHT,
  }
}

function buildLobbyWebSocketUrl(lobbyId: string): string {
  const baseUrl = new URL(API_BASE_URL)
  const wsProtocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProtocol}//${baseUrl.host}/api/v1/ws/lobby/${encodeURIComponent(lobbyId)}`
}

function parseMessageTimestamp(rawTs: unknown): Date {
  if (typeof rawTs === 'number' && Number.isFinite(rawTs)) {
    return new Date(rawTs * 1000)
  }
  return new Date()
}

function parseHistoryMessages(rawMessages: unknown, currentUsername: string | null): UiMessage[] {
  if (!Array.isArray(rawMessages)) return []
  const history: UiMessage[] = []
  for (const raw of rawMessages) {
    if (!raw || typeof raw !== 'object') continue
    const message = raw as ChatWireMessage
    if (typeof message.text !== 'string') continue
    const sender =
      message.type === 'system'
        ? 'system'
        : typeof message.user === 'string' && message.user === currentUsername
          ? 'user'
          : 'other'
    const text =
      message.type === 'system'
        ? message.text
        : typeof message.user === 'string' && message.user !== currentUsername
          ? `${message.user}: ${message.text}`
          : message.text
    history.push({
      id: crypto.randomUUID(),
      sender,
      text,
      timestamp: parseMessageTimestamp(message.ts),
    })
  }
  return history
}

function ChatFloatingWindowComponent({
  open,
  lobbyId,
  containerRef,
  onClose,
}: ChatFloatingWindowProps) {
  return (
    <ChatFloatingWindowBody
      open={open}
      lobbyId={lobbyId}
      containerRef={containerRef}
      onClose={onClose}
    />
  )
}

function ChatFloatingWindowBody({
  open,
  lobbyId,
  containerRef,
  onClose,
}: ChatFloatingWindowBodyProps) {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'open' | 'closed' | 'error'
  >('connecting')
  const [chatConnectionError, setChatConnectionError] = useState(false)
  const [reconnectVersion, setReconnectVersion] = useState(0)

  const socketRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pendingOutgoingTextsRef = useRef<string[]>([])
  const currentUsernameRef = useRef<string | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptRef = useRef(0)

  useEffect(() => {
    currentUsernameRef.current = currentUsername
  }, [currentUsername])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const addUiMessage = useCallback((message: UiMessage) => {
    setMessages((prev) => [...prev, message])
  }, [])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current === null) return
    window.clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = null
  }, [])

  const scheduleAutoReconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) return
    const nextAttempt = reconnectAttemptRef.current + 1
    reconnectAttemptRef.current = nextAttempt
    const delayMs = Math.min(1000 * 2 ** (nextAttempt - 1), CHAT_RECONNECT_MAX_DELAY_MS)
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null
      setReconnectVersion((current) => current + 1)
    }, delayMs)
  }, [])

  const handleManualRetry = useCallback(() => {
    clearReconnectTimer()
    reconnectAttemptRef.current = 0
    const socket = socketRef.current
    if (socket) {
      try {
        socket.close()
      } catch {
        // ignore close errors; a fresh socket attempt is started below
      }
      socketRef.current = null
    }
    setChatConnectionError(false)
    setConnectionStatus('connecting')
    setReconnectVersion((current) => current + 1)
  }, [clearReconnectTimer])

  useEffect(() => {
    void (async () => {
      try {
        const data = await getCurrentUser()
        const username = data.user?.username ?? null
        setCurrentUsername(username)
        currentUsernameRef.current = username
      } catch (err) {
        console.error('Failed to load current user', err)
      }
    })()
  }, [])

  useEffect(() => {
    if (!lobbyId) return
    setConnectionStatus('connecting')
    setChatConnectionError(false)
    let disposed = false
    let socket: WebSocket | null = null

    void (async () => {
      try {
        const data = await getCurrentUser()
        if (disposed) return
        const username = data.user?.username ?? null
        setCurrentUsername(username)
        currentUsernameRef.current = username
      } catch {
        if (disposed) return
        setConnectionStatus('error')
        setChatConnectionError(true)
        scheduleAutoReconnect()
        return
      }

      const wsUrl = buildLobbyWebSocketUrl(lobbyId)
      socket = new WebSocket(wsUrl)
      socketRef.current = socket
      const isActiveSocket = () => !disposed && socketRef.current === socket

      socket.onopen = () => {
        if (!isActiveSocket()) return
        clearReconnectTimer()
        reconnectAttemptRef.current = 0
        setChatConnectionError(false)
        setConnectionStatus('open')
      }

      socket.onmessage = (event) => {
        if (!isActiveSocket()) return
        try {
          const data = JSON.parse(event.data) as ChatWireMessage
          const latestUsername = currentUsernameRef.current

          if (data.type === 'history') {
            setMessages(parseHistoryMessages(data.messages, latestUsername))
            return
          }

          if (data.type === 'error') {
            addUiMessage({
              id: crypto.randomUUID(),
              sender: 'system',
              text: `Error: ${typeof data.detail === 'string' ? data.detail : 'Unknown error'}`,
              timestamp: new Date(),
            })
            return
          }

          if (data.type === 'system' && typeof data.text === 'string') {
            addUiMessage({
              id: crypto.randomUUID(),
              sender: 'system',
              text: data.text,
              timestamp: parseMessageTimestamp(data.ts),
            })
            return
          }

          if (typeof data.text === 'string') {
            const pendingIndex = pendingOutgoingTextsRef.current.findIndex(
              (pendingText) => pendingText === data.text && data.user === latestUsername,
            )

            if (pendingIndex !== -1) {
              pendingOutgoingTextsRef.current.splice(pendingIndex, 1)
              return
            }

            addUiMessage({
              id: crypto.randomUUID(),
              sender: data.user === latestUsername ? 'user' : 'other',
              text:
                data.user === latestUsername
                  ? data.text
                  : typeof data.user === 'string'
                    ? `${data.user}: ${data.text}`
                    : data.text,
              timestamp: parseMessageTimestamp(data.ts),
            })
          }
        } catch {
          addUiMessage({
            id: crypto.randomUUID(),
            sender: 'system',
            text: 'Received invalid message from server.',
            timestamp: new Date(),
          })
        }
      }

      socket.onerror = () => {
        if (!isActiveSocket()) return
        setConnectionStatus('error')
        setChatConnectionError(true)
        scheduleAutoReconnect()
      }

      socket.onclose = () => {
        if (!isActiveSocket()) return
        setConnectionStatus('closed')
        setChatConnectionError(true)
        scheduleAutoReconnect()
      }
    })()

    return () => {
      disposed = true
      socket?.close()
      if (socketRef.current === socket) {
        socketRef.current = null
      }
    }
  }, [lobbyId, addUiMessage, clearReconnectTimer, scheduleAutoReconnect, reconnectVersion])

  useEffect(() => {
    return () => {
      clearReconnectTimer()
    }
  }, [clearReconnectTimer])

  const handleSendMessage = useCallback(() => {
    const text = inputValue.trim()
    if (!text) return

    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setConnectionStatus('error')
      setChatConnectionError(true)
      scheduleAutoReconnect()
      return
    }

    socket.send(JSON.stringify({ text }))
    pendingOutgoingTextsRef.current.push(text)

    addUiMessage({
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      timestamp: new Date(),
    })

    setInputValue('')
  }, [inputValue, addUiMessage, scheduleAutoReconnect])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  const chatReady = connectionStatus === 'open'
  const selfLabel = currentUsername && currentUsername.trim().length > 0 ? currentUsername : 'you'

  return (
    <>
      {open && (
        <FloatingWindow
          title="Chat"
          containerRef={containerRef}
          initialRect={resolveChatInitialRect()}
          minWidth={300}
          minHeight={250}
          className="chat-floating-window"
          onClose={onClose}
          headerActions={<ProfileQuickMenu variant="inline" />}
        >
          <div className="chat-window-container">
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty-state">
                  No messages yet. Say hello to everyone in this lobby.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-message ${
                      message.sender === 'user'
                        ? 'chat-message-user'
                        : message.sender === 'system'
                          ? 'chat-message-system'
                          : 'chat-message-other'
                    }`}
                  >
                    <span className="chat-message-line">
                      {message.sender === 'user'
                        ? `${selfLabel}: ${message.text}`
                        : message.sender === 'system'
                          ? `* ${message.text}`
                          : message.text}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
              {chatConnectionError ? (
                <div className="chat-connection-error" role="status" aria-live="polite">
                  <span>Connection error. Retry?</span>
                  <button type="button" className="chat-retry-button" onClick={handleManualRetry}>
                    Retry
                  </button>
                </div>
              ) : null}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={chatReady ? 'Press Enter to chat...' : 'Connecting chat...'}
                className="chat-input"
                disabled={!chatReady}
              />
            </div>
          </div>
        </FloatingWindow>
      )}
    </>
  )
}

const ChatFloatingWindow = memo(ChatFloatingWindowComponent)
ChatFloatingWindow.displayName = 'ChatFloatingWindow'

export default ChatFloatingWindow
