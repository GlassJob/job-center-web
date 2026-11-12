<template>
  <div class="jc-page">
    <PageHeader title="调度触点" description="查看预生成的 schedule_triggers，并可对单排班或全平台先删再插重生。">
      <el-button :loading="loading" @click="reload">刷新</el-button>
      <el-button type="warning" :loading="regenAllLoading" @click="onRegenerateAll">全平台重生</el-button>
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
        <el-select v-model="status" clearable placeholder="状态" style="width: 140px" @change="onFilter">
          <el-option v-for="item in TRIGGER_STATUSES" :key="item" :label="statusLabel(item)" :value="item" />
        </el-select>
        <el-input
          v-model="scheduleId"
          clearable
          placeholder="排班 ID"
          style="width: 220px"
          @keyup.enter="onFilter"
          @clear="onFilter"
        />
        <el-date-picker
          v-model="range"
          type="datetimerange"
          start-placeholder="开火起"
          end-placeholder="开火止"
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
          @change="onFilter"
        />
        <span class="jc-toolbar-spacer" />
        <span class="jc-muted">共 {{ total }} 条</span>
      </div>

      <el-table v-loading="loading" :data="list">
        <el-table-column label="开火时间" width="180">
          <template #default="{ row }">{{ formatTime(row.fire_at) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="排班" min-width="160">
          <template #default="{ row }">
            <div class="name">{{ row.schedule_name || '—' }}</div>
            <div class="jc-code">{{ row.schedule_code || row.schedule_id }}</div>
          </template>
        </el-table-column>
        <el-table-column label="任务" min-width="160">
          <template #default="{ row }">
            <div class="name">{{ row.job_name || row.job_code || '—' }}</div>
            <div class="jc-code">{{ row.job_code }}</div>
          </template>
        </el-table-column>
        <el-table-column label="服务" min-width="120">
          <template #default="{ row }">{{ row.service_name || row.service_code || '—' }}</template>
        </el-table-column>
        <el-table-column label="执行" min-width="160">
          <template #default="{ row }">
            <el-button
              v-if="row.execution_id && row.service_id && row.job_id"
              link
              type="primary"
              @click="goExecution(row)"
            >
              {{ row.execution_id.slice(0, 8) }}…
            </el-button>
            <span v-else class="jc-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="跳过原因" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.skip_reason || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.service_id && row.job_id"
              link
              type="primary"
              @click="goJob(row)"
            >
              任务
            </el-button>
            <el-button
              v-if="row.service_id && row.job_id && row.schedule_id"
              link
              type="warning"
              :loading="regenOneId === row.schedule_id"
              @click="onRegenerateOne(row)"
            >
              重生
            </el-button>
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
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { schedulesApi, schedulerApi, servicesApi, triggersApi } from '@/api'
import type { ScheduleTriggerView, ServiceDetail } from '@/api/types'
import { toastError } from '@/utils/feedback'
import { statusLabel } from '@/utils/status'
import { formatTime } from '@/utils/time'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'

const TRIGGER_STATUSES = ['PENDING', 'CLAIMED', 'FIRED', 'SKIPPED', 'CANCELLED']

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const regenAllLoading = ref(false)
const regenOneId = ref('')
const list = ref<ScheduleTriggerView[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const serviceId = ref('')
const status = ref('')
const scheduleId = ref('')
const range = ref<[string, string] | null>(null)
const services = ref<ServiceDetail[]>([])

function applyQuery() {
  if (typeof route.query.schedule_id === 'string') scheduleId.value = route.query.schedule_id
  if (typeof route.query.service_id === 'string') serviceId.value = route.query.service_id
  if (typeof route.query.status === 'string') status.value = route.query.status
}

function goJob(row: ScheduleTriggerView) {
  if (!row.service_id || !row.job_id) return
  void router.push(`/services/${row.service_id}/jobs/${row.job_id}?tab=schedules`)
}

function goExecution(row: ScheduleTriggerView) {
  if (!row.service_id || !row.job_id || !row.execution_id) return
  void router.push(`/services/${row.service_id}/jobs/${row.job_id}/executions/${row.execution_id}`)
}

function onFilter() {
  page.value = 1
  void fetchList()
}

async function fetchList() {
  loading.value = true
  try {
    const res = await triggersApi.list({
      page: page.value,
      limit: limit.value,
      service_id: serviceId.value || undefined,
      schedule_id: scheduleId.value.trim() || undefined,
      status: status.value || undefined,
      fire_from: range.value?.[0] || undefined,
      fire_to: range.value?.[1] || undefined,
    })
    list.value = res.list
    total.value = res.total
  } catch (err) {
    toastError(err, '加载触点失败')
  } finally {
    loading.value = false
  }
}

async function reload() {
  await fetchList()
}

async function onRegenerateAll() {
  try {
    await ElMessageBox.confirm(
      '将对全部已启用且带 Cron 的排班执行先删再插。近端 PENDING 会重建，可能短暂影响即将触发的任务。',
      '全平台重生',
      { type: 'warning', confirmButtonText: '重生', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  regenAllLoading.value = true
  try {
    const out = await schedulerApi.regenerateAll()
    ElMessage.success(`重生完成：成功 ${out.succeeded}/${out.total}` + (out.failed ? `，失败 ${out.failed}` : ''))
    await fetchList()
  } catch (err) {
    toastError(err, '全平台重生失败')
  } finally {
    regenAllLoading.value = false
  }
}

async function onRegenerateOne(row: ScheduleTriggerView) {
  if (!row.service_id || !row.job_id || !row.schedule_id) return
  try {
    await ElMessageBox.confirm(
      `重生排班「${row.schedule_name || row.schedule_code || row.schedule_id}」的未来触点？`,
      '单排班重生',
      { type: 'warning', confirmButtonText: '重生', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  regenOneId.value = row.schedule_id
  try {
    await schedulesApi.regenerate(row.service_id, row.job_id, row.schedule_id)
    ElMessage.success('已重生')
    await fetchList()
  } catch (err) {
    toastError(err, '重生失败')
  } finally {
    regenOneId.value = ''
  }
}

watch(
  () => route.query,
  () => {
    applyQuery()
    void fetchList()
  },
)

onMounted(async () => {
  applyQuery()
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
