function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

const DEV_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL_DEV ?? '').trim()
const PROD_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL_PROD ?? '').trim()

const defaultDevBase = `${window.location.protocol}//${window.location.hostname}:5050`
const defaultProdBase = window.location.origin

const resolvedApiBaseUrl = import.meta.env.DEV
  ? DEV_API_BASE_URL || defaultDevBase
  : PROD_API_BASE_URL || defaultProdBase

export const API_BASE_URL = trimTrailingSlash(resolvedApiBaseUrl)
