<template>
  <div>
    <div class="jc-toolbar">
      <el-input v-model="keyword" clearable placeholder="搜索调度" @keyup.enter="reload" @clear="reload" />
      <el-select v-model="enabled" clearable placeholder="是否启用" style="width: 140px" @change="reload">
        <el-option label="启用" value="true" />
        <el-option label="停用" value="false" />
      </el-select>
      <el-button @click="reload">查询</el-button>
      <span class="jc-toolbar-spacer" />
      <el-button type="primary" @click="openCreate">新建调度</el-button>
    </div>

    <el-table v-loading="loading" :data="list" @row-click="openEdit">
      <el-table-column label="调度" min-width="200">
        <template #default="{ row }">
          <div class="name">{{ row.name }}</div>
          <div class="jc-code">{{ row.code }} · v{{ row.version }}</div>
        </template>
      </el-table-column>
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-switch :model-value="row.enabled" @click.stop @change="(v: boolean) => toggleEnabled(row, v)" />
        </template>
      </el-table-column>
      <el-table-column label="手动" width="70">
        <template #default="{ row }">{{ row.manual_enabled ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="Cron / 时区" min-width="180">
        <template #default="{ row }">
          <div class="jc-code">{{ row.cron_expression || '—' }}</div>
          <div class="jc-muted">{{ row.timezone }}</div>
        </template>
      </el-table-column>
      <el-table-column label="下次触发" width="180">
        <template #default="{ row }">{{ formatTime(row.next_fire_at) }}</template>
      </el-table-column>
      <el-table-column label="上次触发" width="180">
        <template #default="{ row }">{{ formatTime(row.last_fire_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click.stop="goTriggers(row)">触点</el-button>
          <el-button
            link
            type="warning"
            :loading="regenId === row.id"
            @click.stop="onRegenerate(row)"
          >
            重生
          </el-button>
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

    <el-dialog v-model="visible" :title="editing ? `编辑调度 · v${editing.version}` : '新建调度'" width="720px" top="6vh">
      <el-form label-width="140px">
        <el-form-item v-if="!editing" label="编码" required>
          <el-input v-model="form.code" />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="启用 / 允许手动">
          <el-switch v-model="form.enabled" />
          <span class="inline-gap" />
          <el-switch v-model="form.manual_enabled" />
          <span class="jc-muted" style="margin-left: 8px">手动触发</span>
        </el-form-item>
        <el-form-item label="Cron 表达式">
          <el-input v-model="form.cron_expression" placeholder="例如 0 */5 * * * *" />
          <el-checkbox v-if="editing" v-model="form.clearCron">清除 Cron 表达式</el-checkbox>
        </el-form-item>
        <el-form-item label="时区">
          <el-input v-model="form.timezone" placeholder="Asia/Shanghai" />
        </el-form-item>
        <el-form-item label="超时(秒)">
          <el-input-number v-model="form.timeout_seconds" :min="0" :controls="false" />
        </el-form-item>
        <el-form-item label="最大重试">
          <el-input-number v-model="form.max_retries" :min="0" :controls="false" />
        </el-form-item>
        <el-form-item label="并发策略">
          <el-select v-model="form.concurrency_policy" clearable style="width: 220px">
            <el-option v-for="item in CONCURRENCY_POLICIES" :key="item" :label="enumLabel(item, CONCURRENCY_POLICY_LABELS)" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="并发范围">
          <el-select v-model="form.concurrency_scope" clearable style="width: 220px">
            <el-option v-for="item in CONCURRENCY_SCOPES" :key="item" :label="enumLabel(item, CONCURRENCY_SCOPE_LABELS)" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="最大并发 / 队列">
          <el-input-number v-model="form.max_concurrency" :min="0" :controls="false" />
          <span class="inline-gap" />
          <el-input-number v-model="form.queue_max" :min="0" :controls="false" />
        </el-form-item>
        <el-form-item label="错过触发策略">
          <el-select v-model="form.misfire_policy" clearable style="width: 220px">
            <el-option v-for="item in MISFIRE_POLICIES" :key="item" :label="enumLabel(item, MISFIRE_POLICY_LABELS)" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="错过触发阈值(秒)">
          <el-input-number v-model="form.misfire_threshold_seconds" :min="0" :controls="false" />
        </el-form-item>
        <el-form-item label="追赶上限">
          <el-input-number v-model="form.catch_up_max" :min="0" :controls="false" />
        </el-form-item>
        <el-form-item label="派发策略">
          <el-select v-model="form.dispatch_strategy" clearable style="width: 220px">
            <el-option v-for="item in DISPATCH_STRATEGIES" :key="item" :label="enumLabel(item, DISPATCH_STRATEGY_LABELS)" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认参数">
          <JsonEditor ref="paramsEditor" v-model="form.defaultParamsText" clearable empty-as="null" label="默认参数" />
          <el-checkbox v-if="editing" v-model="form.clearParams">清空默认参数</el-checkbox>
        </el-form-item>
        <el-form-item label="重试退避">
          <JsonEditor ref="backoffEditor" v-model="form.retryBackoffText" clearable empty-as="null" label="重试退避" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { schedulesApi } from '@/api'
import {
  CONCURRENCY_POLICIES,
  CONCURRENCY_SCOPES,
  DISPATCH_STRATEGIES,
  MISFIRE_POLICIES,
  type CreateScheduleInput,
  type PatchScheduleInput,
  type ScheduleView,
} from '@/api/types'
import { confirmDelete, handleConflict, toastError } from '@/utils/feedback'
import {
  CONCURRENCY_POLICY_LABELS,
  CONCURRENCY_SCOPE_LABELS,
  DISPATCH_STRATEGY_LABELS,
  MISFIRE_POLICY_LABELS,
  enumLabel,
} from '@/utils/labels'
import { prettyJson } from '@/utils/json'
import { formatTime } from '@/utils/time'
import JsonEditor from '@/components/JsonEditor.vue'

const props = defineProps<{ serviceId: string; jobId: string }>()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const regenId = ref('')
const list = ref<ScheduleView[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const keyword = ref('')
const enabled = ref('')
const visible = ref(false)
const editing = ref<ScheduleView | null>(null)
const paramsEditor = ref<InstanceType<typeof JsonEditor>>()
const backoffEditor = ref<InstanceType<typeof JsonEditor>>()

const form = reactive({
  code: '',
  name: '',
  enabled: true,
  manual_enabled: true,
  cron_expression: '',
  timezone: 'Asia/Shanghai',
  timeout_seconds: undefined as number | undefined,
  max_retries: undefined as number | undefined,
  concurrency_policy: '' as string,
  concurrency_scope: '' as string,
  max_concurrency: undefined as number | undefined,
  queue_max: undefined as number | undefined,
  misfire_policy: '' as string,
  misfire_threshold_seconds: undefined as number | undefined,
  catch_up_max: undefined as number | undefined,
  dispatch_strategy: '' as string,
  defaultParamsText: '',
  retryBackoffText: '',
  clearCron: false,
  clearParams: false,
})

async function fetchList() {
  loading.value = true
  try {
    const res = await schedulesApi.list(props.serviceId, props.jobId, {
      keyword: keyword.value.trim(),
      enabled: enabled.value,
      page: page.value,
      limit: limit.value,
    })
    list.value = res.list
    total.value = res.total
  } catch (err) {
    toastError(err, '加载调度失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  void fetchList()
}

function goTriggers(row: ScheduleView) {
  void router.push({
    path: '/triggers',
    query: { schedule_id: row.id, service_id: props.serviceId },
  })
}

async function onRegenerate(row: ScheduleView) {
  try {
    await ElMessageBox.confirm(
      `重生排班「${row.name}」的未来触点（先删再插）？`,
      '单排班重生',
      { type: 'warning', confirmButtonText: '重生', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  regenId.value = row.id
  try {
    await schedulesApi.regenerate(props.serviceId, props.jobId, row.id)
    ElMessage.success('已重生触点')
    await fetchList()
  } catch (err) {
    toastError(err, '重生失败')
  } finally {
    regenId.value = ''
  }
}

function resetForm() {
  form.code = ''
  form.name = ''
  form.enabled = true
  form.manual_enabled = true
  form.cron_expression = ''
  form.timezone = 'Asia/Shanghai'
  form.timeout_seconds = undefined
  form.max_retries = undefined
  form.concurrency_policy = ''
  form.concurrency_scope = ''
  form.max_concurrency = undefined
  form.queue_max = undefined
  form.misfire_policy = ''
  form.misfire_threshold_seconds = undefined
  form.catch_up_max = undefined
  form.dispatch_strategy = ''
  form.defaultParamsText = ''
  form.retryBackoffText = ''
  form.clearCron = false
  form.clearParams = false
}

function openCreate() {
  editing.value = null
  resetForm()
  visible.value = true
}

function openEdit(row: ScheduleView) {
  editing.value = row
  form.code = row.code
  form.name = row.name
  form.enabled = row.enabled
  form.manual_enabled = row.manual_enabled
  form.cron_expression = row.cron_expression || ''
  form.timezone = row.timezone || 'Asia/Shanghai'
  form.timeout_seconds = row.timeout_seconds
  form.max_retries = row.max_retries
  form.concurrency_policy = row.concurrency_policy
  form.concurrency_scope = row.concurrency_scope
  form.max_concurrency = row.max_concurrency
  form.queue_max = row.queue_max
  form.misfire_policy = row.misfire_policy
  form.misfire_threshold_seconds = row.misfire_threshold_seconds
  form.catch_up_max = row.catch_up_max
  form.dispatch_strategy = row.dispatch_strategy
  form.defaultParamsText = prettyJson(row.default_params)
  form.retryBackoffText = prettyJson(row.retry_backoff)
  form.clearCron = false
  form.clearParams = false
  visible.value = true
}

async function onSubmit() {
  if (!form.name.trim() || (!editing.value && !form.code.trim())) {
    ElMessage.warning('请填写编码和名称')
    return
  }
  let defaultParams
  let retryBackoff
  try {
    defaultParams = paramsEditor.value?.validate() ?? null
    retryBackoff = backoffEditor.value?.validate() ?? null
  } catch {
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      const body: PatchScheduleInput = {
        version: editing.value.version,
        name: form.name.trim(),
        enabled: form.enabled,
        manual_enabled: form.manual_enabled,
        timezone: form.timezone || undefined,
        timeout_seconds: form.timeout_seconds,
        max_retries: form.max_retries,
        concurrency_policy: form.concurrency_policy || undefined,
        concurrency_scope: form.concurrency_scope || undefined,
        max_concurrency: form.max_concurrency,
        queue_max: form.queue_max,
        misfire_policy: form.misfire_policy || undefined,
        misfire_threshold_seconds: form.misfire_threshold_seconds,
        catch_up_max: form.catch_up_max,
        dispatch_strategy: form.dispatch_strategy || undefined,
      }
      if (form.clearCron) body.clear_cron_expression = true
      else if (form.cron_expression) body.cron_expression = form.cron_expression
      if (form.clearParams) body.clear_default_params = true
      else if (defaultParams) body.default_params = defaultParams
      if (retryBackoff) body.retry_backoff = retryBackoff
      await schedulesApi.patch(props.serviceId, props.jobId, editing.value.id, body)
      ElMessage.success('已保存（版本号已递增）')
    } else {
      const body: CreateScheduleInput = {
        code: form.code.trim(),
        name: form.name.trim(),
        enabled: form.enabled,
        manual_enabled: form.manual_enabled,
        cron_expression: form.cron_expression || undefined,
        timezone: form.timezone || undefined,
        default_params: defaultParams ?? undefined,
        timeout_seconds: form.timeout_seconds,
        max_retries: form.max_retries,
        retry_backoff: retryBackoff ?? undefined,
        concurrency_policy: form.concurrency_policy || undefined,
        concurrency_scope: form.concurrency_scope || undefined,
        max_concurrency: form.max_concurrency,
        queue_max: form.queue_max,
        misfire_policy: form.misfire_policy || undefined,
        misfire_threshold_seconds: form.misfire_threshold_seconds,
        catch_up_max: form.catch_up_max,
        dispatch_strategy: form.dispatch_strategy || undefined,
      }
      await schedulesApi.create(props.serviceId, props.jobId, body)
      ElMessage.success('已创建')
    }
    visible.value = false
    await fetchList()
  } catch (err) {
    if (await handleConflict(err, fetchList)) {
      visible.value = false
      return
    }
    toastError(err, '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(row: ScheduleView, value: boolean) {
  try {
    const updated = await schedulesApi.patch(props.serviceId, props.jobId, row.id, {
      version: row.version,
      enabled: value,
    })
    Object.assign(row, updated)
    ElMessage.success(value ? '已启用' : '已停用')
  } catch (err) {
    if (await handleConflict(err, fetchList)) return
    toastError(err, '更新失败')
  }
}

async function onDelete(row: ScheduleView) {
  const mode = await confirmDelete(row.name)
  if (!mode) return
  try {
    await schedulesApi.remove(props.serviceId, props.jobId, row.id, mode === 'hard')
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
.pager { display: flex; justify-content: flex-end; padding: 14px 4px 4px; }
.inline-gap { display: inline-block; width: 16px; }
</style>
