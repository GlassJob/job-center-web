<template>
  <div class="jc-page">
    <PageHeader title="审计" description="查询管理端操作审计。时间按 Asia/Shanghai 展示，筛选值按 RFC3339 UTC 提交。" />

    <div class="jc-card table-card">
      <div class="jc-toolbar filters">
        <el-input v-model="filters.client_id" clearable placeholder="Client ID" style="width: 180px" />
        <el-input v-model="filters.operator_id" clearable placeholder="Operator ID" style="width: 160px" />
        <el-input v-model="filters.action" clearable placeholder="Action" style="width: 160px" />
        <el-input v-model="filters.resource_type" clearable placeholder="资源类型" style="width: 140px" />
        <el-input v-model="filters.resource_id" clearable placeholder="资源 ID" style="width: 180px" />
        <el-select v-model="filters.result" clearable placeholder="结果" style="width: 120px">
          <el-option label="OK" value="OK" />
          <el-option label="ERROR" value="ERROR" />
          <el-option label="DENIED" value="DENIED" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          range-separator="至"
        />
        <el-button type="primary" @click="reload">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" @row-click="openDetail">
        <el-table-column label="时间" width="180">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作者" min-width="150">
          <template #default="{ row }">
            <div>{{ row.operator_name || row.operator_id || '—' }}</div>
            <div class="jc-code">{{ row.client_id }}</div>
          </template>
        </el-table-column>
        <el-table-column label="动作" min-width="160" prop="action" />
        <el-table-column label="资源" min-width="200">
          <template #default="{ row }">
            <div>{{ row.resource_type }}</div>
            <div class="jc-code">{{ row.resource_id || '—' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="结果" width="110">
          <template #default="{ row }"><StatusTag :status="row.result" /></template>
        </el-table-column>
        <el-table-column label="权限" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.permission || '—' }}</template>
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

    <el-drawer v-model="drawer" title="审计详情" size="520px">
      <template v-if="current">
        <dl class="jc-kv">
          <dt>ID</dt>
          <dd>{{ current.id }}</dd>
          <dt>时间</dt>
          <dd>{{ formatTimeTzLabel(current.created_at) }}</dd>
          <dt>Client</dt>
          <dd class="jc-code">{{ current.client_id }}</dd>
          <dt>操作者</dt>
          <dd>{{ current.operator_name || '—' }} / {{ current.operator_id || '—' }}</dd>
          <dt>动作</dt>
          <dd>{{ current.action }}</dd>
          <dt>权限</dt>
          <dd>{{ current.permission || '—' }}</dd>
          <dt>资源</dt>
          <dd>{{ current.resource_type }} / <span class="jc-code">{{ current.resource_id || '—' }}</span></dd>
          <dt>结果</dt>
          <dd><StatusTag :status="current.result" /></dd>
          <dt>错误</dt>
          <dd>{{ current.error_message || '—' }}</dd>
          <dt>Request / Trace</dt>
          <dd class="jc-code">{{ current.request_id || '—' }} / {{ current.trace_id || '—' }}</dd>
          <dt>IP</dt>
          <dd>{{ current.client_ip || '—' }}</dd>
        </dl>
        <h4>Before</h4>
        <pre class="json-pre">{{ prettyJson(current.before_data) || '—' }}</pre>
        <h4>After</h4>
        <pre class="json-pre">{{ prettyJson(current.after_data) || '—' }}</pre>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { auditsApi } from '@/api'
import type { OperationAuditView } from '@/api/types'
import { toastError } from '@/utils/feedback'
import { prettyJson } from '@/utils/json'
import { formatTime, formatTimeTzLabel, toRfc3339Utc } from '@/utils/time'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'

const loading = ref(false)
const list = ref<OperationAuditView[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const dateRange = ref<[Date, Date] | null>(null)
const filters = reactive({
  client_id: '',
  operator_id: '',
  action: '',
  resource_type: '',
  resource_id: '',
  result: '',
})
const drawer = ref(false)
const current = ref<OperationAuditView | null>(null)

async function fetchList() {
  loading.value = true
  try {
    const res = await auditsApi.list({
      page: page.value,
      limit: limit.value,
      client_id: filters.client_id.trim(),
      operator_id: filters.operator_id.trim(),
      action: filters.action.trim(),
      resource_type: filters.resource_type.trim(),
      resource_id: filters.resource_id.trim(),
      result: filters.result,
      created_from: dateRange.value?.[0] ? toRfc3339Utc(dateRange.value[0]) : undefined,
      created_to: dateRange.value?.[1] ? toRfc3339Utc(dateRange.value[1]) : undefined,
    })
    list.value = res.list
    total.value = res.total
  } catch (err) {
    toastError(err, '加载审计失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  void fetchList()
}

function reset() {
  filters.client_id = ''
  filters.operator_id = ''
  filters.action = ''
  filters.resource_type = ''
  filters.resource_id = ''
  filters.result = ''
  dateRange.value = null
  reload()
}

async function openDetail(row: OperationAuditView) {
  try {
    current.value = await auditsApi.get(row.id)
  } catch {
    current.value = row
  }
  drawer.value = true
}

onMounted(() => {
  void fetchList()
})
</script>

<style scoped>
.table-card { padding: 16px 16px 12px; }
.filters { align-items: flex-start; }
.pager { display: flex; justify-content: flex-end; padding: 14px 4px 4px; }
h4 { margin: 18px 0 8px; font-size: 13px; color: var(--jc-text-secondary); }
</style>
