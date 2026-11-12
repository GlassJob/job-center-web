<template>
  <div class="jc-page">
    <PageHeader title="执行记录" description="查看调度与手动触发的执行历史、失败原因和进度。">
      <el-button :loading="loading" @click="reload">刷新</el-button>
    </PageHeader>

    <div class="jc-card table-card">
      <div class="jc-toolbar">
        <el-select
          v-model="serviceId"
          clearable
          filterable
          placeholder="全部服务"
          style="width: 200px"
          @change="onFilter"
        >
          <el-option
            v-for="item in services"
            :key="item.id"
            :label="`${item.name} (${item.code})`"
            :value="item.id"
          />
        </el-select>
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索任务或执行 ID"
          style="width: 240px"
          @keyup.enter="onFilter"
          @clear="onFilter"
        />
        <el-select v-model="status" clearable placeholder="状态" style="width: 140px" @change="onFilter">
          <el-option v-for="item in EXEC_STATUSES" :key="item" :label="statusLabel(item)" :value="item" />
        </el-select>
        <el-date-picker
          v-model="range"
          type="datetimerange"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
          @change="onFilter"
        />
        <span class="jc-toolbar-spacer" />
        <span class="jc-muted">共 {{ total }} 条</span>
      </div>

      <el-table v-loading="loading" :data="list" @row-click="goDetail">
        <el-table-column label="执行 ID" min-width="200">
          <template #default="{ row }"><span class="jc-code">{{ row.id }}</span></template>
        </el-table-column>
        <el-table-column label="任务" min-width="180">
          <template #default="{ row }">
            <div class="name">{{ row.job_name || row.job_code || '—' }}</div>
            <div class="jc-code">{{ row.job_code }}</div>
          </template>
        </el-table-column>
        <el-table-column label="服务" min-width="140">
          <template #default="{ row }">{{ row.service_name || row.service_code || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="触发方式" width="120">
          <template #default="{ row }">{{ enumLabel(row.trigger_type, TRIGGER_TYPE_LABELS) }}</template>
        </el-table-column>
        <el-table-column label="开始 / 结束" width="200">
          <template #default="{ row }">
            {{ formatTime(row.started_at) }} / {{ formatTime(row.finished_at) }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">{{ durationText(row) }}</template>
        </el-table-column>
        <el-table-column label="实例" min-width="140">
          <template #default="{ row }">
            {{ row.attempt?.instance_key || row.attempt?.instance_id || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="goDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="limit"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @current-change="fetchList"
          @size-change="onFilter"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { executionsApi, servicesApi } from '@/api'
import type { ExecutionView, ServiceDetail } from '@/api/types'
import { toastError } from '@/utils/feedback'
import { TRIGGER_TYPE_LABELS, enumLabel } from '@/utils/labels'
import { statusLabel } from '@/utils/status'
import { formatTime } from '@/utils/time'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'

const EXEC_STATUSES = [
  'QUEUED',
  'DISPATCHING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'TIMED_OUT',
  'RETRY_WAIT',
  'SKIPPED',
]

const router = useRouter()
const loading = ref(false)
const list = ref<ExecutionView[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const keyword = ref('')
const serviceId = ref('')
const status = ref('')
const range = ref<[string, string] | null>(null)
const services = ref<ServiceDetail[]>([])

function durationText(row: ExecutionView) {
  if (!row.started_at || !row.finished_at) return '—'
  const ms = new Date(row.finished_at).getTime() - new Date(row.started_at).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms / 60000)}m`
}

function goDetail(row: ExecutionView) {
  void router.push(`/services/${row.service_id}/jobs/${row.job_id}/executions/${row.id}`)
}

function onFilter() {
  page.value = 1
  void fetchList()
}

async function fetchList() {
  loading.value = true
  try {
    const res = await executionsApi.list({
      page: page.value,
      limit: limit.value,
      keyword: keyword.value.trim() || undefined,
      service_id: serviceId.value || undefined,
      status: status.value || undefined,
      created_from: range.value?.[0] || undefined,
      created_to: range.value?.[1] || undefined,
    })
    list.value = res.list
    total.value = res.total
  } catch (err) {
    toastError(err, '加载执行记录失败')
  } finally {
    loading.value = false
  }
}

async function reload() {
  await fetchList()
}

onMounted(async () => {
  try {
    const res = await servicesApi.list({ page: 1, limit: 100 })
    services.value = res.list
  } catch {
    services.value = []
  }
  await fetchList()
})
</script>

<style scoped>
.table-card { padding: 16px 16px 8px; }
.name { font-weight: 600; }
.pager { display: flex; justify-content: flex-end; padding: 14px 4px 4px; }
</style>
