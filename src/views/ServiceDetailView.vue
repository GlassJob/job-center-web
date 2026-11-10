<template>
  <div class="jc-page" v-loading="loading">
    <template v-if="service">
      <EntityHeader
        :name="service.name"
        :code="service.code"
        :status="service.status"
        :description="service.description"
        :icon="OfficeBuilding"
        tile-color="#7147E8"
      >
        <el-button @click="openEdit">编辑</el-button>
        <el-button
          v-if="service.status === 'ACTIVE'"
          @click="toggleStatus('DISABLED')"
        >停用</el-button>
        <el-button v-else type="primary" @click="toggleStatus('ACTIVE')">启用</el-button>
        <el-button type="danger" plain @click="onDelete">删除</el-button>
      </EntityHeader>

      <el-tabs v-model="tab" class="entity-tabs">
        <el-tab-pane label="概览" name="overview">
          <div class="overview">
            <div class="counts">
              <div class="count jc-card" @click="tab = 'jobs'">
                <div class="n">{{ service.job_count }}</div>
                <div class="l">任务</div>
              </div>
              <div class="count jc-card" @click="tab = 'credentials'">
                <div class="n">{{ service.credential_count }}</div>
                <div class="l">凭据</div>
              </div>
              <div class="count jc-card is-static">
                <div class="n">{{ service.instance_count }}</div>
                <div class="l">在线实例</div>
                <div class="hint">管理端不提供实例列表接口</div>
              </div>
            </div>
            <div class="jc-card info">
              <h3 class="jc-section-title">基本信息</h3>
              <dl class="jc-kv">
                <dt>服务 ID</dt>
                <dd class="jc-code">{{ service.id }}</dd>
                <dt>编码</dt>
                <dd class="jc-code">{{ service.code }}</dd>
                <dt>状态</dt>
                <dd><StatusTag :status="service.status" /></dd>
                <dt>创建时间</dt>
                <dd>{{ formatTimeTzLabel(service.created_at) }}</dd>
                <dt>更新时间</dt>
                <dd>{{ formatTimeTzLabel(service.updated_at) }}</dd>
              </dl>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="任务" name="jobs">
          <ServiceJobsPanel v-if="tab === 'jobs'" :service-id="service.id" />
        </el-tab-pane>
        <el-tab-pane label="凭据" name="credentials">
          <ServiceCredentialsPanel v-if="tab === 'credentials'" :service-id="service.id" />
        </el-tab-pane>
      </el-tabs>
    </template>

    <el-dialog v-model="editVisible" title="编辑服务" width="520px">
      <el-form v-if="service" label-width="88px">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width: 180px">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="停用" value="DISABLED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { OfficeBuilding } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { servicesApi } from '@/api'
import type { ServiceDetail } from '@/api/types'
import { confirmDelete, toastError } from '@/utils/feedback'
import { formatTimeTzLabel } from '@/utils/time'
import { useCrumbsStore } from '@/stores/crumbs'
import EntityHeader from '@/components/EntityHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import ServiceJobsPanel from '@/views/panels/ServiceJobsPanel.vue'
import ServiceCredentialsPanel from '@/views/panels/ServiceCredentialsPanel.vue'

const route = useRoute()
const router = useRouter()
const crumbs = useCrumbsStore()
const loading = ref(false)
const saving = ref(false)
const service = ref<ServiceDetail | null>(null)
const tab = ref((route.query.tab as string) || 'overview')
const editVisible = ref(false)
const editForm = reactive({ name: '', description: '', status: 'ACTIVE' })

const serviceId = () => route.params.serviceId as string

async function load() {
  loading.value = true
  try {
    service.value = await servicesApi.get(serviceId())
    crumbs.setServiceTitle(service.value.name || service.value.code)
  } catch (err) {
    toastError(err, '加载服务失败')
  } finally {
    loading.value = false
  }
}

function openEdit() {
  if (!service.value) return
  editForm.name = service.value.name
  editForm.description = service.value.description || ''
  editForm.status = service.value.status
  editVisible.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    await servicesApi.patch(serviceId(), { ...editForm })
    ElMessage.success('已更新')
    editVisible.value = false
    await load()
  } catch (err) {
    toastError(err, '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(status: string) {
  try {
    await servicesApi.patch(serviceId(), { status })
    ElMessage.success('已更新状态')
    await load()
  } catch (err) {
    toastError(err, '更新失败')
  }
}

async function onDelete() {
  if (!service.value) return
  const mode = await confirmDelete(service.value.name)
  if (!mode) return
  try {
    await servicesApi.remove(service.value.id, mode === 'hard')
    ElMessage.success(mode === 'hard' ? '已永久删除' : '已停用')
    if (mode === 'hard') await router.push('/services')
    else await load()
  } catch (err) {
    toastError(err, '删除失败')
  }
}

watch(tab, (value) => {
  void router.replace({ query: { ...route.query, tab: value } })
})

watch(
  () => route.params.serviceId,
  () => {
    void load()
  },
)

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
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}
.counts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.count {
  padding: 16px 18px;
  cursor: pointer;
}
.count.is-static {
  cursor: default;
}
.count:hover:not(.is-static) {
  border-color: var(--jc-primary-mid);
}
.count .n {
  font-size: 26px;
  font-weight: 700;
}
.count .l {
  color: var(--jc-text-secondary);
}
.count .hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--jc-text-muted);
}
.info {
  padding: 18px 20px;
}
</style>
