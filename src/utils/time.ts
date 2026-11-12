/** 浏览器当前 IANA 时区（如 Asia/Shanghai）。 */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** 按浏览器本地时区格式化，并带短时区名（如 GMT+8）。 */
export function formatTime(value?: string | null, withSeconds = true): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
    timeZoneName: 'short',
  }).format(date)
}

/** 本地时区展示，并附带 IANA 时区名。 */
export function formatTimeTzLabel(value?: string | null): string {
  const text = formatTime(value)
  if (text === '—') return text
  return `${text} (${browserTimeZone()})`
}

export function toRfc3339Utc(date: Date): string {
  return date.toISOString()
}
