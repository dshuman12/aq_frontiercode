import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GodhandButtonBase from '../../components/GodhandButtonBase'
import {
  beginGoogleAccountLink,
  getAuthErrorMessage,
  getAuthValidationErrors,
  getCurrentUser,
  logout,
  resetToLoggedOutHome,
  unlinkGoogleAccount,
  updateCurrentUsername,
  type PublicUser,
} from '../../lib/authApi'
import ShaderBackdrop from '../game/components/ShaderBackdrop'

export default function ProfilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false)
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const handleBack = useCallback(() => {
    const historyState = window.history.state as { idx?: unknown } | null
    if (typeof historyState?.idx === 'number' && historyState.idx > 0) {
      navigate(-1)
      return
    }
    navigate('/lobby')
  }, [navigate])

  useEffect(() => {
    let isMounted = true
    async function loadUser() {
      setIsLoading(true)
      setErrorMessage('')
      setValidationErrors([])
      try {
        const result = await getCurrentUser()
        if (!isMounted) return
        setUser(result.user)
        setUsernameDraft(result.user.username)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(getAuthErrorMessage(error))
        setValidationErrors(getAuthValidationErrors(error))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void loadUser()
    return () => {
      isMounted = false
    }
  }, [])

  const canSubmit = useMemo(() => {
    if (!user) return false
    const normalized = usernameDraft.trim().toLowerCase()
    if (!normalized) return false
    if (normalized === user.username) return false
    return !isSaving
  }, [isSaving, user, usernameDraft])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setErrorMessage('')
    setValidationErrors([])
    setSuccessMessage('')
    setIsSaving(true)
    try {
      const result = await updateCurrentUsername(usernameDraft.trim())
      setUser(result.user)
      setUsernameDraft(result.user.username)
      setSuccessMessage('In-game username updated.')
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
      setValidationErrors(getAuthValidationErrors(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function onLinkGoogle() {
    if (isLinkingGoogle || isUnlinkingGoogle) return
    setErrorMessage('')
    setValidationErrors([])
    setSuccessMessage('')
    setIsLinkingGoogle(true)
    try {
      await beginGoogleAccountLink()
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
      setValidationErrors(getAuthValidationErrors(error))
      setIsLinkingGoogle(false)
    }
  }

  async function onUnlinkGoogle() {
    if (isUnlinkingGoogle || isLinkingGoogle) return
    setErrorMessage('')
    setValidationErrors([])
    setSuccessMessage('')
    setIsUnlinkingGoogle(true)
    try {
      const result = await unlinkGoogleAccount()
      setUser(result.user)
      setSuccessMessage('Google account unlinked.')
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
      setValidationErrors(getAuthValidationErrors(error))
    } finally {
      setIsUnlinkingGoogle(false)
    }
  }

  async function onLogout() {
    if (isLoggingOut) return
    setErrorMessage('')
    setValidationErrors([])
    setSuccessMessage('')
    setIsLoggingOut(true)
    try {
      await logout()
      resetToLoggedOutHome()
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
      setValidationErrors(getAuthValidationErrors(error))
      setIsLoggingOut(false)
    }
  }

  const googleLinkFeedback = (() => {
    if (searchParams.get('google_linked') === '1') {
      return { type: 'success' as const, message: 'Google account linked successfully.' }
    }
    const reason = searchParams.get('google_link_reason')
    if (reason === 'already_linked') {
      return {
        type: 'error' as const,
        message: 'That Google account is already linked to another player account.',
      }
    }
    if (searchParams.get('google_link_error') === '1') {
      return { type: 'error' as const, message: 'Google account link failed. Please try again.' }
    }
    return null
  })()

  return (
    <main className="lobby-shell">
      <ShaderBackdrop />
      <section className="lobby-panel profile-panel">
        <header className="lobby-header">
          <div className="lobby-header-copy">
            <h1 className="lobby-title title-cinzel">Player Profile</h1>
            <p className="lobby-subtitle">Manage your sign-in account and in-game identity.</p>
          </div>
          <div className="lobby-header-actions">
            <GodhandButtonBase className="ui-button" onClick={onLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </GodhandButtonBase>
            <GodhandButtonBase className="ui-button lobby-back-button" onClick={handleBack} aria-label="Close profile">
              <svg viewBox="0 0 20 20" aria-hidden="true" className="lobby-back-button-icon">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </GodhandButtonBase>
          </div>
        </header>

        {isLoading ? <p className="auth-subtitle profile-loading">Loading account...</p> : null}

        {!isLoading && user ? (
          <div className="profile-layout">
            <section className="profile-card profile-account-card">
              <div className="profile-card-header">
                <h2 className="profile-card-title">
                  <span className="profile-card-title-label">Account Identity</span>
                </h2>
                <span className="profile-status-pill">Authenticated</span>
              </div>

              <form onSubmit={onSubmit} className="auth-form profile-form">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="profile-auth-email">
                    Sign-in account (Google/email)
                  </label>
                  <input id="profile-auth-email" className="ui-input" value={user.email} readOnly />
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="profile-username">
                    In-game username
                  </label>
                  <input
                    id="profile-username"
                    className="ui-input"
                    value={usernameDraft}
                    onChange={(event) => setUsernameDraft(event.target.value)}
                    required
                  />
                </div>

                <div className="profile-actions-row">
                  <GodhandButtonBase type="submit" className="ui-button profile-primary-button" disabled={!canSubmit}>
                    {isSaving ? 'Saving...' : 'Save Username'}
                  </GodhandButtonBase>
                </div>
              </form>
            </section>

            <section className="profile-card profile-google-card">
              <div className="profile-card-header">
                <h2 className="profile-card-title">
                  <span className="auth-google-icon profile-google-header-icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20" focusable="false">
                      <path
                        d="M19.6 10.23c0-.68-.06-1.33-.18-1.96H10v3.71h5.39a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.74 2.97-4.31 2.97-7.28z"
                        fill="#4285F4"
                      />
                      <path
                        d="M10 20c2.7 0 4.96-.89 6.61-2.4l-3.24-2.51c-.9.61-2.05.97-3.37.97-2.59 0-4.79-1.75-5.57-4.1H1.08v2.58A10 10 0 0 0 10 20z"
                        fill="#34A853"
                      />
                      <path
                        d="M4.43 11.96a5.98 5.98 0 0 1 0-3.92V5.46H1.08a10 10 0 0 0 0 9.08l3.35-2.58z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M10 3.94c1.47 0 2.8.5 3.84 1.48l2.88-2.88C14.95.9 12.7 0 10 0A10 10 0 0 0 1.08 5.46l3.35 2.58C5.21 5.69 7.41 3.94 10 3.94z"
                        fill="#EA4335"
                      />
                    </svg>
                  </span>
                  <span className="profile-card-title-label">Google Account</span>
                </h2>
                <span className={`profile-status-pill ${user.google_linked ? 'profile-status-pill-online' : ''}`}>
                  {user.google_linked ? 'Linked' : 'Not Linked'}
                </span>
              </div>
              <p className="profile-card-subtitle">
                {user.google_linked
                  ? `Connected as ${user.google_email ?? 'Google account'}.`
                  : 'Link your Google account for faster sign-in.'}
              </p>
              <div className="profile-google-actions">
                <GodhandButtonBase
                  type="button"
                  className="ui-button profile-primary-button"
                  onClick={onLinkGoogle}
                  disabled={isLinkingGoogle || isUnlinkingGoogle}
                >
                  {isLinkingGoogle
                    ? 'Redirecting...'
                    : user.google_linked
                      ? 'Re-link Google Account'
                      : 'Link Google Account'}
                </GodhandButtonBase>
                {user.google_linked ? (
                  <GodhandButtonBase
                    type="button"
                    className="ui-button profile-secondary-button"
                    onClick={onUnlinkGoogle}
                    disabled={isUnlinkingGoogle || isLinkingGoogle}
                  >
                    {isUnlinkingGoogle ? 'Unlinking...' : 'Unlink Google Account'}
                  </GodhandButtonBase>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="auth-alert auth-alert-error profile-alert" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {validationErrors.length > 0 ? (
          <ul className="auth-alert auth-alert-warning auth-alert-list profile-alert" role="alert">
            {validationErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        {successMessage ? (
          <p className="auth-alert auth-alert-success profile-alert" role="status">
            {successMessage}
          </p>
        ) : null}

        {googleLinkFeedback ? (
          <p
            className={`auth-alert profile-alert ${
              googleLinkFeedback.type === 'success' ? 'auth-alert-success' : 'auth-alert-error'
            }`}
            role="status"
          >
            {googleLinkFeedback.message}
          </p>
        ) : null}
      </section>
    </main>
  )
}
