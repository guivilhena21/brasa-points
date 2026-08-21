export function normalizeQRToken(value) {
  if (typeof value !== 'string') return ''
  const raw = value.trim()
  if (!raw) return ''

  try {
    const parsed = new URL(raw)
    const fromQuery =
      parsed.searchParams.get('token') ||
      parsed.searchParams.get('qr') ||
      parsed.searchParams.get('qr_token') ||
      parsed.searchParams.get('code')

    if (fromQuery) return fromQuery.trim()

    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1].trim()
  } catch {
    // Not a URL, continue with plain token handling.
  }

  return raw
}

export function buildCheckinUrl(token) {
  const normalized = normalizeQRToken(token)
  if (!normalized) return ''

  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
  const checkinPath = `${normalizedBase === '/' || !normalizedBase ? '' : normalizedBase}/checkin`

  const publicBase = import.meta.env.VITE_PUBLIC_APP_URL?.trim()
  if (publicBase) {
    try {
      const url = new URL(publicBase)
      url.pathname = checkinPath
      url.search = ''
      url.searchParams.set('token', normalized)
      return url.toString()
    } catch {
      // Ignore malformed public URL and fall back to runtime origin.
    }
  }

  if (typeof window === 'undefined') return `${checkinPath}?token=${encodeURIComponent(normalized)}`

  const baseUrl = new URL(window.location.origin)
  baseUrl.pathname = checkinPath
  baseUrl.searchParams.set('token', normalized)
  return baseUrl.toString()
}

export function getQRTokenFromCurrentUrl() {
  if (typeof window === 'undefined') return ''

  const current = new URL(window.location.href)
  const candidates = [
    current.searchParams.get('qr'),
    current.searchParams.get('token'),
    current.searchParams.get('qr_token'),
    current.searchParams.get('code'),
  ]

  for (const candidate of candidates) {
    const token = normalizeQRToken(candidate)
    if (token) return token
  }

  return ''
}

export function clearQRTokenFromUrl() {
  if (typeof window === 'undefined') return

  const current = new URL(window.location.href)
  current.searchParams.delete('qr')
  current.searchParams.delete('token')
  current.searchParams.delete('qr_token')
  current.searchParams.delete('code')

  const nextPath = `${current.pathname}${current.search}${current.hash}`
  window.history.replaceState({}, '', nextPath)
}