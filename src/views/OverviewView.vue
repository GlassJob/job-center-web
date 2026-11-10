<template>
  <div class="jc-page">
    <PageHeader title="概览" description="查看 Job Center 连接状态与服务规模。">
      <el-button @click="load">刷新</el-button>
      <el-button type="primary" @click="$router.push('/services')">管理服务</el-button>
    </PageHeader>

    <el-alert
      v-if="!settings.hasCredentials"
      type="warning"
      show-icon
      :closable="false"
      title="尚未配置管理端凭证"
      description="请先到「连接设置」填写 Client ID / Secret。健康检查无需签名，但服务列表需要 HMAC。"
      style="border-radius: 10px"
    />

    <div class="stat-grid">
      <div class="stat jc-card">
        <div class="stat-label">存活检查</div>
        <div class="stat-value" :class="tone(liveOk)">{{ liveOk == null ? '—' : liveOk ? 'OK' : '失败' }}</div>
        <div class="stat-sub">GET /health/live</div>
      </div>
      <div class="stat jc-card">
        <div class="stat-label">就绪检查</div>
        <div class="stat-value" :class="tone(readyOk)">{{ readyOk == null ? '—' : readyOk ? 'OK' : '失败' }}</div>
        <div class="stat-sub">GET /health/ready</div>
      </div>
      <div class="stat jc-card">
        <div class="stat-label">服务</div>
        <div class="stat-value">{{ serviceTotal == null ? '—' : serviceTotal }}</div>
        <div class="stat-sub">已注册服务总数</div>
      </div>
      <div class="stat jc-card">
        <div class="stat-label">任务</div>
        <div class="stat-value">{{ jobTotalLabel }}</div>
        <div class="stat-sub">{{ jobHint }}</div>
      </div>
    </div>

    <div class="jc-card list-card">
      <div class="list-head">
        <h3>服务一览</h3>
        <el-button link type="primary" @click="$router.push('/services')">查看全部</el-button>
      </div>
      <el-empty v-if="!loading && services.length === 0" description="暂无服务，或尚未通过签名校验" />
      <div v-else class="cards">
        <button
          v-for="item in services"
          :key="item.id"
          class="svc"
          type="button"
          @click="$router.push(`/services/${item.id}`)"
        >
          <div class="svc-top">
            <div class="tile">{{ item.name.slice(0, 1).toUpperCase() }}</div>
            <StatusTag :status="item.status" />
          </div>
          <div class="svc-name">{{ item.name }}</div>
          <div class="jc-code">{{ item.code }}</div>
          <div v-if="item.description" class="svc-desc">{{ item.description }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { healthApi, servicesApi } from '@/api'
import type { Service } from '@/api/types'
import { toastError } from '@/utils/feedback'
import { useSettingsStore } from '@/stores/settings'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'

const settings = useSettingsStore()
const loading = ref(false)
const liveOk = ref<boolean | null>(null)
const readyOk = ref<boolean | null>(null)
const services = ref<Service[]>([])
const serviceTotal = ref<number | null>(null)
const jobTotal = ref<number | null>(null)
const jobsComplete = ref(false)

const jobTotalLabel = computed(() => {
  if (jobTotal.value == null) return '—'
  return jobsComplete.value ? String(jobTotal.value) : `${jobTotal.value}+`
})

const jobHint = computed(() => {
  if (jobTotal.value == null) return '需先连接后统计'
  return jobsComplete.value ? '各服务任务数合计' : '服务较多，仅展示首页合计下限'
})

function tone(ok: boolean | null): string {
  if (ok == null) return ''
  return ok ? 'ok' : 'bad'
}

async function load() {
  loading.value = true
  liveOk.value = null
  readyOk.value = null
  try {
    try {
      liveOk.value = (await healthApi.live()).status === 'ok'
    } catch {
      liveOk.value = false
    }
    try {
      readyOk.value = (await healthApi.ready()).status === 'ok'
    } catch {
      readyOk.value = false
    }

    if (!settings.hasCredentials) {
      services.value = []
      serviceTotal.value = null
      jobTotal.value = null
      return
    }

    const list = await servicesApi.list({ page: 1, limit: 20 })
    services.value = list.list
    serviceTotal.value = list.total

    if (list.total === 0) {
      jobTotal.value = 0
      jobsComplete.value = true
    } else if (list.total <= 20) {
      const details = await Promise.all(list.list.map((s) => servicesApi.get(s.id)))
      jobTotal.value = details.reduce((sum, d) => sum + (d.job_count || 0), 0)
      jobsComplete.value = true
    } else {
      const details = await Promise.all(list.list.map((s) => servicesApi.get(s.id)))
      jobTotal.value = details.reduce((sum, d) => sum + (d.job_count || 0), 0)
      jobsComplete.value = false
    }
  } catch (err) {
    toastError(err, '加载概览失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
@media (max-width: 1100px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.stat {
  padding: 18px 20px;
}
.stat-label {
  color: var(--jc-text-muted);
  font-size: 12px;
  font-weight: 600;
}
.stat-value {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
}
.stat-value.ok {
  color: var(--jc-success);
}
.stat-value.bad {
  color: var(--jc-danger);
}
.stat-sub {
  margin-top: 4px;
  color: var(--jc-text-secondary);
  font-size: 12px;
}
.list-card {
  padding: 18px 20px 20px;
}
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.list-head h3 {
  margin: 0;
  font-size: 15px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.svc {
  text-align: left;
  border: 1px solid var(--jc-border);
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
}
.svc:hover {
  border-color: var(--jc-primary-mid);
  box-shadow: var(--jc-shadow);
}
.svc-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.tile {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--jc-primary-soft);
  color: var(--jc-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.svc-name {
  margin-top: 10px;
  font-weight: 650;
  font-size: 15px;
}
.svc-desc {
  margin-top: 6px;
  color: var(--jc-text-secondary);
  font-size: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
