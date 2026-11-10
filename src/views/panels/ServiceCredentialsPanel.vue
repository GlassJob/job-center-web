<template>
  <div>
    <div class="jc-toolbar">
      <el-input v-model="keyword" clearable placeholder="搜索凭据" @keyup.enter="reload" @clear="reload" />
      <el-select v-model="status" clearable placeholder="状态" style="width: 140px" @change="reload">
        <el-option label="ACTIVE" value="ACTIVE" />
        <el-option label="REVOKED" value="REVOKED" />
      </el-select>
      <el-button @click="reload">查询</el-button>
      <span class="jc-toolbar-spacer" />
      <el-button type="primary" @click="openCreate">新建凭据</el-button>
    </div>

    <el-table v-loading="loading" :data="list" @row-click="openEdit">
      <el-table-column label="名称" min-width="160" prop="name" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }"><StatusTag :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="Secret 提示" min-width="120">
        <template #default="{ row }"><span class="jc-code">{{ row.secret_hint || '—' }}</span></template>
      </el-table-column>
      <el-table-column label="过期时间" width="180">
        <template #default="{ row }">{{ formatTime(row.expires_at) }}</template>
      </el-table-column>
      <el-table-column label="最近使用" width="180">
        <template #default="{ row }">{{ formatTime(row.last_used_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click.stop="onRotate(row)">轮换</el-button>
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

    <el-dialog v-model="visible" :title="editing ? '编辑凭据' : '新建凭据'" width="600px">
      <el-form label-width="120px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="允许的任务编码">
          <el-select
            v-model="form.jobCodes"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="留空表示不限制"
            style="width: 100%"
          />
          <el-checkbox v-if="editing" v-model="form.clearJobs">清空任务编码限制</el-checkbox>
        </el-form-item>
        <el-form-item label="允许的 IP">
          <el-select
            v-model="form.ips"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="留空表示不限制"
            style="width: 100%"
          />
          <el-checkbox v-if="editing" v-model="form.clearIps">清空 IP 限制</el-checkbox>
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="form.expiresAt"
            type="datetime"
            placeholder="可选，按本地时区选择，提交为 UTC"
            style="width: 100%"
          />
          <el-checkbox v-if="editing" v-model="form.clearExpires">清除过期时间</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>

    <SecretDialog
      v-model="secretVisible"
      :title="secretTitle"
      :name="secretName"
      :id="secretId"
      :secret="secretValue"
      :token="secretToken"
      @dismissed="clearSecret"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { credentialsApi } from '@/api'
import type { CredentialCreated, CredentialView, PatchCredentialInput } from '@/api/types'
import { confirmAction, confirmDelete, toastError } from '@/utils/feedback'
import { formatTime, toRfc3339Utc } from '@/utils/time'
import StatusTag from '@/components/StatusTag.vue'
import SecretDialog from '@/components/SecretDialog.vue'

const props = defineProps<{ serviceId: string }>()

function toUtc(value: Date | string): string {
  return toRfc3339Utc(value instanceof Date ? value : new Date(value))
}

const loading = ref(false)
const saving = ref(false)
const list = ref<CredentialView[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const keyword = ref('')
const status = ref('')
const visible = ref(false)
const editing = ref<CredentialView | null>(null)
const form = reactive({
  name: '',
  jobCodes: [] as string[],
  ips: [] as string[],
  expiresAt: null as Date | string | null,
  clearJobs: false,
  clearIps: false,
  clearExpires: false,
})

const secretVisible = ref(false)
const secretTitle = ref('请保存一次性密钥')
const secretName = ref('')
const secretId = ref('')
const secretValue = ref('')
const secretToken = ref('')

function showSecret(item: CredentialCreated, title: string) {
  secretTitle.value = title
  secretName.value = item.name
  secretId.value = item.id
  secretValue.value = item.secret
  secretToken.value = item.token
  secretVisible.value = true
}

function clearSecret() {
  secretValue.value = ''
  secretToken.value = ''
}

async function fetchList() {
  loading.value = true
  try {
    const res = await credentialsApi.list(props.serviceId, {
      keyword: keyword.value.trim(),
      status: status.value,
      page: page.value,
      limit: limit.value,
    })
    list.value = res.list
    total.value = res.total
  } catch (err) {
    toastError(err, '加载凭据失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  void fetchList()
}

function openCreate() {
  editing.value = null
  form.name = ''
  form.jobCodes = []
  form.ips = []
  form.expiresAt = null
  form.clearJobs = false
  form.clearIps = false
  form.clearExpires = false
  visible.value = true
}

function openEdit(row: CredentialView) {
  editing.value = row
  form.name = row.name
  form.jobCodes = [...(row.allowed_job_codes || [])]
  form.ips = [...(row.allowed_ips || [])]
  form.expiresAt = row.expires_at ? new Date(row.expires_at) : null
  form.clearJobs = false
  form.clearIps = false
  form.clearExpires = false
  visible.value = true
}

async function onSubmit() {
  if (!form.name.trim()) {
    ElMessage.warning('请填写名称')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      const body: PatchCredentialInput = { name: form.name.trim() }
      if (form.clearJobs) body.clear_allowed_job_codes = true
      else body.allowed_job_codes = form.jobCodes
      if (form.clearIps) body.clear_allowed_ips = true
      else body.allowed_ips = form.ips
      if (form.clearExpires) body.clear_expires_at = true
      else if (form.expiresAt) body.expires_at = toUtc(form.expiresAt)
      await credentialsApi.patch(props.serviceId, editing.value.id, body)
      ElMessage.success('已更新')
    } else {
      const created = await credentialsApi.create(props.serviceId, {
        name: form.name.trim(),
        allowed_job_codes: form.jobCodes.length ? form.jobCodes : undefined,
        allowed_ips: form.ips.length ? form.ips : undefined,
        expires_at: form.expiresAt ? toUtc(form.expiresAt) : undefined,
      })
      visible.value = false
      showSecret(created, '凭据已创建，请保存密钥')
      await fetchList()
      return
    }
    visible.value = false
    await fetchList()
  } catch (err) {
    toastError(err, '保存失败')
  } finally {
    saving.value = false
  }
}

async function onRotate(row: CredentialView) {
  const ok = await confirmAction(`确认轮换凭据「${row.name}」的密钥？旧密钥将立即失效。`, '轮换密钥')
  if (!ok) return
  try {
    const created = await credentialsApi.rotate(props.serviceId, row.id)
    showSecret(created, '密钥已轮换，请保存新密钥')
    await fetchList()
  } catch (err) {
    toastError(err, '轮换失败')
  }
}

async function onDelete(row: CredentialView) {
  const mode = await confirmDelete(row.name)
  if (!mode) return
  try {
    await credentialsApi.remove(props.serviceId, row.id, mode === 'hard')
    ElMessage.success(mode === 'hard' ? '已永久删除' : '已吊销')
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
.pager { display: flex; justify-content: flex-end; padding: 14px 4px 4px; }
</style>
