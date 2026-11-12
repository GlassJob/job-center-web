<template>
  <div class="jc-page" v-loading="loading">
    <template v-if="job">
      <EntityHeader
        :name="job.name"
        :code="job.code"
        :status="job.status"
        :description="job.description"
        :icon="List"
        tile-color="#2E7DE9"
      >
        <template #tags>
          <StatusTag :status="job.enabled ? 'ACTIVE' : 'DISABLED'" :label="job.enabled ? '已启用' : '未启用'" />
        </template>
        <el-button type="primary" @click="triggerVisible = true">执行一次</el-button>
        <el-button @click="toggleEnabled">{{ job.enabled ? '停用任务' : '启用任务' }}</el-button>
        <el-button @click="openEdit">编辑</el-button>
        <el-button type="danger" plain @click="onDelete">删除</el-button>
      </EntityHeader>

      <el-tabs v-model="tab" class="entity-tabs">
        <el-tab-pane label="概览" name="overview">
          <div class="overview">
            <div class="jc-card info">
              <h3 class="jc-section-title">基本信息</h3>
              <dl class="jc-kv">
                <dt>任务 ID</dt>
                <dd class="jc-code">{{ job.id }}</dd>
                <dt>服务 ID</dt>
                <dd class="jc-code">{{ job.service_id }}</dd>
                <dt>状态 / 启用</dt>
                <dd>
                  <StatusTag :status="job.status" />
                  <span class="sep">·</span>
                  {{ job.enabled ? '启用' : '停用' }}
                </dd>
                <dt>处理器</dt>
                <dd>{{ job.handler || '—' }} {{ job.handler_version ? `@${job.handler_version}` : '' }}</dd>
                <dt>语言</dt>
                <dd>{{ job.language || '—' }}</dd>
                <dt>默认超时</dt>
                <dd>{{ job.default_timeout_seconds }} 秒</dd>
                <dt>幂等模式</dt>
                <dd>{{ enumLabel(job.idempotency_mode, IDEMPOTENCY_MODE_LABELS) }} / 已验证：{{ job.idempotency_verified ? '是' : '否' }}</dd>
                <dt>能力</dt>
                <dd class="caps">
                  <el-tag size="small" :type="job.supports_cancel ? 'primary' : 'info'" effect="plain">取消</el-tag>
                  <el-tag size="small" :type="job.supports_timeout ? 'primary' : 'info'" effect="plain">超时</el-tag>
                  <el-tag size="small" :type="job.supports_progress ? 'primary' : 'info'" effect="plain">进度</el-tag>
                  <el-tag size="small" :type="job.supports_state ? 'primary' : 'info'" effect="plain">游标</el-tag>
                </dd>
                <dt>元数据版本</dt>
                <dd>{{ job.metadata_version }}</dd>
                <dt>首次注册</dt>
                <dd>{{ formatTimeTzLabel(job.first_registered_at) }}</dd>
                <dt>最近注册</dt>
                <dd>{{ formatTimeTzLabel(job.last_registered_at) }}</dd>
                <dt>创建 / 更新</dt>
                <dd>{{ formatTimeTzLabel(job.created_at) }} / {{ formatTimeTzLabel(job.updated_at) }}</dd>
              </dl>
            </div>
            <div class="side">
              <div class="jc-card info">
                <h3 class="jc-section-title">调度摘要</h3>
                <el-empty v-if="!schedules.length" description="还没有调度" />
                <div v-else class="sched-list">
                  <div v-for="item in schedules" :key="item.id" class="sched">
                    <div class="sched-top">
                      <strong>{{ item.name }}</strong>
                      <StatusTag :status="item.enabled ? 'ACTIVE' : 'DISABLED'" :label="item.enabled ? '运行中' : '已停用'" />
                    </div>
                    <div class="jc-code">{{ item.cron_expression || '手动 / API' }}</div>
                    <div class="jc-muted">下次：{{ formatTimeTzLabel(item.next_fire_at) }}</div>
                    <div class="jc-muted">上次：{{ formatTimeTzLabel(item.last_fire_at) }}</div>
                  </div>
                </div>
                <el-button style="margin-top: 10px" @click="tab = 'schedules'">管理调度</el-button>
              </div>
              <div class="jc-card info">
                <h3 class="jc-section-title">最近执行</h3>
                <p class="reserved-hint">执行列表接口就绪后，这里会显示最近若干次运行状态、耗时和日志入口。</p>
                <el-button type="primary" plain @click="tab = 'executions'">手动触发 / 按 ID 查看</el-button>
              </div>
              <div class="jc-card info">
                <h3 class="jc-section-title">参数结构</h3>
                <pre class="json-pre">{{ prettyJson(job.params_schema) || '暂无' }}</pre>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="调度" name="schedules">
          <JobSchedulesPanel
            v-if="tab === 'schedules'"
            :service-id="serviceId"
            :job-id="job.id"
          />
        </el-tab-pane>
        <el-tab-pane label="游标/状态" name="states">
          <JobStatesPanel v-if="tab === 'states'" :service-id="serviceId" :job-id="job.id" />
        </el-tab-pane>
        <el-tab-pane label="执行" name="executions">
          <JobExecutionsPanel
            v-if="tab === 'executions'"
            :service-id="serviceId"
            :job-id="job.id"
          />
        </el-tab-pane>
      </el-tabs>
    </template>

    <el-dialog v-model="editVisible" title="编辑任务" width="560px">
      <el-form label-width="120px">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="editForm.enabled" />
        </el-form-item>
        <el-form-item label="幂等已验证">
          <el-switch v-model="editForm.idempotency_verified" />
        </el-form-item>
        <el-form-item label="默认超时(秒)">
          <el-input-number v-model="editForm.default_timeout_seconds" :min="0" :controls="false" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <TriggerJobDialog
      v-model="triggerVisible"
      :service-id="serviceId"
      :job-id="jobId"
      :job-name="job?.name"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { List } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { jobsApi, schedulesApi, servicesApi } from '@/api'
import type { JobView, ScheduleView } from '@/api/types'
import { confirmDelete, toastError } from '@/utils/feedback'
import { prettyJson } from '@/utils/json'
import { formatTimeTzLabel } from '@/utils/time'
import { IDEMPOTENCY_MODE_LABELS, enumLabel } from '@/utils/labels'
import { useCrumbsStore } from '@/stores/crumbs'
import EntityHeader from '@/components/EntityHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import JobSchedulesPanel from '@/views/panels/JobSchedulesPanel.vue'
import JobStatesPanel from '@/views/panels/JobStatesPanel.vue'
import JobExecutionsPanel from '@/views/panels/JobExecutionsPanel.vue'
import TriggerJobDialog from '@/components/TriggerJobDialog.vue'

const route = useRoute()
const router = useRouter()
const crumbs = useCrumbsStore()
const loading = ref(false)
const saving = ref(false)
const job = ref<JobView | null>(null)
const tab = ref((route.query.tab as string) || 'overview')
const editVisible = ref(false)
const triggerVisible = ref(false)
const schedules = ref<ScheduleView[]>([])
const editForm = reactive({
  name: '',
  description: '',
  enabled: true,
  idempotency_verified: false,
  default_timeout_seconds: 0,
})

const serviceId = computed(() => route.params.serviceId as string)
const jobId = computed(() => route.params.jobId as string)

async function load() {
  loading.value = true
  try {
    try {
      const service = await servicesApi.get(serviceId.value)
      crumbs.setServiceTitle(service.name || service.code)
    } catch {
      crumbs.setServiceTitle('服务')
    }
    job.value = await jobsApi.get(serviceId.value, jobId.value)
    crumbs.setJobTitle(job.value.name || job.value.code)
    try {
      schedules.value = (await schedulesApi.list(serviceId.value, jobId.value, { page: 1, limit: 20 })).list
    } catch {
      schedules.value = []
    }
  } catch (err) {
    toastError(err, '加载任务失败')
  } finally {
    loading.value = false
  }
}

function openEdit() {
  if (!job.value) return
  editForm.name = job.value.name
  editForm.description = job.value.description || ''
  editForm.enabled = job.value.enabled
  editForm.idempotency_verified = job.value.idempotency_verified
  editForm.default_timeout_seconds = job.value.default_timeout_seconds
  editVisible.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    await jobsApi.patch(serviceId.value, jobId.value, { ...editForm })
    ElMessage.success('已更新')
    editVisible.value = false
    await load()
  } catch (err) {
    toastError(err, '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleEnabled() {
  if (!job.value) return
  const next = !job.value.enabled
  try {
    await jobsApi.patch(serviceId.value, jobId.value, { enabled: next })
    ElMessage.success(next ? '已启用' : '已停用')
    await load()
  } catch (err) {
    toastError(err, '更新失败')
  }
}

async function onDelete() {
  if (!job.value) return
  const mode = await confirmDelete(job.value.name)
  if (!mode) return
  try {
    await jobsApi.remove(serviceId.value, job.value.id, mode === 'hard')
    ElMessage.success(mode === 'hard' ? '已永久删除' : '已停用')
    if (mode === 'hard') await router.push(`/services/${serviceId.value}?tab=jobs`)
    else await load()
  } catch (err) {
    toastError(err, '删除失败')
  }
}

watch(tab, (value) => {
  void router.replace({ query: { ...route.query, tab: value } })
})

onMounted(() => {
  void load()
})
</script>

<style scoped>
.entity-tabs {
  background: #fff;
  border: 1px solid var(--jc-border);
  border-radius: 12px;
  padding: 0 16px 16px;
  box-shadow: var(--jc-shadow);
}
.overview {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 16px;
  padding-top: 8px;
}
@media (max-width: 1100px) {
  .overview { grid-template-columns: 1fr; }
}
.info { padding: 18px 20px; }
.side { display: flex; flex-direction: column; gap: 16px; }
.sched-list { display: flex; flex-direction: column; gap: 12px; }
.sched-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.reserved-hint { margin: 0 0 10px; color: var(--jc-text-secondary); font-size: 13px; }
.caps { display: flex; flex-wrap: wrap; gap: 6px; }
.sep { margin: 0 8px; color: var(--jc-text-muted); }
</style>
