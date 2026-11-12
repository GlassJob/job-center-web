<template>
  <div class="jc-page">
    <PageHeader title="实例" description="查看各服务下执行器实例的在线状态、心跳和宿主机信息。">
      <el-button @click="cluster.refresh(true)">刷新</el-button>
    </PageHeader>

    <el-alert
      v-if="cluster.instanceScopeMissing"
      type="warning"
      show-icon
      :closable="false"
      title="当前客户端缺少「实例查看」权限，实例列表可能不完整。请在「客户端」中勾选该权限。"
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
          placeholder="搜索实例、主机名或 IP"
          style="width: 240px"
        />
        <el-select v-model="status" clearable placeholder="状态" style="width: 150px">
          <el-option v-for="item in INSTANCE_STATUSES" :key="item" :label="statusLabel(item)" :value="item" />
        </el-select>
        <span class="jc-toolbar-spacer" />
        <span class="jc-muted">在线 {{ onlineCount }} / 共 {{ filtered.length }}</span>
      </div>

      <el-table v-loading="cluster.loading" :data="paged" @row-click="goDetail">
        <el-table-column label="实例" min-width="200">
          <template #default="{ row }">
            <div class="name">{{ row.instance.instance_key || row.instance.id }}</div>
            <div class="jc-code">{{ row.instance.id }}</div>
          </template>
        </el-table-column>
        <el-table-column label="服务" min-width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="$router.push(`/services/${row.service.id}?tab=instances`)">
              {{ row.service.name }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }"><StatusTag :status="row.instance.status" /></template>
        </el-table-column>
        <el-table-column label="主机 / IP" min-width="180">
          <template #default="{ row }">
            <div>{{ row.instance.hostname || '—' }}</div>
            <div class="jc-code">{{ row.instance.ip_address || '—' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="运行时" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ [row.instance.language, row.instance.runtime_version, row.instance.sdk_version].filter(Boolean).join(' · ') || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="最近心跳" width="180">
          <template #default="{ row }">{{ formatTime(row.instance.last_heartbeat_at) }}</template>
        </el-table-column>
        <el-table-column label="并发" width="100">
          <template #default="{ row }">
            {{ row.instance.running_count ?? 0 }} / {{ row.instance.max_concurrency ?? '—' }}
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { INSTANCE_STATUSES } from '@/api/types'
import type { ClusterInstance } from '@/stores/cluster'
import { useClusterStore } from '@/stores/cluster'
import { formatTime } from '@/utils/time'
import { statusLabel } from '@/utils/status'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'

const cluster = useClusterStore()
const router = useRouter()
const serviceId = ref('')
const keyword = ref('')
const status = ref('')
const page = ref(1)
const limit = ref(20)

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return cluster.instances.filter((item) => {
    if (serviceId.value && item.service.id !== serviceId.value) return false
    if (status.value && item.instance.status !== status.value) return false
    if (!q) return true
    const blob = [
      item.instance.instance_key,
      item.instance.id,
      item.instance.hostname,
      item.instance.ip_address,
      item.service.name,
      item.service.code,
    ]
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

const onlineCount = computed(
  () => filtered.value.filter((item) => item.instance.status === 'ONLINE').length,
)

function goDetail(row: ClusterInstance) {
  void router.push(`/services/${row.service.id}/instances/${row.instance.id}`)
}

watch([serviceId, keyword, status], () => {
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
</style>
