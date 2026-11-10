<template>
  <div class="exec-panel">
    <div class="jc-card form-card">
      <h3 class="jc-section-title">手动触发</h3>
      <p class="hint">
        管理端没有执行列表接口。此处可用调度的 default_params 预填参数，触发后跳转到执行详情，并在本浏览器会话中记住最近触发记录。
      </p>
      <el-form label-width="120px">
        <el-form-item label="预填参数来源">
          <el-select
            v-model="prefillId"
            clearable
            filterable
            placeholder="选择调度以预填 default_params"
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
        <el-form-item label="params">
          <JsonEditor ref="paramsEditor" v-model="paramsText" label="params" />
        </el-form-item>
        <el-form-item label="幂等键">
          <el-input v-model="idempotencyKey" placeholder="可选 idempotency_key" />
        </el-form-item>
        <el-form-item label="指定实例">
          <el-input v-model="instanceId" placeholder="可选 instance_id" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="triggering" @click="onTrigger">触发执行</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="jc-card form-card">
      <h3 class="jc-section-title">按 ID 查看</h3>
      <div class="lookup">
        <el-input v-model="lookupId" placeholder="输入 execution_id（ULID）" @keyup.enter="onLookup" />
        <el-button type="primary" @click="onLookup">查看</el-button>
      </div>
    </div>

    <div class="jc-card form-card">
      <h3 class="jc-section-title">最近触发（本浏览器会话）</h3>
      <el-empty v-if="recent.length === 0" description="还没有在本页触发过执行" />
      <el-table v-else :data="recent" @row-click="(row: RecentExecution) => go(row.executionId)">
        <el-table-column label="Execution ID" min-width="240">
          <template #default="{ row }"><span class="clickable-id">{{ row.executionId }}</span></template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="说明" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.message || '—' }}</template>
        </el-table-column>
        <el-table-column label="触发时间" width="180">
          <template #default="{ row }">{{ formatTime(row.triggeredAt) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { executionsApi, schedulesApi } from '@/api'
import type { ScheduleView } from '@/api/types'
import { toastError } from '@/utils/feedback'
import { prettyJson } from '@/utils/json'
import { formatTime } from '@/utils/time'
import { useSessionStore, type RecentExecution } from '@/stores/session'
import JsonEditor from '@/components/JsonEditor.vue'
import StatusTag from '@/components/StatusTag.vue'

const props = defineProps<{ serviceId: string; jobId: string }>()
const router = useRouter()
const session = useSessionStore()
const schedules = ref<ScheduleView[]>([])
const prefillId = ref('')
const paramsText = ref('{}')
const idempotencyKey = ref('')
const instanceId = ref('')
const lookupId = ref('')
const triggering = ref(false)
const paramsEditor = ref<InstanceType<typeof JsonEditor>>()

const recent = computed(() => session.listForJob(props.serviceId, props.jobId))

async function loadSchedules() {
  try {
    const res = await schedulesApi.list(props.serviceId, props.jobId, { page: 1, limit: 50 })
    schedules.value = res.list
  } catch {
    schedules.value = []
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
    go(result.execution_id)
  } catch (err) {
    toastError(err, '触发失败')
  } finally {
    triggering.value = false
  }
}

onMounted(() => {
  void loadSchedules()
})
</script>

<style scoped>
.exec-panel { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }
.form-card { padding: 16px 18px 18px; border: 1px solid var(--jc-border); box-shadow: none; }
.hint { margin: -4px 0 12px; color: var(--jc-text-secondary); font-size: 13px; }
.lookup { display: flex; gap: 8px; max-width: 560px; }
</style>
