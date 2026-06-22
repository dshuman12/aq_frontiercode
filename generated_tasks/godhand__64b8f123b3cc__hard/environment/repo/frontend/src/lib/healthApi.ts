import { API_BASE_URL } from './apiBase'
import { fetchWithTimeout } from './http'

const DEFAULT_HEALTH_TIMEOUT_MS = 4000
const DEFAULT_PING_TIMEOUT_MS = 3000

export async function checkBackendHealth(
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HEALTH_TIMEOUT_MS,
): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/health`,
      {
        method: 'GET',
        cache: 'no-store',
        signal,
      },
      timeoutMs,
    )
    return response.ok
  } catch {
    return false
  }
}

export async function measureBackendPingMs(
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_PING_TIMEOUT_MS,
): Promise<number | null> {
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
  const startedAt = now()
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/health`,
      {
        method: 'GET',
        cache: 'no-store',
        signal,
      },
      timeoutMs,
    )
    if (!response.ok) return null
    return Math.max(1, Math.round(now() - startedAt))
  } catch {
    return null
  }
}
