<template>
  <div class="exec-panel">
    <div class="jc-card form-card">
      <h3 class="jc-section-title">手动触发</h3>
      <p class="hint">可用调度的 default_params 预填参数，触发后跳转到执行详情。</p>
      <el-form label-width="120px">
        <el-form-item label="预填参数来源">
          <el-select
            v-model="prefillId"
            clearable
            filterable
            placeholder="选择调度以预填默认参数"
            style="width: 360px"
            @change="applyPrefill"
          >
            <el-option
              v-for="item in schedules"
              :key="item.id"
              :label="`${item.name} (${item.code})`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="参数">
          <JsonEditor ref="paramsEditor" v-model="paramsText" label="参数" />
        </el-form-item>
        <el-form-item label="幂等键">
          <el-input v-model="idempotencyKey" placeholder="可选，幂等键" />
        </el-form-item>
        <el-form-item label="指定实例">
          <el-select
            v-model="instanceId"
            clearable
            filterable
            allow-create
            default-first-option
            placeholder="可选，优先列出已注册该任务的在线实例"
            style="width: 360px"
          >
            <el-option
              v-for="item in instanceOptions"
              :key="item.id"
              :label="instanceLabel(item)"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="triggering" @click="onTrigger">触发执行</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="jc-card form-card">
      <div class="list-head">
        <h3 class="jc-section-title">最近执行</h3>
        <el-button link type="primary" :loading="loadingList" @click="loadRecent">刷新</el-button>
      </div>
      <el-empty v-if="!loadingList && recentList.length === 0" description="还没有执行记录" />
      <el-table v-else v-loading="loadingList" :data="recentList" @row-click="(row: ExecutionView) => go(row.id)">
        <el-table-column label="执行 ID" min-width="220">
          <template #default="{ row }"><span class="clickable-id">{{ row.id }}</span></template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="触发" width="120">
          <template #default="{ row }">{{ enumLabel(row.trigger_type, TRIGGER_TYPE_LABELS) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="实例" min-width="140">
          <template #default="{ row }">
            {{ row.attempt?.instance_key || row.attempt?.instance_id || '—' }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="jc-card form-card">
      <h3 class="jc-section-title">按 ID 查看</h3>
      <div class="lookup">
        <el-input v-model="lookupId" placeholder="输入执行 ID（ULID）" @keyup.enter="onLookup" />
        <el-button type="primary" @click="onLookup">查看</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { executionsApi, instancesApi, schedulesApi } from '@/api'
import type { ExecutionView, InstanceView, ScheduleView } from '@/api/types'
import { toastError } from '@/utils/feedback'
import { prettyJson } from '@/utils/json'
import { TRIGGER_TYPE_LABELS, enumLabel } from '@/utils/labels'
import { formatTime } from '@/utils/time'
import { useSessionStore } from '@/stores/session'
import JsonEditor from '@/components/JsonEditor.vue'
import StatusTag from '@/components/StatusTag.vue'

const props = defineProps<{ serviceId: string; jobId: string }>()
const router = useRouter()
const session = useSessionStore()
const schedules = ref<ScheduleView[]>([])
const instances = ref<InstanceView[]>([])
const recentList = ref<ExecutionView[]>([])
const loadingList = ref(false)
const prefillId = ref('')
const paramsText = ref('{}')
const idempotencyKey = ref('')
const instanceId = ref('')
const lookupId = ref('')
const triggering = ref(false)
const paramsEditor = ref<InstanceType<typeof JsonEditor>>()

const instanceOptions = computed(() => {
  const registered = instances.value.filter((item) =>
    (item.jobs || []).some((job) => job.job_id === props.jobId),
  )
  const rest = instances.value.filter((item) => !registered.includes(item))
  const ranked = (list: InstanceView[]) =>
    [...list].sort((a, b) => Number(b.status === 'ONLINE') - Number(a.status === 'ONLINE'))
  return [...ranked(registered), ...ranked(rest)]
})

function instanceLabel(item: InstanceView) {
  const bits = [item.instance_key || item.id]
  if (item.hostname) bits.push(item.hostname)
  if (item.status) bits.push(item.status)
  return bits.join(' · ')
}

async function loadSchedules() {
  try {
    const res = await schedulesApi.list(props.serviceId, props.jobId, { page: 1, limit: 50 })
    schedules.value = res.list
  } catch {
    schedules.value = []
  }
}

async function loadInstances() {
  try {
    const res = await instancesApi.list(props.serviceId, { page: 1, limit: 100 })
    instances.value = res.list
  } catch {
    instances.value = []
  }
}

async function loadRecent() {
  loadingList.value = true
  try {
    const res = await executionsApi.listByJob(props.serviceId, props.jobId, { page: 1, limit: 20 })
    recentList.value = res.list
  } catch (err) {
    toastError(err, '加载执行列表失败')
    recentList.value = []
  } finally {
    loadingList.value = false
  }
}

function applyPrefill(id: string) {
  const sch = schedules.value.find((item) => item.id === id)
  if (sch?.default_params) {
    paramsText.value = prettyJson(sch.default_params)
  } else if (id) {
    paramsText.value = '{}'
  }
}

function go(executionId: string) {
  void router.push(
    `/services/${props.serviceId}/jobs/${props.jobId}/executions/${executionId}`,
  )
}

function onLookup() {
  const id = lookupId.value.trim()
  if (!id) {
    ElMessage.warning('请输入执行 ID')
    return
  }
  go(id)
}

async function onTrigger() {
  let params
  try {
    params = paramsEditor.value?.validate()
  } catch {
    return
  }
  triggering.value = true
  try {
    const result = await executionsApi.trigger(props.serviceId, props.jobId, {
      params: params ?? {},
      idempotency_key: idempotencyKey.value.trim() || undefined,
      instance_id: instanceId.value.trim() || undefined,
    })
    session.rememberExecution({
      serviceId: props.serviceId,
      jobId: props.jobId,
      executionId: result.execution_id,
      status: result.status,
      message: result.message || (result.idempotent_replay ? '幂等重放' : ''),
      triggeredAt: new Date().toISOString(),
    })
    ElMessage.success(result.idempotent_replay ? '命中幂等，已打开原执行' : '已触发')
    void loadRecent()
    go(result.execution_id)
  } catch (err) {
    toastError(err, '触发失败')
  } finally {
    triggering.value = false
  }
}

onMounted(() => {
  void loadSchedules()
  void loadInstances()
  void loadRecent()
})
</script>

<style scoped>
.exec-panel { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }
.form-card { padding: 16px 18px 18px; border: 1px solid var(--jc-border); box-shadow: none; }
.hint { margin: -4px 0 12px; color: var(--jc-text-secondary); font-size: 13px; }
.lookup { display: flex; gap: 8px; max-width: 560px; }
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.list-head .jc-section-title { margin: 0; }
.clickable-id { font-family: var(--jc-font-mono, monospace); cursor: pointer; }
</style>
