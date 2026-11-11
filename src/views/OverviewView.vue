<template>
  <div class="jc-page">
    <PageHeader title="运行概览" description="先看集群是否健康、有哪些调度即将触发，再进入任务管理做日常操作。">
      <el-button @click="reload">刷新</el-button>
      <el-button type="primary" @click="$router.push('/jobs')">任务管理</el-button>
    </PageHeader>

    <el-alert
      v-if="!settings.hasCredentials"
      type="warning"
      show-icon
      :closable="false"
      title="尚未配置管理端凭证"
      description="请先到「连接设置」填写 Client ID / Secret。健康检查无需签名，但任务与实例数据需要 HMAC。"
      style="border-radius: 10px"
    />

    <div class="stat-grid">
      <button class="stat jc-card" type="button" @click="$router.push('/services')">
        <div class="stat-label">服务</div>
        <div class="stat-value">{{ dash(cluster.services.length) }}</div>
        <div class="stat-sub">已注册执行器 / 应用</div>
      </button>
      <button class="stat jc-card" type="button" @click="$router.push('/jobs')">
        <div class="stat-label">任务</div>
        <div class="stat-value">{{ dash(cluster.jobs.length) }}</div>
        <div class="stat-sub">启用 {{ cluster.enabledJobs.length }} 个</div>
      </button>
      <button class="stat jc-card" type="button" @click="$router.push('/instances')">
        <div class="stat-label">在线实例</div>
        <div class="stat-value" :class="{ ok: cluster.onlineInstances.length > 0 }">
          {{ dash(cluster.onlineInstances.length) }}
        </div>
        <div class="stat-sub">共 {{ cluster.instances.length }} 个实例</div>
      </button>
      <button class="stat jc-card" type="button" @click="$router.push('/instances')">
        <div class="stat-label">异常实例</div>
        <div class="stat-value" :class="{ bad: cluster.unhealthyInstances.length > 0 }">
          {{ dash(cluster.unhealthyInstances.length) }}
        </div>
        <div class="stat-sub">非 ONLINE 的执行器</div>
      </button>
    </div>

    <div class="stat-grid reserved-grid">
      <div class="stat jc-card reserved">
        <div class="stat-label">今日调度</div>
        <div class="stat-value muted">—</div>
        <div class="stat-sub">待接入概览统计接口</div>
      </div>
      <div class="stat jc-card reserved">
        <div class="stat-label">今日成功 / 失败</div>
        <div class="stat-value muted">— / —</div>
        <div class="stat-sub">待接入执行汇总</div>
      </div>
      <div class="stat jc-card reserved">
        <div class="stat-label">运行中</div>
        <div class="stat-value muted">—</div>
        <div class="stat-sub">待接入执行列表</div>
      </div>
      <div class="stat jc-card reserved">
        <div class="stat-label">存活 / 就绪</div>
        <div class="stat-value" :class="tone(liveOk && readyOk)">
          {{ healthText }}
        </div>
        <div class="stat-sub">调度中心自身健康检查</div>
      </div>
    </div>

    <div class="split">
      <div class="jc-card list-card">
        <div class="list-head">
          <h3>即将触发</h3>
          <el-button link type="primary" @click="$router.push('/jobs')">全部任务</el-button>
        </div>
        <el-empty v-if="!cluster.loading && cluster.upcomingSchedules.length === 0" description="没有已启用且带下次触发时间的调度" />
        <el-table v-else :data="cluster.upcomingSchedules" @row-click="goJob">
          <el-table-column label="任务" min-width="180">
            <template #default="{ row }">
              <div class="name">{{ row.job.name }}</div>
              <div class="jc-code">{{ row.job.code }}</div>
            </template>
          </el-table-column>
          <el-table-column label="服务" min-width="120">
            <template #default="{ row }">{{ row.service.name }}</template>
          </el-table-column>
          <el-table-column label="Cron" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.schedule.cron_expression || '—' }}</template>
          </el-table-column>
          <el-table-column label="下次触发" width="180">
            <template #default="{ row }">{{ formatTime(row.next) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div class="jc-card list-card">
        <div class="list-head">
          <h3>异常实例</h3>
          <el-button link type="primary" @click="$router.push('/instances')">全部实例</el-button>
        </div>
        <el-empty v-if="!cluster.loading && cluster.unhealthyInstances.length === 0" description="当前没有非在线实例" />
        <el-table v-else :data="cluster.unhealthyInstances.slice(0, 8)" @row-click="goInstance">
          <el-table-column label="实例" min-width="140">
            <template #default="{ row }">{{ row.instance.instance_key || row.instance.id }}</template>
          </el-table-column>
          <el-table-column label="服务" min-width="110">
            <template #default="{ row }">{{ row.service.name }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }"><StatusTag :status="row.instance.status" /></template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="jc-card list-card">
      <div class="list-head">
        <h3>最近失败</h3>
        <el-button link type="primary" disabled>执行记录</el-button>
      </div>
      <el-empty description="执行列表接口就绪后，这里会列出最近失败的任务，并跳转到执行详情和日志。" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { healthApi } from '@/api'
import type { JobView, Service } from '@/api/types'
import { useClusterStore } from '@/stores/cluster'
import { useSettingsStore } from '@/stores/settings'
import { formatTime } from '@/utils/time'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'

const settings = useSettingsStore()
const cluster = useClusterStore()
const router = useRouter()
const liveOk = ref<boolean | null>(null)
const readyOk = ref<boolean | null>(null)

const healthText = computed(() => {
  if (liveOk.value == null) return '—'
  if (liveOk.value && readyOk.value) return 'OK'
  if (liveOk.value) return '未就绪'
  return '失败'
})

function dash(n: number) {
  if (cluster.loading && !cluster.loadedAt) return '—'
  return String(n)
}

function tone(ok: boolean | null): string {
  if (ok == null) return ''
  return ok ? 'ok' : 'bad'
}

function goJob(row: { job: JobView; service: Service }) {
  void router.push(`/services/${row.service.id}/jobs/${row.job.id}`)
}

function goInstance(row: { instance: { id: string }; service: { id: string } }) {
  void router.push(`/services/${row.service.id}/instances/${row.instance.id}`)
}

async function reload() {
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
  if (settings.hasCredentials) {
    await cluster.refresh(true)
  }
}

onMounted(() => {
  void reload()
})
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.reserved-grid { margin-top: 0; }
@media (max-width: 1100px) {
  .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.stat {
  padding: 18px 20px;
  text-align: left;
  border: 1px solid var(--jc-border);
  background: #fff;
  cursor: pointer;
}
.stat.reserved { cursor: default; }
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
.stat-value.ok { color: var(--jc-success); }
.stat-value.bad { color: var(--jc-danger); }
.stat-value.muted { color: var(--jc-text-muted); }
.stat-sub {
  margin-top: 4px;
  color: var(--jc-text-secondary);
  font-size: 12px;
}
.split {
  display: grid;
  grid-template-columns: 1.3fr 0.9fr;
  gap: 14px;
}
@media (max-width: 1100px) {
  .split { grid-template-columns: 1fr; }
}
.list-card { padding: 18px 20px 20px; }
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.list-head h3 { margin: 0; font-size: 15px; }
.name { font-weight: 600; }
</style>
