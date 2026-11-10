const encoder = new TextEncoder()

export function rfc3986Encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (ch) => {
    return `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  })
}

export function canonicalQuery(
  query: Record<string, string | number | boolean | undefined | null> | undefined,
): string {
  if (!query) return ''
  const pairs: Array<[string, string]> = []
  for (const [key, raw] of Object.entries(query)) {
    if (raw === undefined || raw === null || raw === '') continue
    pairs.push([rfc3986Encode(key), rfc3986Encode(String(raw))])
  }
  pairs.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1
    if (a[1] !== b[1]) return a[1] < b[1] ? -1 : 1
    return 0
  })
  return pairs.map(([k, v]) => `${k}=${v}`).join('&')
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(message))
  return toHex(digest)
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return toHex(sig)
}

export function randomNonce(bytes = 16): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

export interface SignInput {
  method: string
  path: string
  query: string
  clientId: string
  timestamp: string
  nonce: string
  operatorId: string
  operatorName: string
  bodySha256: string
  clientSecret: string
}

/**
 * Canonical string (UTF-8, joined by `\n`):
 * METHOD\nPATH\nQUERY\nClient-Id\nTimestamp\nNonce\nOperator-Id\nOperator-Name\nhex(sha256(body))
 */
export function buildCanonical(input: Omit<SignInput, 'clientSecret'>): string {
  return [
    input.method,
    input.path,
    input.query,
    input.clientId,
    input.timestamp,
    input.nonce,
    input.operatorId,
    input.operatorName,
    input.bodySha256,
  ].join('\n')
}

export async function signRequest(input: SignInput): Promise<string> {
  const canonical = buildCanonical(input)
  return hmacSha256Hex(input.clientSecret, canonical)
}
