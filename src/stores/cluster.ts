import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { instancesApi, jobsApi, schedulesApi, servicesApi } from '@/api'
import type { InstanceView, JobView, ScheduleView, Service, ServiceDetail } from '@/api/types'

export interface ClusterJob {
  job: JobView
  service: Service
  schedules: ScheduleView[]
  jobsTruncated?: boolean
}

export interface ClusterInstance {
  instance: InstanceView
  service: Service
}

const LIST_LIMIT = 100
const SCHEDULE_CONCURRENCY = 8

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size)
    out.push(...(await Promise.all(chunk.map(fn))))
  }
  return out
}

export const useClusterStore = defineStore('cluster', () => {
  const loading = ref(false)
  const loadedAt = ref<number | null>(null)
  const services = ref<ServiceDetail[]>([])
  const jobs = ref<ClusterJob[]>([])
  const instances = ref<ClusterInstance[]>([])
  const truncated = ref(false)
  const instanceScopeMissing = ref(false)

  const onlineInstances = computed(() =>
    instances.value.filter((item) => item.instance.status === 'ONLINE'),
  )
  const unhealthyInstances = computed(() =>
    instances.value.filter((item) => item.instance.status !== 'ONLINE'),
  )
  const enabledJobs = computed(() => jobs.value.filter((item) => item.job.enabled))
  const upcomingSchedules = computed(() => {
    const rows: {
      job: JobView
      service: Service
      schedule: ScheduleView
      next: string
    }[] = []
    for (const item of jobs.value) {
      for (const schedule of item.schedules) {
        if (!schedule.enabled || !schedule.next_fire_at) continue
        rows.push({
          job: item.job,
          service: item.service,
          schedule,
          next: schedule.next_fire_at,
        })
      }
    }
    return rows.sort((a, b) => a.next.localeCompare(b.next)).slice(0, 8)
  })

  function serviceById(id: string) {
    return services.value.find((item) => item.id === id)
  }

  async function refresh(force = false) {
    if (loading.value) return
    if (!force && loadedAt.value && Date.now() - loadedAt.value < 20000) return
    loading.value = true
    instanceScopeMissing.value = false
    truncated.value = false
    try {
      const list = await servicesApi.list({ page: 1, limit: LIST_LIMIT })
      if (list.total > list.list.length) truncated.value = true

      const details = await Promise.all(
        list.list.map(async (svc) => {
          try {
            return await servicesApi.get(svc.id)
          } catch {
            return { ...svc, job_count: 0, instance_count: 0, credential_count: 0 } as ServiceDetail
          }
        }),
      )
      services.value = details

      const jobPages = await Promise.all(
        details.map(async (svc) => {
          try {
            const res = await jobsApi.list(svc.id, { page: 1, limit: LIST_LIMIT })
            if (res.total > res.list.length) truncated.value = true
            return { svc, jobs: res.list }
          } catch {
            return { svc, jobs: [] as JobView[] }
          }
        }),
      )

      const instPages = await Promise.all(
        details.map(async (svc) => {
          try {
            const res = await instancesApi.list(svc.id, { page: 1, limit: LIST_LIMIT })
            if (res.total > res.list.length) truncated.value = true
            return { svc, instances: res.list, forbidden: false }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            if (message.includes('job.instance.view') || message.includes('403')) {
              instanceScopeMissing.value = true
            }
            return { svc, instances: [] as InstanceView[], forbidden: true }
          }
        }),
      )
      instances.value = instPages.flatMap((page) =>
        page.instances.map((instance) => ({ instance, service: page.svc })),
      )

      const flatJobs = jobPages.flatMap((page) =>
        page.jobs.map((job) => ({ job, service: page.svc })),
      )
      const withSchedules = await mapPool(flatJobs, SCHEDULE_CONCURRENCY, async (item) => {
        try {
          const res = await schedulesApi.list(item.service.id, item.job.id, { page: 1, limit: 50 })
          return { ...item, schedules: res.list }
        } catch {
          return { ...item, schedules: [] as ScheduleView[] }
        }
      })
      jobs.value = withSchedules
      loadedAt.value = Date.now()
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    loadedAt,
    services,
    jobs,
    instances,
    truncated,
    instanceScopeMissing,
    onlineInstances,
    unhealthyInstances,
    enabledJobs,
    upcomingSchedules,
    serviceById,
    refresh,
  }
})
