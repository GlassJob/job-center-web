<template>
  <div class="jc-page">
    <PageHeader title="任务管理" description="跨服务查看任务、调度和下一次触发时间，并直接执行一次。">
      <el-button @click="cluster.refresh(true)">刷新</el-button>
    </PageHeader>

    <el-alert
      v-if="cluster.truncated"
      type="info"
      show-icon
      :closable="false"
      title="当前先按服务聚合任务列表。服务或任务较多时可能未全部载入，建议之后提供全局任务查询接口。"
      style="border-radius: 10px"
    />

    <div class="jc-card table-card">
      <div class="jc-toolbar">
        <el-select
          v-model="serviceId"
          clearable
          filterable
          placeholder="全部服务"
          style="width: 220px"
        >
          <el-option
            v-for="item in cluster.services"
            :key="item.id"
            :label="`${item.name} (${item.code})`"
            :value="item.id"
          />
        </el-select>
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索任务名称、编码或 Handler"
          style="width: 260px"
          @keyup.enter="page = 1"
        />
        <el-select v-model="enabled" clearable placeholder="是否启用" style="width: 140px">
          <el-option label="启用" value="true" />
          <el-option label="停用" value="false" />
        </el-select>
        <el-select v-model="scheduleState" clearable placeholder="调度" style="width: 150px">
          <el-option label="有启用中的调度" value="on" />
          <el-option label="无启用调度" value="off" />
        </el-select>
        <span class="jc-toolbar-spacer" />
        <span class="jc-muted">共 {{ filtered.length }} 条</span>
      </div>

      <el-table v-loading="cluster.loading" :data="paged" @row-click="goDetail">
        <el-table-column label="任务" min-width="220">
          <template #default="{ row }">
            <div class="name">{{ row.job.name }}</div>
            <div class="jc-code">{{ row.job.code }}</div>
          </template>
        </el-table-column>
        <el-table-column label="服务" min-width="160">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="goService(row.service.id)">
              {{ row.service.name }}
            </el-button>
            <div class="jc-code">{{ row.service.code }}</div>
          </template>
        </el-table-column>
        <el-table-column label="调度" min-width="200">
          <template #default="{ row }">
            <div>{{ scheduleSummary(row.schedules) }}</div>
            <div class="jc-muted">{{ scheduleStateText(row.schedules) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="下次触发" width="180">
          <template #default="{ row }">
            {{ formatTime(primarySchedule(row.schedules)?.next_fire_at) }}
          </template>
        </el-table-column>
        <el-table-column label="最近执行" width="150">
          <template #default>
            <span class="placeholder" title="需任务列表附带 last_execution_* 或执行列表接口">待接入</span>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80">
          <template #default="{ row }">
            <el-switch
              :model-value="row.job.enabled"
              @click.stop
              @change="(v: boolean) => toggleEnabled(row, v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="Handler" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.job.handler || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openTrigger(row)">执行一次</el-button>
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
          :total="filtered.length"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </div>

    <TriggerJobDialog
      v-model="triggerVisible"
      :service-id="triggerTarget?.service.id || ''"
      :job-id="triggerTarget?.job.id || ''"
      :job-name="triggerTarget?.job.name"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { jobsApi } from '@/api'
import type { ScheduleView } from '@/api/types'
import type { ClusterJob } from '@/stores/cluster'
import { useClusterStore } from '@/stores/cluster'
import { toastError } from '@/utils/feedback'
import { primarySchedule, scheduleSummary } from '@/utils/schedule'
import { formatTime } from '@/utils/time'
import PageHeader from '@/components/PageHeader.vue'
import TriggerJobDialog from '@/components/TriggerJobDialog.vue'

const cluster = useClusterStore()
const route = useRoute()
const router = useRouter()
const serviceId = ref((route.query.service as string) || '')
const keyword = ref((route.query.q as string) || '')
const enabled = ref('')
const scheduleState = ref('')
const page = ref(1)
const limit = ref(20)
const triggerVisible = ref(false)
const triggerTarget = ref<ClusterJob | null>(null)

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return cluster.jobs.filter((item) => {
    if (serviceId.value && item.service.id !== serviceId.value) return false
    if (enabled.value === 'true' && !item.job.enabled) return false
    if (enabled.value === 'false' && item.job.enabled) return false
    const hasOn = item.schedules.some((s) => s.enabled)
    if (scheduleState.value === 'on' && !hasOn) return false
    if (scheduleState.value === 'off' && hasOn) return false
    if (!q) return true
    const blob = [item.job.name, item.job.code, item.job.handler, item.service.name, item.service.code]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return blob.includes(q)
  })
})

const paged = computed(() => {
  const start = (page.value - 1) * limit.value
  return filtered.value.slice(start, start + limit.value)
})

function scheduleStateText(schedules: ScheduleView[]) {
  const on = schedules.filter((item) => item.enabled).length
  if (!schedules.length) return '未配置'
  if (!on) return '调度已停用'
  return on === schedules.length ? '调度运行中' : `${on}/${schedules.length} 条运行中`
}

function goDetail(row: ClusterJob) {
  void router.push(`/services/${row.service.id}/jobs/${row.job.id}`)
}

function goService(id: string) {
  void router.push(`/services/${id}`)
}

function openTrigger(row: ClusterJob) {
  triggerTarget.value = row
  triggerVisible.value = true
}

async function toggleEnabled(row: ClusterJob, value: boolean) {
  try {
    await jobsApi.patch(row.service.id, row.job.id, { enabled: value })
    row.job.enabled = value
    ElMessage.success(value ? '已启用' : '已停用')
  } catch (err) {
    toastError(err, '更新失败')
  }
}

watch([serviceId, keyword, enabled, scheduleState], () => {
  page.value = 1
})

onMounted(() => {
  void cluster.refresh()
})
</script>

<style scoped>
.table-card { padding: 16px 16px 8px; }
.name { font-weight: 600; }
.pager { display: flex; justify-content: flex-end; padding: 14px 4px 4px; }
.placeholder { color: var(--jc-text-muted); font-size: 12px; }
</style>
