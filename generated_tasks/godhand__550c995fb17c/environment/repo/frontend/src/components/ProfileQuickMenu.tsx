import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GodhandButtonBase from './GodhandButtonBase'
import {
  getAuthErrorMessage,
  getCurrentUser,
  logout,
  resetToLoggedOutHome,
  type PublicUser,
} from '../lib/authApi'

const HIDDEN_ROUTES = new Set(['/login', '/register'])
const GAME_ROUTE = '/game'

type ProfileQuickMenuProps = {
  variant?: 'dock' | 'inline'
}

function hasAccessCsrfCookie(): boolean {
  return /(?:^|;\s*)csrf_access_token=/.test(document.cookie)
}

export default function ProfileQuickMenu({ variant = 'dock' }: ProfileQuickMenuProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [user, setUser] = useState<PublicUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isHiddenRoute =
    HIDDEN_ROUTES.has(location.pathname) || (variant === 'dock' && location.pathname === GAME_ROUTE)
  const usernameLabel = useMemo(() => user?.username ?? 'Profile', [user?.username])
  const rootClassName = variant === 'inline' ? 'profile-dock profile-dock-inline' : 'profile-dock'

  useEffect(() => {
    setMenuOpen(false)
    setErrorMessage('')
    if (isHiddenRoute || !hasAccessCsrfCookie()) {
      setUser(null)
      return
    }

    let isMounted = true
    async function loadUser() {
      try {
        const result = await getCurrentUser()
        if (!isMounted) return
        setUser(result.user)
      } catch {
        if (!isMounted) return
        setUser(null)
      }
    }

    void loadUser()
    return () => {
      isMounted = false
    }
  }, [isHiddenRoute, location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current) return
      if (event.target instanceof Node && rootRef.current.contains(event.target)) return
      setMenuOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [menuOpen])

  async function onLogout() {
    if (isLoggingOut) return
    setErrorMessage('')
    setIsLoggingOut(true)
    try {
      await logout()
      setUser(null)
      setMenuOpen(false)
      resetToLoggedOutHome()
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isHiddenRoute || !user) return null

  return (
    <div ref={rootRef} className={rootClassName}>
      <GodhandButtonBase
        type="button"
        className="profile-dock-toggle"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`Open profile menu for ${usernameLabel}`}
        onClick={() => {
          setMenuOpen((open) => !open)
        }}
      >
        <svg
          className="profile-dock-toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 19.5a7.5 7.5 0 0 1 15 0" />
        </svg>
      </GodhandButtonBase>
      {menuOpen ? (
        <div className="profile-dock-menu" role="menu" aria-label="Profile menu">
          <p className="profile-dock-username">{user.username}</p>
          <GodhandButtonBase
            type="button"
            role="menuitem"
            className="ui-button profile-dock-menu-button"
            onClick={() => {
              setMenuOpen(false)
              if (location.pathname !== '/profile') navigate('/profile')
            }}
          >
            Profile
          </GodhandButtonBase>
          <GodhandButtonBase
            type="button"
            role="menuitem"
            className="ui-button profile-dock-menu-button"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </GodhandButtonBase>
          {errorMessage ? <p className="profile-dock-error">{errorMessage}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
