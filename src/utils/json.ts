import type { JsonObject } from '@/api/types'

export const JSON_OBJECT_MAX_BYTES = 64 * 1024

export function prettyJson(value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function parseJsonObject(text: string, emptyAs: 'object' | 'null' = 'object'): JsonObject | null {
  const trimmed = text.trim()
  if (!trimmed) {
    return emptyAs === 'object' ? {} : null
  }
  const parsed: unknown = JSON.parse(trimmed)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('必须是 JSON 对象（不能是数组或原始值）')
  }
  return parsed as JsonObject
}

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function assertObjectSize(value: unknown, label = 'JSON'): void {
  const raw = JSON.stringify(value ?? {})
  if (utf8ByteLength(raw) > JSON_OBJECT_MAX_BYTES) {
    throw new Error(`${label} 不能超过 64 KiB`)
  }
}
