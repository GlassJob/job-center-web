<template>
  <div class="jc-page" v-loading="loading">
    <template v-if="instance">
      <EntityHeader
        :name="instance.instance_key || instance.id"
        :code="instance.id"
        :status="instance.status"
        :description="headline"
        :icon="Monitor"
        tile-color="#1C64F2"
      >
        <el-button @click="load">刷新</el-button>
      </EntityHeader>

      <div class="grid">
        <div class="jc-card info">
          <h3 class="jc-section-title">连接与负载</h3>
          <dl class="jc-kv">
            <dt>实例 ID</dt>
            <dd class="jc-code">{{ instance.id }}</dd>
            <dt>Instance Key</dt>
            <dd class="jc-code">{{ instance.instance_key || '—' }}</dd>
            <dt>会话</dt>
            <dd>
              <span class="jc-code">{{ instance.session_id || '—' }}</span>
              <span class="jc-secondary"> · epoch {{ instance.session_epoch }}</span>
            </dd>
            <dt>环境</dt>
            <dd>{{ instance.environment || '—' }}</dd>
            <dt>主机 / PID</dt>
            <dd>{{ instance.hostname || '—' }} / {{ instance.pid ?? '—' }}</dd>
            <dt>IP</dt>
            <dd>{{ instance.ip_address || '—' }}</dd>
            <dt>上报 IP</dt>
            <dd>{{ instance.reported_ip || '—' }}</dd>
            <dt>并发</dt>
            <dd>{{ instance.running_count }} / {{ instance.max_concurrency }}</dd>
            <dt>网关节点</dt>
            <dd>{{ instance.gateway_node_id || '—' }}</dd>
          </dl>
        </div>

        <div class="jc-card info">
          <h3 class="jc-section-title">运行时与时间</h3>
          <dl class="jc-kv">
            <dt>语言 / 运行时</dt>
            <dd>{{ instance.language || '—' }} {{ instance.runtime_version || '' }}</dd>
            <dt>SDK / 协议</dt>
            <dd>{{ instance.sdk_version || '—' }} / {{ instance.protocol_version || '—' }}</dd>
            <dt>应用版本</dt>
            <dd>{{ instance.app_version || '—' }}</dd>
            <dt>Git Commit</dt>
            <dd class="jc-code">{{ instance.git_commit || '—' }}</dd>
            <dt>构建时间</dt>
            <dd>{{ formatTimeTzLabel(instance.build_time) }}</dd>
            <dt>启动 / 注册</dt>
            <dd>{{ formatTime(instance.started_at) }} / {{ formatTime(instance.registered_at) }}</dd>
            <dt>连接 / 断开</dt>
            <dd>{{ formatTime(instance.connected_at) }} / {{ formatTime(instance.disconnected_at) }}</dd>
            <dt>最近心跳</dt>
            <dd>{{ formatTimeTzLabel(instance.last_heartbeat_at) }}</dd>
            <dt>创建 / 更新</dt>
            <dd>{{ formatTimeTzLabel(instance.created_at) }} / {{ formatTimeTzLabel(instance.updated_at) }}</dd>
          </dl>
        </div>
      </div>

      <div class="jc-card info">
        <h3 class="jc-section-title">已注册任务</h3>
        <el-empty v-if="!jobs.length" description="该实例尚未注册任务" />
        <el-table v-else :data="jobs" @row-click="goJob">
          <el-table-column label="任务编码" min-width="180">
            <template #default="{ row }">
              <span class="clickable-id">{{ row.job_code }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Job ID" min-width="220">
            <template #default="{ row }"><span class="jc-code">{{ row.job_id }}</span></template>
          </el-table-column>
          <el-table-column label="Handler 版本" min-width="160" prop="handler_version" />
          <el-table-column label="最大并发" width="120">
            <template #default="{ row }">{{ row.max_concurrency ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="注册时间" width="180">
            <template #default="{ row }">{{ formatTime(row.registered_at) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div class="jc-card info">
        <h3 class="jc-section-title">Metadata</h3>
        <pre class="json">{{ pretty(instance.metadata) }}</pre>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Monitor } from '@element-plus/icons-vue'
import { instancesApi, servicesApi } from '@/api'
import type { InstanceJobView, InstanceView } from '@/api/types'
import { toastError } from '@/utils/feedback'
import { prettyJson } from '@/utils/json'
import { formatTime, formatTimeTzLabel } from '@/utils/time'
import { useCrumbsStore } from '@/stores/crumbs'
import EntityHeader from '@/components/EntityHeader.vue'

const route = useRoute()
const router = useRouter()
const crumbs = useCrumbsStore()
const loading = ref(false)
const instance = ref<InstanceView | null>(null)

const serviceId = () => route.params.serviceId as string
const instanceId = () => route.params.instanceId as string

const jobs = computed(() => instance.value?.jobs || [])

const headline = computed(() => {
  if (!instance.value) return ''
  const parts = [
    instance.value.hostname,
    instance.value.ip_address,
    instance.value.environment,
  ].filter(Boolean)
  return parts.join(' · ')
})

function pretty(value: unknown) {
  return prettyJson(value ?? {})
}

function goJob(row: InstanceJobView) {
  void router.push(`/services/${serviceId()}/jobs/${row.job_id}`)
}

async function load() {
  loading.value = true
  try {
    const [detail, service] = await Promise.all([
      instancesApi.get(serviceId(), instanceId()),
      servicesApi.get(serviceId()).catch(() => null),
    ])
    instance.value = detail
    crumbs.setInstanceTitle(detail.instance_key || detail.id)
    if (service) crumbs.setServiceTitle(service.name || service.code)
  } catch (err) {
    toastError(err, '加载实例失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [route.params.serviceId, route.params.instanceId],
  () => {
    void load()
  },
)

onMounted(() => {
  void load()
})
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.info {
  padding: 18px 20px;
}
.json {
  margin: 0;
  padding: 12px 14px;
  background: #f8f8fc;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  overflow: auto;
  max-height: 280px;
}
.clickable-id {
  color: var(--jc-primary);
  font-weight: 600;
  cursor: pointer;
}
@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
