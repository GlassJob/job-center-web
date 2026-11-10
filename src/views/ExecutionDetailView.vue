<template>
  <div class="jc-page" v-loading="loading">
    <template v-if="execution">
      <EntityHeader
        :name="`执行 ${shortId(execution.id)}`"
        :code="execution.id"
        :status="execution.status"
        :icon="VideoPlay"
        tile-color="#0E9F6E"
      >
        <el-button @click="load">刷新</el-button>
        <el-button
          v-if="!isFinalExecution(execution.status)"
          type="danger"
          :loading="cancelling"
          @click="onCancel"
        >取消执行</el-button>
      </EntityHeader>

      <div class="grid">
        <div class="jc-card info">
          <h3 class="jc-section-title">执行信息</h3>
          <dl class="jc-kv">
            <dt>Execution ID</dt>
            <dd class="jc-code">{{ execution.id }}</dd>
            <dt>任务</dt>
            <dd>
              <router-link :to="jobLink">{{ execution.job_code || '任务' }}</router-link>
            </dd>
            <dt>状态</dt>
            <dd>
              <StatusTag :status="execution.status" />
              <span v-if="execution.status_reason" class="jc-secondary"> · {{ execution.status_reason }}</span>
            </dd>
            <dt>触发</dt>
            <dd>{{ execution.trigger_type }} / {{ execution.triggered_by || '—' }}</dd>
            <dt>尝试</dt>
            <dd>{{ execution.attempt_count }} / {{ execution.max_attempts }}（当前 #{{ execution.current_attempt_no }}）</dd>
            <dt>当前 Attempt</dt>
            <dd class="jc-code">{{ execution.current_attempt_id || '—' }}</dd>
            <dt>超时</dt>
            <dd>{{ execution.timeout_seconds }} 秒</dd>
            <dt>Handler 版本</dt>
            <dd>{{ execution.handler_version || '—' }}</dd>
            <dt>排队 / 开始 / 结束</dt>
            <dd>
              {{ formatTime(execution.queued_at) }} /
              {{ formatTime(execution.started_at) }} /
              {{ formatTime(execution.finished_at) }}
            </dd>
            <dt>创建 / 更新</dt>
            <dd>{{ formatTimeTzLabel(execution.created_at) }} / {{ formatTimeTzLabel(execution.updated_at) }}</dd>
            <dt>错误</dt>
            <dd>
              <template v-if="execution.error_code || execution.error_message">
                {{ execution.error_code }} {{ execution.error_message }}
              </template>
              <template v-else>—</template>
            </dd>
            <dt>结果摘要</dt>
            <dd>{{ execution.result_summary || '—' }}</dd>
          </dl>
        </div>

        <div class="stack">
          <div class="jc-card info">
            <h3 class="jc-section-title">当前 Attempt</h3>
            <template v-if="execution.attempt">
              <dl class="jc-kv">
                <dt>Attempt ID</dt>
                <dd class="jc-code">{{ execution.attempt.id }}</dd>
                <dt>序号</dt>
                <dd>#{{ execution.attempt.attempt_no }}</dd>
                <dt>状态</dt>
                <dd><StatusTag :status="execution.attempt.status" /></dd>
                <dt>实例</dt>
                <dd>
                  <router-link
                    v-if="execution.attempt.instance_id"
                    :to="`/services/${serviceId}/instances/${execution.attempt.instance_id}`"
                  >{{ execution.attempt.instance_key || execution.attempt.instance_id }}</router-link>
                  <template v-else>{{ execution.attempt.instance_key || '—' }}</template>
                </dd>
                <dt>进度</dt>
                <dd>
                  <template v-if="execution.attempt.progress_percent != null">
                    {{ execution.attempt.progress_percent }}%
                    {{ execution.attempt.progress_message || '' }}
                  </template>
                  <template v-else>{{ execution.attempt.progress_message || '—' }}</template>
                </dd>
                <dt>取消状态</dt>
                <dd>{{ execution.attempt.cancel_state || '—' }}</dd>
                <dt>租约到期</dt>
                <dd>{{ formatTime(execution.attempt.lease_expires_at) }}</dd>
                <dt>派发 / 确认</dt>
                <dd>{{ formatTime(execution.attempt.dispatched_at) }} / {{ formatTime(execution.attempt.acked_at) }}</dd>
                <dt>开始 / 结束</dt>
                <dd>{{ formatTime(execution.attempt.started_at) }} / {{ formatTime(execution.attempt.finished_at) }}</dd>
                <dt>错误</dt>
                <dd>{{ execution.attempt.error_code || execution.attempt.error_message || '—' }}</dd>
              </dl>
            </template>
            <el-empty v-else description="暂无 attempt 详情" />
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="jc-card info">
          <h3 class="jc-section-title">Params</h3>
          <pre class="json-pre">{{ prettyJson(execution.params) || '—' }}</pre>
        </div>
        <div class="jc-card info">
          <h3 class="jc-section-title">Result</h3>
          <pre class="json-pre">{{ prettyJson(execution.result || execution.attempt?.result) || '—' }}</pre>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { VideoPlay } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { executionsApi, jobsApi, servicesApi } from '@/api'
import type { ExecutionView } from '@/api/types'
import { handleConflict, toastError } from '@/utils/feedback'
import { prettyJson } from '@/utils/json'
import { isFinalExecution } from '@/utils/status'
import { formatTime, formatTimeTzLabel } from '@/utils/time'
import { useCrumbsStore } from '@/stores/crumbs'
import { useSessionStore } from '@/stores/session'
import EntityHeader from '@/components/EntityHeader.vue'
import StatusTag from '@/components/StatusTag.vue'

const route = useRoute()
const crumbs = useCrumbsStore()
const session = useSessionStore()
const loading = ref(false)
const cancelling = ref(false)
const execution = ref<ExecutionView | null>(null)

const serviceId = computed(() => route.params.serviceId as string)
const jobId = computed(() => route.params.jobId as string)
const executionId = computed(() => route.params.executionId as string)
const jobLink = computed(() => `/services/${serviceId.value}/jobs/${jobId.value}`)

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}

async function load() {
  loading.value = true
  try {
    try {
      const service = await servicesApi.get(serviceId.value)
      crumbs.setServiceTitle(service.name || service.code)
    } catch {
      crumbs.setServiceTitle('服务')
    }
    try {
      const job = await jobsApi.get(serviceId.value, jobId.value)
      crumbs.setJobTitle(job.name || job.code)
    } catch {
      crumbs.setJobTitle('任务')
    }
    execution.value = await executionsApi.get(serviceId.value, jobId.value, executionId.value)
    session.updateExecution(execution.value.id, { status: execution.value.status })
  } catch (err) {
    toastError(err, '加载执行失败')
  } finally {
    loading.value = false
  }
}

async function onCancel() {
  try {
    const { value } = await ElMessageBox.prompt('可选填写取消原因', '取消执行', {
      confirmButtonText: '确认取消',
      cancelButtonText: '返回',
      inputPlaceholder: 'reason',
      inputType: 'textarea',
    })
    cancelling.value = true
    const result = await executionsApi.cancel(serviceId.value, jobId.value, executionId.value, {
      reason: String(value || '').trim() || undefined,
    })
    ElMessage.success(result.idempotent ? '已处于取消流程（幂等）' : result.message || '已提交取消')
    await load()
  } catch (err) {
    if (err === 'cancel' || err === 'close') return
    if (await handleConflict(err, load)) return
    toastError(err, '取消失败')
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 16px;
}
@media (max-width: 1100px) {
  .grid { grid-template-columns: 1fr; }
}
.stack { display: flex; flex-direction: column; gap: 16px; }
.info { padding: 18px 20px; }
</style>
