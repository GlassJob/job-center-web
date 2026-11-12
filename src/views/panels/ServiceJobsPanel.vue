<template>
  <div>
    <div class="jc-toolbar">
      <el-input v-model="keyword" clearable placeholder="搜索任务" @keyup.enter="reload" @clear="reload" />
      <el-select v-model="status" clearable placeholder="状态" style="width: 140px" @change="reload">
        <el-option label="启用" value="ACTIVE" />
        <el-option label="停用" value="DISABLED" />
      </el-select>
      <el-select v-model="enabled" clearable placeholder="是否启用" style="width: 140px" @change="reload">
        <el-option label="启用" value="true" />
        <el-option label="停用" value="false" />
      </el-select>
      <el-button @click="reload">查询</el-button>
      <span class="jc-toolbar-spacer" />
      <el-button type="primary" @click="openCreate">新建任务</el-button>
    </div>

    <el-table v-loading="loading" :data="list" @row-click="goDetail">
      <el-table-column label="任务" min-width="220">
        <template #default="{ row }">
          <div class="name">{{ row.name }}</div>
          <div class="jc-code">{{ row.code }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }"><StatusTag :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-switch :model-value="row.enabled" @click.stop @change="(v: boolean) => toggleEnabled(row, v)" />
        </template>
      </el-table-column>
      <el-table-column label="超时(秒)" width="100" prop="default_timeout_seconds" />
      <el-table-column label="处理器" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.handler || '—' }}</template>
      </el-table-column>
      <el-table-column label="最近执行" width="130">
        <template #default>
          <span class="placeholder" title="需提供最近执行信息，或接入执行列表接口">待接入</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="180">
        <template #default="{ row }">{{ formatTime(row.updated_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="openTrigger(row)">执行一次</el-button>
          <el-button link type="primary" @click.stop="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click.stop="onDelete(row)">删除</el-button>
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
        @size-change="reload"
      />
    </div>

    <el-dialog v-model="visible" :title="editing ? '编辑任务' : '新建任务'" width="560px">
      <el-form label-width="120px">
        <el-form-item v-if="!editing" label="编码" required>
          <el-input v-model="form.code" placeholder="任务唯一编码" />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item v-if="editing" label="幂等已验证">
          <el-switch v-model="form.idempotency_verified" />
        </el-form-item>
        <el-form-item label="默认超时(秒)">
          <el-input-number v-model="form.default_timeout_seconds" :min="0" :controls="false" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>

    <TriggerJobDialog
      v-model="triggerVisible"
      :service-id="serviceId"
      :job-id="triggerJob?.id || ''"
      :job-name="triggerJob?.name"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { jobsApi } from '@/api'
import type { JobView } from '@/api/types'
import { confirmDelete, toastError } from '@/utils/feedback'
import { formatTime } from '@/utils/time'
import StatusTag from '@/components/StatusTag.vue'
import TriggerJobDialog from '@/components/TriggerJobDialog.vue'

const props = defineProps<{ serviceId: string }>()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const list = ref<JobView[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const keyword = ref('')
const status = ref('')
const enabled = ref('')
const visible = ref(false)
const triggerVisible = ref(false)
const triggerJob = ref<JobView | null>(null)
const editing = ref<JobView | null>(null)
const form = reactive({
  code: '',
  name: '',
  description: '',
  enabled: true,
  idempotency_verified: false,
  default_timeout_seconds: 0 as number | undefined,
})

function goDetail(row: JobView) {
  void router.push(`/services/${props.serviceId}/jobs/${row.id}`)
}

async function fetchList() {
  loading.value = true
  try {
    const res = await jobsApi.list(props.serviceId, {
      keyword: keyword.value.trim(),
      status: status.value,
      enabled: enabled.value,
      page: page.value,
      limit: limit.value,
    })
    list.value = res.list
    total.value = res.total
  } catch (err) {
    toastError(err, '加载任务失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  void fetchList()
}

function openTrigger(row: JobView) {
  triggerJob.value = row
  triggerVisible.value = true
}

function openCreate() {
  editing.value = null
  form.code = ''
  form.name = ''
  form.description = ''
  form.enabled = true
  form.idempotency_verified = false
  form.default_timeout_seconds = undefined
  visible.value = true
}

function openEdit(row: JobView) {
  editing.value = row
  form.code = row.code
  form.name = row.name
  form.description = row.description || ''
  form.enabled = row.enabled
  form.idempotency_verified = row.idempotency_verified
  form.default_timeout_seconds = row.default_timeout_seconds
  visible.value = true
}

async function onSubmit() {
  if (!form.name.trim() || (!editing.value && !form.code.trim())) {
    ElMessage.warning('请填写编码和名称')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await jobsApi.patch(props.serviceId, editing.value.id, {
        name: form.name.trim(),
        description: form.description,
        enabled: form.enabled,
        idempotency_verified: form.idempotency_verified,
        default_timeout_seconds: form.default_timeout_seconds,
      })
    } else {
      await jobsApi.create(props.serviceId, {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description,
        enabled: form.enabled,
        default_timeout_seconds: form.default_timeout_seconds,
      })
    }
    ElMessage.success('已保存')
    visible.value = false
    await fetchList()
  } catch (err) {
    toastError(err, '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(row: JobView, value: boolean) {
  try {
    await jobsApi.patch(props.serviceId, row.id, { enabled: value })
    row.enabled = value
    ElMessage.success(value ? '已启用' : '已停用')
  } catch (err) {
    toastError(err, '更新失败')
  }
}

async function onDelete(row: JobView) {
  const mode = await confirmDelete(row.name)
  if (!mode) return
  try {
    await jobsApi.remove(props.serviceId, row.id, mode === 'hard')
    ElMessage.success(mode === 'hard' ? '已永久删除' : '已停用')
    await fetchList()
  } catch (err) {
    toastError(err, '删除失败')
  }
}

onMounted(() => {
  void fetchList()
})
</script>

<style scoped>
.name { font-weight: 600; }
.placeholder { color: var(--jc-text-muted); font-size: 12px; }
.pager { display: flex; justify-content: flex-end; padding: 14px 4px 4px; }
</style>
