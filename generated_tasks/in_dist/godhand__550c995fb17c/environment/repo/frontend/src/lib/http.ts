const DEFAULT_REQUEST_TIMEOUT_MS = 10000

function bridgeAbortSignal(source: AbortSignal | null | undefined, target: AbortController): () => void {
  if (!source) return () => {}
  if (source.aborted) {
    target.abort()
    return () => {}
  }

  const onAbort = () => {
    target.abort()
  }
  source.addEventListener('abort', onAbort, { once: true })
  return () => {
    source.removeEventListener('abort', onAbort)
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const detachAbortBridge = bridgeAbortSignal(init.signal, controller)
  const hasTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
  const timeoutId = hasTimeout
    ? globalThis.setTimeout(() => {
        controller.abort()
      }, timeoutMs)
    : null

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    detachAbortBridge()
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId)
    }
  }
}
