const SHANGHAI = 'Asia/Shanghai'

export function formatTime(value?: string | null, withSeconds = true): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: SHANGHAI,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
  }).format(date)
}

export function formatTimeTzLabel(value?: string | null): string {
  const text = formatTime(value)
  return text === '—' ? text : `${text} (Asia/Shanghai)`
}

export function toRfc3339Utc(date: Date): string {
  return date.toISOString()
}
