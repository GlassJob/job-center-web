import { CLIENT_SCOPE_OPTIONS } from '@/api/types'

/** Display-only Chinese labels. API request values stay in English. */

export const CONCURRENCY_POLICY_LABELS: Record<string, string> = {
  ALLOW: '允许并发',
  FORBID: '禁止并发',
  QUEUE: '排队执行',
}

export const CONCURRENCY_SCOPE_LABELS: Record<string, string> = {
  JOB: '任务',
  SCHEDULE: '调度',
  IDEMPOTENCY_KEY: '幂等键',
}

export const MISFIRE_POLICY_LABELS: Record<string, string> = {
  SKIP: '跳过',
  FIRE_ONCE: '补触发一次',
  CATCH_UP: '追赶补齐',
}

export const DISPATCH_STRATEGY_LABELS: Record<string, string> = {
  LEAST_LOAD: '最少负载',
  ROUND_ROBIN: '轮询',
  RANDOM: '随机',
}

export const RETRY_STRATEGY_LABELS: Record<string, string> = {
  FIXED: '固定间隔',
  EXPONENTIAL: '指数退避',
}

export const TRIGGER_TYPE_LABELS: Record<string, string> = {
  CRON: 'Cron 调度',
  MANUAL: '手动触发',
  CATCH_UP: '追赶触发',
  API: '接口触发',
}

export const IDEMPOTENCY_MODE_LABELS: Record<string, string> = {
  UNKNOWN: '未知',
  NONE: '无',
  KEYED: '按幂等键',
  NATURAL: '自然幂等',
}

export const CANCEL_STATE_LABELS: Record<string, string> = {
  NONE: '无',
  REQUESTED: '已请求',
  SENT: '已下发',
  ACKED: '已确认',
  STOPPED: '已停止',
}

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  service: '服务',
  job: '任务',
  schedule: '调度',
  instance: '实例',
  execution: '执行',
  credential: '凭据',
  client: '客户端',
  state: '游标/状态',
  audit: '审计',
}

const SCOPE_LABELS: Record<string, string> = Object.fromEntries(
  CLIENT_SCOPE_OPTIONS.map((item) => [item.value, item.label]),
)

export function enumLabel(value?: string | null, map?: Record<string, string>): string {
  if (!value) return '—'
  if (!map) return value
  return map[value] ?? map[value.toUpperCase()] ?? map[value.toLowerCase()] ?? value
}

export function scopeLabel(value?: string | null): string {
  if (!value) return '—'
  if (value === '*') return '全部权限'
  return SCOPE_LABELS[value] ?? value
}

export function resourceTypeLabel(value?: string | null): string {
  if (!value) return '—'
  return RESOURCE_TYPE_LABELS[value] ?? RESOURCE_TYPE_LABELS[value.toLowerCase()] ?? value
}
