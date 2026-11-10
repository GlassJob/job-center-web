import { useSettingsStore } from '@/stores/settings'
import { canonicalQuery, randomNonce, sha256Hex, signRequest } from './signer'
import type { Envelope, PageQuery } from './types'

export class ApiError extends Error {
  readonly code: number
  readonly httpStatus: number

  constructor(message: string, code: number, httpStatus: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function isConflict(err: unknown): boolean {
  return err instanceof ApiError && (err.httpStatus === 409 || err.code === 40900)
}

function joinUrl(base: string, path: string): string {
  if (!base) return path
  return `${base}${path}`
}

function buildQueryString(query?: PageQuery | Record<string, string | number | boolean | undefined | null>): string {
  return canonicalQuery(query as Record<string, string | number | boolean | undefined | null> | undefined)
}

export interface RequestOptions {
  query?: PageQuery | Record<string, string | number | boolean | undefined | null>
  body?: unknown
  sign?: boolean
}

export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const settings = useSettingsStore()
  const sign = options.sign !== false
  const query = buildQueryString(options.query)
  const urlPath = path.startsWith('/') ? path : `/${path}`
  const url = `${joinUrl(settings.resolvedBaseUrl, urlPath)}${query ? `?${query}` : ''}`

  const hasBody = options.body !== undefined
  const bodyText = hasBody ? JSON.stringify(options.body) : ''
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (hasBody) headers['Content-Type'] = 'application/json'

  if (sign) {
    if (!settings.hasCredentials) {
      throw new ApiError('请先在「连接设置」中填写 Client ID 与 Client Secret', 40100, 401)
    }
    const s = settings.settings
    const timestamp = String(Math.floor(Date.now() / 1000))
    const nonce = randomNonce()
    const bodySha256 = await sha256Hex(bodyText)
    const signature = await signRequest({
      method: method.toUpperCase(),
      path: urlPath,
      query,
      clientId: s.clientId,
      timestamp,
      nonce,
      operatorId: s.operatorId,
      operatorName: s.operatorName,
      bodySha256,
      clientSecret: s.clientSecret,
    })
    headers['X-JC-Client-Id'] = s.clientId
    headers['X-JC-Timestamp'] = timestamp
    headers['X-JC-Nonce'] = nonce
    headers['X-JC-Operator-Id'] = s.operatorId
    headers['X-JC-Operator-Name'] = s.operatorName
    headers['X-JC-Signature'] = signature
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: hasBody ? bodyText : undefined,
    })
  } catch {
    throw new ApiError('无法连接 Job Center，请检查地址或 Vite 代理目标', 0, 0)
  }

  const rawText = await response.text()
  let payload: Envelope<T> | null = null
  if (rawText) {
    try {
      payload = JSON.parse(rawText) as Envelope<T>
    } catch {
      throw new ApiError(rawText.slice(0, 200) || `HTTP ${response.status}`, response.status, response.status)
    }
  }

  if (!response.ok || (payload && payload.code !== 0)) {
    const message = payload?.message || `请求失败（HTTP ${response.status}）`
    throw new ApiError(message, payload?.code ?? response.status, response.status)
  }

  if (!payload) {
    throw new ApiError('响应为空', response.status, response.status)
  }

  return payload.data
}

export async function requestHealth<T>(path: string): Promise<T> {
  const settings = useSettingsStore()
  const urlPath = path.startsWith('/') ? path : `/${path}`
  const url = joinUrl(settings.resolvedBaseUrl, urlPath)
  let response: Response
  try {
    response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiError('无法连接 Job Center，请检查地址或 Vite 代理目标', 0, 0)
  }
  const rawText = await response.text()
  let payload: unknown = null
  if (rawText) {
    try {
      payload = JSON.parse(rawText) as unknown
    } catch {
      throw new ApiError(rawText.slice(0, 200) || `HTTP ${response.status}`, response.status, response.status)
    }
  }
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `健康检查失败（HTTP ${response.status}）`
    throw new ApiError(message, response.status, response.status)
  }
  return payload as T
}
