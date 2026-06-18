import { API_BASE_URL } from './apiBase'
import { fetchWithTimeout } from './http'

export type PublicUser = {
  _id: string
  username: string
  email: string
  google_email: string | null
  google_linked: boolean
  created_at: string
  updated_at: string
}

export type LoginRequest = {
  identifier: string
  password: string
}

export type RegisterRequest = {
  username: string
  email: string
  password: string
}

export type LoginResponse = {
  user: PublicUser
}

export type RegisterResponse = {
  message: string
  user: PublicUser
}

export type UserResponse = {
  user: PublicUser
}

export type GoogleLinkStartResponse = {
  url: string
}

type CsrfResponse = {
  csrf_token: string
}

type ApiValidationError = {
  loc?: Array<string | number>
  msg?: string
}

type ApiErrorPayload = {
  detail?: string
  errors?: ApiValidationError[]
}

export class AuthApiError extends Error {
  status: number
  payload: ApiErrorPayload | null

  constructor(message: string, status: number, payload: ApiErrorPayload | null) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
    this.payload = payload
  }
}

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

const AUTH_BASE_URL = `${API_BASE_URL}/api/v1/auth`
const AUTH_REQUEST_TIMEOUT_MS = 10000

function readCookie(name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

function assertSecureAuthTransport(): void {
  const apiUrl = new URL(API_BASE_URL, window.location.origin)
  const pageProtocol = window.location.protocol
  const apiProtocol = apiUrl.protocol
  const allowInsecure = import.meta.env.DEV && import.meta.env.VITE_ALLOW_INSECURE_AUTH === 'true'

  if (isLocalhost(apiUrl.hostname) || allowInsecure) return
  if (pageProtocol === 'https:' && apiProtocol === 'https:') return

  throw new AuthApiError(
    'Secure auth requires HTTPS for both frontend and backend. Set VITE_API_BASE_URL_DEV or VITE_API_BASE_URL_PROD to an https:// endpoint.',
    0,
    null,
  )
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function formatValidationErrors(errors: ApiValidationError[] | undefined): string[] {
  if (!errors || errors.length === 0) return []
  return errors.map((error) => {
    const path = Array.isArray(error.loc) ? error.loc.join('.') : 'field'
    const message = error.msg ?? 'Invalid value'
    return `${path}: ${message}`
  })
}

function extractErrorMessage(payload: ApiErrorPayload | null): string {
  if (payload?.detail) return payload.detail
  if (payload?.errors && payload.errors.length > 0) return 'Validation failed'
  return 'Request failed'
}

async function authRequest<T>(path: string, init: RequestInit): Promise<T> {
  assertSecureAuthTransport()
  const response = await fetchWithTimeout(
    `${AUTH_BASE_URL}${path}`,
    {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    },
    AUTH_REQUEST_TIMEOUT_MS,
  )

  const payload = (await parseJsonSafe(response)) as ApiErrorPayload | T | null

  if (!response.ok) {
    const errorPayload = (payload as ApiErrorPayload) ?? null
    throw new AuthApiError(extractErrorMessage(errorPayload), response.status, errorPayload)
  }

  return payload as T
}

export async function getAnonCsrfToken(): Promise<string> {
  const data = await authRequest<CsrfResponse>('/csrf-token', { method: 'GET' })
  return data.csrf_token
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const csrfToken = await getAnonCsrfToken()
  return authRequest<LoginResponse>('/login', {
    method: 'POST',
    headers: {
      'X-CSRF-TOKEN': csrfToken,
    },
    body: JSON.stringify(payload),
  })
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  const csrfToken = await getAnonCsrfToken()
  return authRequest<RegisterResponse>('/register', {
    method: 'POST',
    headers: {
      'X-CSRF-TOKEN': csrfToken,
    },
    body: JSON.stringify(payload),
  })
}

export function beginGoogleSignIn(): void {
  assertSecureAuthTransport()
  window.location.assign(`${AUTH_BASE_URL}/google/login`)
}

function getAccessCsrfTokenFromCookie(): string {
  const token = readCookie('csrf_access_token')
  if (!token) {
    throw new AuthApiError('Your session has expired. Please sign in again.', 401, null)
  }
  return token
}

function getRefreshCsrfTokenFromCookie(): string {
  const token = readCookie('csrf_refresh_token')
  if (!token) {
    throw new AuthApiError('Your session has expired. Please sign in again.', 401, null)
  }
  return token
}

async function refreshAccessToken(): Promise<void> {
  const refreshCsrfToken = getRefreshCsrfTokenFromCookie()
  await authRequest<{ message: string }>('/refresh', {
    method: 'POST',
    headers: {
      'X-CSRF-TOKEN': refreshCsrfToken,
    },
  })
}

async function requestCurrentUserWithAccessCsrf(csrfToken: string): Promise<UserResponse> {
  return authRequest<UserResponse>('/me', {
    method: 'GET',
    headers: {
      'X-CSRF-TOKEN': csrfToken,
    },
  })
}

export async function getCurrentUser(): Promise<UserResponse> {
  try {
    return await requestCurrentUserWithAccessCsrf(getAccessCsrfTokenFromCookie())
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.status !== 401) {
      throw error
    }
    await refreshAccessToken()
    return requestCurrentUserWithAccessCsrf(getAccessCsrfTokenFromCookie())
  }
}

export async function updateCurrentUsername(username: string): Promise<UserResponse> {
  const csrfToken = getAccessCsrfTokenFromCookie()
  return authRequest<UserResponse>('/me/username', {
    method: 'PATCH',
    headers: {
      'X-CSRF-TOKEN': csrfToken,
    },
    body: JSON.stringify({ username }),
  })
}

export async function beginGoogleAccountLink(): Promise<void> {
  assertSecureAuthTransport()
  const csrfToken = getAccessCsrfTokenFromCookie()
  const result = await authRequest<GoogleLinkStartResponse>('/google/link/start', {
    method: 'POST',
    headers: {
      'X-CSRF-TOKEN': csrfToken,
    },
  })
  window.location.assign(result.url)
}

export async function unlinkGoogleAccount(): Promise<UserResponse> {
  const csrfToken = getAccessCsrfTokenFromCookie()
  return authRequest<UserResponse>('/google/unlink', {
    method: 'POST',
    headers: {
      'X-CSRF-TOKEN': csrfToken,
    },
  })
}

export async function logout(): Promise<void> {
  const csrfToken = getAccessCsrfTokenFromCookie()
  await authRequest<{ message: string }>('/logout', {
    method: 'POST',
    headers: {
      'X-CSRF-TOKEN': csrfToken,
    },
  })
}

const CLIENT_AUTH_COOKIE_NAMES = [
  'csrf_access_token',
  'csrf_refresh_token',
  'anon_csrf',
  'oauth_google_state',
  'oauth_google_link_user_id',
]

export function resetToLoggedOutHome(): void {
  const expired = 'Thu, 01 Jan 1970 00:00:00 GMT'
  for (const cookieName of CLIENT_AUTH_COOKIE_NAMES) {
    document.cookie = `${cookieName}=; expires=${expired}; path=/; SameSite=Lax`
  }
  window.location.replace('/')
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthApiError) return error.message
  return 'Network error. Please try again.'
}

export function getAuthValidationErrors(error: unknown): string[] {
  if (!(error instanceof AuthApiError)) return []
  return formatValidationErrors(error.payload?.errors)
}
