import type { ScheduleSummary, ScheduleView } from '@/api/types'

type ScheduleLike = ScheduleSummary | ScheduleView

export function primarySchedule(schedules: ScheduleLike[] | undefined): ScheduleLike | undefined {
  if (!schedules?.length) return undefined
  const enabled = schedules.filter((item) => item.enabled)
  const pool = enabled.length ? enabled : schedules
  return [...pool].sort((a, b) => {
    const an = a.next_fire_at || 'z'
    const bn = b.next_fire_at || 'z'
    return an.localeCompare(bn)
  })[0]
}

export function scheduleSummary(schedules: ScheduleLike[] | undefined): string {
  if (!schedules?.length) return '无调度'
  const enabled = schedules.filter((item) => item.enabled)
  if (!enabled.length) {
    return schedules.length === 1 ? '已停用' : `${schedules.length} 条调度（均停用）`
  }
  const first = primarySchedule(enabled)
  const cron = first?.cron_expression || '手动/API'
  if (enabled.length === 1) return cron
  return `${cron} 等 ${enabled.length} 条`
}
