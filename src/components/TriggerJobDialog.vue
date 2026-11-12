<template>
  <el-dialog
    :model-value="modelValue"
    :title="`执行一次 · ${jobName || '任务'}`"
    width="640px"
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <el-form label-width="120px">
      <el-form-item label="预填参数来源">
        <el-select
          v-model="prefillId"
          clearable
          filterable
          placeholder="选择调度以预填默认参数"
          style="width: 100%"
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
          style="width: 100%"
        >
          <el-option
            v-for="item in instanceOptions"
            :key="item.id"
            :label="instanceLabel(item)"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="triggering" @click="onTrigger">触发执行</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { executionsApi, instancesApi, schedulesApi } from '@/api'
import type { InstanceView, ScheduleView } from '@/api/types'
import { toastError } from '@/utils/feedback'
import { prettyJson } from '@/utils/json'
import { useSessionStore } from '@/stores/session'
import JsonEditor from '@/components/JsonEditor.vue'

const props = defineProps<{
  modelValue: boolean
  serviceId: string
  jobId: string
  jobName?: string
  jumpOnSuccess?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  triggered: [executionId: string]
}>()

const router = useRouter()
const session = useSessionStore()
const schedules = ref<ScheduleView[]>([])
const instances = ref<InstanceView[]>([])
const prefillId = ref('')
const paramsText = ref('{}')
const idempotencyKey = ref('')
const instanceId = ref('')
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

function applyPrefill(id: string) {
  const sch = schedules.value.find((item) => item.id === id)
  paramsText.value = sch?.default_params ? prettyJson(sch.default_params) : '{}'
}

async function load() {
  prefillId.value = ''
  paramsText.value = '{}'
  idempotencyKey.value = ''
  instanceId.value = ''
  try {
    const res = await schedulesApi.list(props.serviceId, props.jobId, { page: 1, limit: 50 })
    schedules.value = res.list
  } catch {
    schedules.value = []
  }
  try {
    const res = await instancesApi.list(props.serviceId, { page: 1, limit: 100 })
    instances.value = res.list
  } catch {
    instances.value = []
  }
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
    emit('triggered', result.execution_id)
    emit('update:modelValue', false)
    if (props.jumpOnSuccess !== false) {
      void router.push(
        `/services/${props.serviceId}/jobs/${props.jobId}/executions/${result.execution_id}`,
      )
    }
  } catch (err) {
    toastError(err, '触发失败')
  } finally {
    triggering.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) void load()
  },
)
</script>
