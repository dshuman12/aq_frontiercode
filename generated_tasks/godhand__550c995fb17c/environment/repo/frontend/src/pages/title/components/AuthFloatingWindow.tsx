import { memo, useMemo, useState, type FormEvent, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import GodhandButtonBase from '../../../components/GodhandButtonBase'
import {
  beginGoogleSignIn,
  getAuthErrorMessage,
  getAuthValidationErrors,
  login,
  register,
} from '../../../lib/authApi'
import FloatingWindow from '../../game/components/FloatingWindow'

export type AuthMode = 'login' | 'register'

type FloatingRect = {
  x: number
  y: number
  width: number
  height: number
}

type AuthFloatingWindowProps = {
  containerRef: RefObject<HTMLElement | null>
  initialRect: FloatingRect
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  oauthError?: string | null
  oauthReason?: string | null
  onClose?: () => void
  className?: string
}

const initialRegisterForm = {
  username: '',
  email: '',
  password: '',
}

function AuthFloatingWindow({
  containerRef,
  initialRect,
  mode,
  onModeChange,
  oauthError,
  oauthReason,
  onClose,
  className,
}: AuthFloatingWindowProps) {
  const navigate = useNavigate()
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [oauthLaunchError, setOauthLaunchError] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const oauthErrorMessage = useMemo(() => {
    if (oauthError !== 'oauth') return ''
    if (oauthReason === 'email_conflict') {
      return 'That email is already linked to a different Google account. Use password login or the original Google account.'
    }
    if (oauthReason === 'invalid_state') {
      return 'Google sign-in session expired. Please try again.'
    }
    if (oauthReason === 'unverified_email') {
      return 'Google account email must be verified before sign-in.'
    }
    return 'Google sign-in failed. Please try again.'
  }, [oauthError, oauthReason])
  const loginInlineError = useMemo(() => {
    if (errorMessage) return errorMessage
    if (oauthErrorMessage) return oauthErrorMessage
    if (oauthLaunchError) return oauthLaunchError
    if (validationErrors.length > 0) return validationErrors[0]
    return ''
  }, [errorMessage, oauthErrorMessage, oauthLaunchError, validationErrors])
  const loginInlineTone = loginInlineError ? 'error' : successMessage ? 'success' : null
  const loginInlineMessage = loginInlineError || successMessage

  function switchMode(nextMode: AuthMode) {
    if (nextMode === mode) return
    setErrorMessage('')
    setOauthLaunchError('')
    setValidationErrors([])
    onModeChange(nextMode)
  }

  async function onLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const identifier = loginIdentifier.trim()
    if (!identifier) {
      setErrorMessage('Enter your username or email to continue.')
      setValidationErrors([])
      return
    }

    setErrorMessage('')
    setOauthLaunchError('')
    setValidationErrors([])
    setSuccessMessage('')
    setIsSubmitting(true)
    try {
      await login({ identifier, password: loginPassword })
      navigate('/lobby')
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
      setValidationErrors(getAuthValidationErrors(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setErrorMessage('')
    setOauthLaunchError('')
    setValidationErrors([])
    setSuccessMessage('')
    setIsSubmitting(true)
    try {
      const result = await register(registerForm)
      setSuccessMessage(result.message || 'Registration successful. You can now log in.')
      setLoginIdentifier(registerForm.username.trim())
      setRegisterForm(initialRegisterForm)
      onModeChange('login')
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
      setValidationErrors(getAuthValidationErrors(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  function onGoogleLogin() {
    if (isSubmitting) return
    setErrorMessage('')
    setOauthLaunchError('')
    setValidationErrors([])
    setSuccessMessage('')
    try {
      beginGoogleSignIn()
    } catch (error) {
      setOauthLaunchError(getAuthErrorMessage(error))
    }
  }

  return (
    <FloatingWindow
      title="Account Access"
      containerRef={containerRef}
      initialRect={initialRect}
      showMinimize={false}
      minWidth={340}
      minHeight={mode === 'register' ? 320 : 392}
      onClose={onClose}
      className={`auth-floating-window auth-floating-window-${mode} ${className ?? ''}`.trim()}
    >
      <section className="auth-panel auth-popup-panel" aria-label="Authentication">
        <div className="auth-popup-tabs">
          <GodhandButtonBase
            type="button"
            className={`ui-button auth-popup-tab ${mode === 'login' ? 'auth-popup-tab-active' : ''}`}
            onClick={() => {
              switchMode('login')
            }}
          >
            Login
          </GodhandButtonBase>
          <GodhandButtonBase
            type="button"
            className={`ui-button auth-popup-tab ${mode === 'register' ? 'auth-popup-tab-active' : ''}`}
            onClick={() => {
              switchMode('register')
            }}
          >
            Register
          </GodhandButtonBase>
        </div>

        {mode === 'login' ? (
          <>
            <p
              className={`auth-subtitle ${
                loginInlineTone ? `auth-login-inline-note auth-login-inline-note-${loginInlineTone}` : ''
              }`}
              role={
                loginInlineTone
                  ? loginInlineTone === 'success'
                    ? 'status'
                    : 'alert'
                  : undefined
              }
            >
              {loginInlineMessage || 'Sign in with your username/email and password.'}
            </p>
            <form onSubmit={onLoginSubmit} className="auth-form">
              <div className="auth-field">
                <label htmlFor="landing-login-identifier" className="auth-label">
                  Username or Email
                </label>
                <input
                  id="landing-login-identifier"
                  type="text"
                  className="ui-input"
                  value={loginIdentifier}
                  onChange={(event) => {
                    setLoginIdentifier(event.target.value)
                  }}
                  placeholder="username or you@example.com"
                  required
                />
              </div>
              <div className="auth-field">
                <label htmlFor="landing-login-password" className="auth-label">
                  Password
                </label>
                <input
                  id="landing-login-password"
                  type="password"
                  className="ui-input"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                />
              </div>
              <GodhandButtonBase type="submit" className="ui-button auth-submit-button" disabled={isSubmitting}>
                {isSubmitting ? 'Logging in...' : 'Login'}
              </GodhandButtonBase>
            </form>
            <p className="auth-subtitle auth-login-social-divider">or</p>
            <GodhandButtonBase
              type="button"
              className="ui-button auth-google-button"
              onClick={onGoogleLogin}
              disabled={isSubmitting}
            >
              <span className="auth-google-icon" aria-hidden="true">
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
              Continue with Google
            </GodhandButtonBase>
          </>
        ) : (
          <>
            <p className="auth-subtitle">Create your account to start playing.</p>
            <form onSubmit={onRegisterSubmit} className="auth-form">
              <div className="auth-field">
                <label htmlFor="landing-register-username" className="auth-label">
                  Username
                </label>
                <input
                  id="landing-register-username"
                  type="text"
                  className="ui-input"
                  value={registerForm.username}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, username: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="auth-field">
                <label htmlFor="landing-register-email" className="auth-label">
                  Email
                </label>
                <input
                  id="landing-register-email"
                  type="email"
                  className="ui-input"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="auth-field">
                <label htmlFor="landing-register-password" className="auth-label">
                  Password
                </label>
                <input
                  id="landing-register-password"
                  type="password"
                  className="ui-input"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
              </div>
              <GodhandButtonBase type="submit" className="ui-button auth-submit-button" disabled={isSubmitting}>
                {isSubmitting ? 'Registering...' : 'Register'}
              </GodhandButtonBase>
            </form>
          </>
        )}

        {mode !== 'login' && isSubmitting ? (
          <p className="auth-alert auth-alert-info" role="status">
            Processing...
          </p>
        ) : null}

        {mode !== 'login' && errorMessage ? (
          <p className="auth-alert auth-alert-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {mode !== 'login' && oauthErrorMessage ? (
          <p className="auth-alert auth-alert-error" role="alert">
            {oauthErrorMessage}
          </p>
        ) : null}

        {mode !== 'login' && oauthLaunchError ? (
          <p className="auth-alert auth-alert-error" role="alert">
            {oauthLaunchError}
          </p>
        ) : null}

        {mode !== 'login' && validationErrors.length > 0 ? (
          <ul className="auth-alert auth-alert-warning auth-alert-list" role="alert">
            {validationErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        {mode !== 'login' && successMessage ? (
          <p className="auth-alert auth-alert-success" role="status">
            {successMessage}
          </p>
        ) : null}
      </section>
    </FloatingWindow>
  )
}

export default memo(AuthFloatingWindow)
