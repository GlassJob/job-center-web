import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface RecentExecution {
  serviceId: string
  jobId: string
  executionId: string
  status?: string
  message?: string
  triggeredAt: string
}

const STORAGE_KEY = 'jc.admin.recent-executions'
const MAX_ITEMS = 30

function load(): RecentExecution[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentExecution[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const useSessionStore = defineStore('session', () => {
  const recentExecutions = ref<RecentExecution[]>(load())

  function persist() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recentExecutions.value))
  }

  function rememberExecution(item: RecentExecution) {
    const rest = recentExecutions.value.filter((x) => x.executionId !== item.executionId)
    recentExecutions.value = [item, ...rest].slice(0, MAX_ITEMS)
    persist()
  }

  function updateExecution(executionId: string, patch: Partial<RecentExecution>) {
    recentExecutions.value = recentExecutions.value.map((item) =>
      item.executionId === executionId ? { ...item, ...patch } : item,
    )
    persist()
  }

  function listForJob(serviceId: string, jobId: string): RecentExecution[] {
    return recentExecutions.value.filter((x) => x.serviceId === serviceId && x.jobId === jobId)
  }

  return {
    recentExecutions,
    rememberExecution,
    updateExecution,
    listForJob,
  }
})
