import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GodhandButtonBase from '../../components/GodhandButtonBase'
import { getCurrentUser } from '../../lib/authApi'
import { checkBackendHealth } from '../../lib/healthApi'
import ShaderBackdrop from '../game/components/ShaderBackdrop'
import AuthFloatingWindow, { type AuthMode } from './components/AuthFloatingWindow'
import TitleWordShader from './components/TitleWordShader'

type TitleView = 'menu' | 'auth'

type FloatingRect = {
  x: number
  y: number
  width: number
  height: number
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
}

function viewportSize() {
  if (typeof window === 'undefined') {
    return { width: 1366, height: 768 }
  }
  return { width: window.innerWidth, height: window.innerHeight }
}

function centeredAuthRect(
  viewportWidth: number,
  viewportHeight: number,
  mode: AuthMode,
): FloatingRect {
  const compactLayout = viewportWidth < 760
  const minWidth = 340
  const targetWidth = compactLayout
    ? Math.min(viewportWidth * 0.88, 420)
    : Math.min(viewportWidth * 0.34, 520)
  const minHeight = mode === 'register' ? 380 : 392
  const topPadding = compactLayout ? 12 : 18
  const bottomPadding = compactLayout ? 28 : 34
  const targetHeight = compactLayout
    ? mode === 'register'
      ? 500
      : 492
    : mode === 'register'
      ? 455
      : 452
  const width = Math.round(clamp(targetWidth, minWidth, viewportWidth - 16))
  const maxHeight = Math.max(minHeight, viewportHeight - topPadding - bottomPadding)
  const height = Math.round(clamp(targetHeight, minHeight, maxHeight))
  const x = Math.round(clamp((viewportWidth - width) * 0.5, 8, viewportWidth - width - 8))
  const y = Math.round(
    clamp((viewportHeight - height) * 0.5, topPadding, viewportHeight - height - bottomPadding),
  )
  return { x, y, width, height }
}

export default function TitleScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const authParam = searchParams.get('auth')
  const oauthError = searchParams.get('auth_error')
  const oauthReason = searchParams.get('oauth_reason')
  const [authMode, setAuthMode] = useState<AuthMode>(authParam === 'register' ? 'register' : 'login')
  const [activeView, setActiveView] = useState<TitleView>(() => {
    if (authParam === 'register' || authParam === 'login' || oauthError === 'oauth') return 'auth'
    return 'menu'
  })
  const [backendHealth, setBackendHealth] = useState<'checking' | 'up' | 'down'>('checking')
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false)
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'anonymous'>('checking')
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [viewport, setViewport] = useState(viewportSize)

  const shellRef = useRef<HTMLElement | null>(null)
  const isMountedRef = useRef(true)
  const authRect = useMemo(
    () => centeredAuthRect(viewport.width, viewport.height, authMode),
    [authMode, viewport.height, viewport.width],
  )
  const appVersion = useMemo(() => {
    const rawVersion =
      typeof import.meta.env.VITE_APP_VERSION === 'string' ? import.meta.env.VITE_APP_VERSION.trim() : ''
    if (!rawVersion) return 'v0.0.0'
    return rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`
  }, [])
  const healthTone = backendHealth === 'down' ? 'down' : backendHealth === 'checking' ? 'checking' : 'up'
  const healthText =
    backendHealth === 'down'
      ? 'Servers offline'
      : backendHealth === 'checking'
        ? 'Checking servers'
        : 'Main server online'

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => {
      setViewport(viewportSize())
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const openAuthView = useCallback(
    (mode: AuthMode) => {
      setAuthMode(mode)
      setActiveView('auth')
    },
    [],
  )

  const handleSelectStart = useCallback(() => {
    if (authStatus === 'authenticated') {
      navigate('/lobby')
      return
    }
    openAuthView('login')
  }, [authStatus, navigate, openAuthView])

  const handleBackToMenu = useCallback(() => {
    setActiveView('menu')
  }, [])

  const runHealthCheck = useCallback(async (manualRefresh = false) => {
    if (manualRefresh && isMountedRef.current) setIsRefreshingHealth(true)
    const isHealthy = await checkBackendHealth()
    if (!isMountedRef.current) return
    const nextStatus = isHealthy ? 'up' : 'down'
    setBackendHealth((current) => (current === nextStatus ? current : nextStatus))
    if (manualRefresh) setIsRefreshingHealth(false)
  }, [])
  const handleRefreshHealth = useCallback(() => {
    if (isRefreshingHealth) return
    void runHealthCheck(true)
  }, [isRefreshingHealth, runHealthCheck])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void runHealthCheck()
    }, 0)
    const intervalId = window.setInterval(() => {
      void runHealthCheck()
    }, 30000)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [runHealthCheck])

  useEffect(() => {
    let isMounted = true

    const runSessionCheck = async () => {
      try {
        const result = await getCurrentUser()
        if (!isMounted) return
        setCurrentUsername(result.user.username)
        setAuthStatus('authenticated')
      } catch {
        if (!isMounted) return
        setCurrentUsername(null)
        setAuthStatus('anonymous')
      }
    }

    void runSessionCheck()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main ref={shellRef} className="landing-shell title-screen-shell">
      <ShaderBackdrop />
      <div
        className={`landing-health-banner landing-health-banner-${healthTone}`}
        role="status"
        aria-live="polite"
      >
        <span className="landing-health-dot" aria-hidden="true" />
        <span className="landing-health-text">{healthText}</span>
        <span className="landing-health-version">{appVersion}</span>
        {backendHealth === 'down' ? (
          <GodhandButtonBase
            type="button"
            className="landing-health-refresh-button"
            onClick={handleRefreshHealth}
            disabled={isRefreshingHealth}
          >
            {isRefreshingHealth ? 'Retrying...' : 'Retry'}
          </GodhandButtonBase>
        ) : null}
      </div>
      <section className="title-screen-center" aria-label="Project Godhand title screen">
        <header className="title-screen-logo-stack">
          <TitleWordShader text="PROJECT" className="title-screen-word title-cinzel" showRing={false} />
          <TitleWordShader
            text="GODHAND"
            className="title-screen-word title-screen-word-bottom title-cinzel"
            showRing
          />
        </header>

        <nav className="title-primary-menu" aria-label="Primary menu">
          <GodhandButtonBase type="button" className="ui-button title-menu-button" onClick={handleSelectStart}>
            <span className="title-menu-button-label">
              {authStatus === 'authenticated' ? 'Continue' : 'Enter'}
            </span>
          </GodhandButtonBase>
        </nav>

        {authStatus === 'authenticated' ? (
          <p className="title-session-note" aria-live="polite">
            <span className="title-session-note-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 19.5a7.5 7.5 0 0 1 15 0" />
              </svg>
            </span>
            Signed in as <strong>{currentUsername ?? 'Player'}</strong>
          </p>
        ) : null}
      </section>
      {activeView === 'auth' && authStatus === 'anonymous' ? (
        <AuthFloatingWindow
          containerRef={shellRef}
          initialRect={authRect}
          mode={authMode}
          onModeChange={setAuthMode}
          oauthError={oauthError}
          oauthReason={oauthReason}
          onClose={handleBackToMenu}
          className="landing-floating-window"
        />
      ) : null}
    </main>
  )
}
