export type TagTone = 'success' | 'primary' | 'warning' | 'danger' | 'info' | 'muted'

export interface StatusMeta {
  label: string
  tone: TagTone
}

const LABELS: Record<string, StatusMeta> = {
  ACTIVE: { label: '启用', tone: 'primary' },
  DISABLED: { label: '停用', tone: 'muted' },
  REVOKED: { label: '已吊销', tone: 'muted' },
  EXPIRED: { label: '已过期', tone: 'warning' },
  PENDING: { label: '待处理', tone: 'info' },
  QUEUED: { label: '排队中', tone: 'info' },
  DISPATCHING: { label: '派发中', tone: 'primary' },
  RUNNING: { label: '运行中', tone: 'primary' },
  RETRY_WAIT: { label: '等待重试', tone: 'warning' },
  SUCCEEDED: { label: '成功', tone: 'success' },
  FAILED: { label: '失败', tone: 'danger' },
  CANCELLED: { label: '已取消', tone: 'muted' },
  TIMED_OUT: { label: '超时', tone: 'danger' },
  SKIPPED: { label: '已跳过', tone: 'muted' },
  UNKNOWN: { label: '未知', tone: 'muted' },
  CREATED: { label: '已创建', tone: 'info' },
  ACKNOWLEDGED: { label: '已确认', tone: 'primary' },
  LOST: { label: '丢失', tone: 'danger' },
  OK: { label: '成功', tone: 'success' },
  ERROR: { label: '失败', tone: 'danger' },
  DENIED: { label: '拒绝', tone: 'danger' },
  TRUE: { label: '是', tone: 'success' },
  FALSE: { label: '否', tone: 'muted' },
}

export function statusMeta(status?: string | null): StatusMeta {
  if (!status) return { label: '—', tone: 'muted' }
  const key = status.toUpperCase()
  return LABELS[key] ?? { label: status, tone: 'info' }
}

export function isFinalExecution(status?: string | null): boolean {
  const key = (status || '').toUpperCase()
  return ['SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT', 'SKIPPED'].includes(key)
}
