import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { instancesApi, jobsApi, servicesApi } from '@/api'
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
      const svcRes = await servicesApi.list({ page: 1, limit: LIST_LIMIT })
      if (svcRes.total > svcRes.list.length) truncated.value = true
      services.value = svcRes.list

      const jobRes = await jobsApi.listGlobal({ page: 1, limit: LIST_LIMIT })
      if (jobRes.total > jobRes.list.length) truncated.value = true
      jobs.value = jobRes.list.map((job) => {
        const service =
          services.value.find((s) => s.id === job.service_id) ||
          ({
            id: job.service_id,
            code: job.service_code || '',
            name: job.service_name || job.service_id,
            status: 'ACTIVE',
            created_at: '',
            updated_at: '',
          } as Service)
        const schedules = (job.schedules || []).map(
          (s) =>
            ({
              id: s.id,
              job_id: job.id,
              code: s.code,
              name: s.name,
              enabled: s.enabled,
              manual_enabled: true,
              cron_expression: s.cron_expression,
              timezone: s.timezone || 'UTC',
              timeout_seconds: 0,
              max_retries: 0,
              retry_backoff: {},
              concurrency_policy: 'ALLOW',
              concurrency_scope: 'JOB',
              max_concurrency: 0,
              queue_max: 0,
              misfire_policy: 'SKIP',
              misfire_threshold_seconds: 0,
              catch_up_max: 0,
              dispatch_strategy: 'LEAST_LOAD',
              next_fire_at: s.next_fire_at,
              last_fire_at: s.last_fire_at,
              config_source: 'ADMIN',
              version: 0,
              created_at: '',
              updated_at: '',
            }) as ScheduleView,
        )
        return { job, service, schedules }
      })

      try {
        const instRes = await instancesApi.listGlobal({ page: 1, limit: LIST_LIMIT })
        if (instRes.total > instRes.list.length) truncated.value = true
        instances.value = instRes.list.map((instance) => {
          const service =
            services.value.find((s) => s.id === instance.service_id) ||
            ({
              id: instance.service_id,
              code: instance.service_code || '',
              name: instance.service_name || instance.service_id,
              status: 'ACTIVE',
              created_at: '',
              updated_at: '',
            } as Service)
          return { instance, service }
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes('job.instance.view') || message.includes('403')) {
          instanceScopeMissing.value = true
        }
        instances.value = []
      }

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
