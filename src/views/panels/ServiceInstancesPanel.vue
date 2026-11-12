<template>
  <div>
    <div class="jc-toolbar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="搜索 ID、实例标识、主机名或 IP"
        @keyup.enter="reload"
        @clear="reload"
      />
      <el-select v-model="status" clearable placeholder="状态" style="width: 160px" @change="reload">
        <el-option
          v-for="item in INSTANCE_STATUSES"
          :key="item"
          :label="statusMeta(item).label"
          :value="item"
        />
      </el-select>
      <el-button @click="reload">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="list" @row-click="goDetail">
      <el-table-column label="实例" min-width="220">
        <template #default="{ row }">
          <div class="name">{{ row.instance_key || row.id }}</div>
          <div class="jc-code">{{ row.hostname || '—' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }"><StatusTag :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="地址" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.ip_address || row.reported_ip || '—' }}</template>
      </el-table-column>
      <el-table-column label="环境" width="110" show-overflow-tooltip>
        <template #default="{ row }">{{ row.environment || '—' }}</template>
      </el-table-column>
      <el-table-column label="并发" width="100">
        <template #default="{ row }">{{ row.running_count }} / {{ row.max_concurrency }}</template>
      </el-table-column>
      <el-table-column label="已注册任务" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ jobCodes(row) }}
        </template>
      </el-table-column>
      <el-table-column label="运行时" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          {{ [row.language, row.runtime_version || row.sdk_version].filter(Boolean).join(' ') || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="最近心跳" width="180">
        <template #default="{ row }">{{ formatTime(row.last_heartbeat_at) }}</template>
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
        @size-change="reload"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { instancesApi } from '@/api'
import { INSTANCE_STATUSES, type InstanceView } from '@/api/types'
import { toastError } from '@/utils/feedback'
import { statusMeta } from '@/utils/status'
import { formatTime } from '@/utils/time'
import StatusTag from '@/components/StatusTag.vue'

const props = defineProps<{ serviceId: string }>()
const router = useRouter()
const loading = ref(false)
const list = ref<InstanceView[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const keyword = ref('')
const status = ref('')

function jobCodes(row: InstanceView) {
  const jobs = row.jobs || []
  if (!jobs.length) return '—'
  return jobs.map((item) => item.job_code).join(', ')
}

function goDetail(row: InstanceView) {
  void router.push(`/services/${props.serviceId}/instances/${row.id}`)
}

async function fetchList() {
  loading.value = true
  try {
    const res = await instancesApi.list(props.serviceId, {
      keyword: keyword.value.trim(),
      status: status.value,
      page: page.value,
      limit: limit.value,
    })
    list.value = res.list
    total.value = res.total
  } catch (err) {
    toastError(err, '加载实例失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  void fetchList()
}

onMounted(() => {
  void fetchList()
})
</script>

<style scoped>
.name {
  font-weight: 600;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
