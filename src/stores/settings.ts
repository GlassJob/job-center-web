import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export interface ConnectionSettings {
  baseUrl: string
  clientId: string
  clientSecret: string
  operatorId: string
  operatorName: string
}

const STORAGE_KEY = 'jc.admin.settings'

const defaults: ConnectionSettings = {
  baseUrl: '',
  clientId: '',
  clientSecret: '',
  operatorId: '',
  operatorName: '',
}

function load(): ConnectionSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Partial<ConnectionSettings>
    return {
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
      clientId: typeof parsed.clientId === 'string' ? parsed.clientId : '',
      clientSecret: typeof parsed.clientSecret === 'string' ? parsed.clientSecret : '',
      operatorId: typeof parsed.operatorId === 'string' ? parsed.operatorId : '',
      operatorName: typeof parsed.operatorName === 'string' ? parsed.operatorName : '',
    }
  } catch {
    return { ...defaults }
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<ConnectionSettings>(load())

  const hasCredentials = computed(() => {
    return Boolean(settings.value.clientId && settings.value.clientSecret)
  })

  const resolvedBaseUrl = computed(() => {
    const raw = settings.value.baseUrl.trim()
    if (!raw || raw === '/') return ''
    return raw.replace(/\/+$/, '')
  })

  const displayOperator = computed(() => {
    return settings.value.operatorName.trim() || settings.value.operatorId.trim() || '未设置操作者'
  })

  function save(next: ConnectionSettings) {
    settings.value = {
      baseUrl: next.baseUrl.trim(),
      clientId: next.clientId.trim(),
      clientSecret: next.clientSecret,
      operatorId: next.operatorId.trim(),
      operatorName: next.operatorName.trim(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
  }

  return {
    settings,
    hasCredentials,
    resolvedBaseUrl,
    displayOperator,
    save,
  }
})
