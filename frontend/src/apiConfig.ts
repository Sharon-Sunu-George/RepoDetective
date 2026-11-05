/**
 * Central API Client configuration for RepoDetective
 * 
 * Supports:
 * - import.meta.env.VITE_API_BASE_URL (Production / Deployed backend)
 * - Local fallback to http://127.0.0.1:8000
 */

function resolveApiBaseUrl(): string {
  // 1. Check Vite standard environment variable
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (envUrl) {
    return envUrl.replace(/\/+$/, '')
  }

  // 2. Fallback to local development server
  return 'http://127.0.0.1:8000'
}

export const API_BASE_URL = resolveApiBaseUrl()

/**
 * Helper to build backend API URLs without duplicate slashes
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${cleanPath}`
}
