export type PublicUser = {
  _id: string
  username: string
  email: string
  first_name: string | null
  last_name: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  first_name: string
  last_name: string
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

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  `${window.location.protocol}//${window.location.hostname}:5000`
const AUTH_BASE_URL = `${API_BASE_URL}/api/v1/auth`

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
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

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

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthApiError) return error.message
  return 'Network error. Please try again.'
}

export function getAuthValidationErrors(error: unknown): string[] {
  if (!(error instanceof AuthApiError)) return []
  return formatValidationErrors(error.payload?.errors)
}
