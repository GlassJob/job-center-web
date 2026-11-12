<template>
  <div class="jc-page">
    <PageHeader title="客户端" description="管理调用管理接口的 HMAC 客户端、权限范围与密钥轮换。">
      <el-button type="primary" @click="openCreate">新建客户端</el-button>
    </PageHeader>

    <div class="jc-card table-card">
      <div class="jc-toolbar">
        <el-input v-model="keyword" clearable placeholder="搜索名称" @keyup.enter="reload" @clear="reload" />
        <el-select v-model="status" clearable placeholder="状态" style="width: 140px" @change="reload">
          <el-option label="启用" value="ACTIVE" />
          <el-option label="已吊销" value="REVOKED" />
          <el-option label="停用" value="DISABLED" />
        </el-select>
        <el-button @click="reload">查询</el-button>
      </div>

      <el-table v-loading="loading" :data="list" @row-click="openEdit">
        <el-table-column label="客户端" min-width="200">
          <template #default="{ row }">
            <div class="name">{{ row.name }}</div>
            <div class="jc-code">{{ row.id }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="权限范围" min-width="220">
          <template #default="{ row }">
            <div class="scopes">
              <el-tag v-for="scope in row.scopes || []" :key="scope" size="small" effect="plain" :title="scope">{{ scopeLabel(scope) }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="密钥提示" width="130">
          <template #default="{ row }"><span class="jc-code">{{ row.secret_hint || '—' }}</span></template>
        </el-table-column>
        <el-table-column label="最近使用" width="180">
          <template #default="{ row }">{{ formatTime(row.last_used_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openEdit(row)">编辑</el-button>
            <el-button link type="primary" @click.stop="onRotate(row)">轮换</el-button>
            <el-button v-if="row.status !== 'REVOKED'" link type="danger" @click.stop="onRevoke(row)">吊销</el-button>
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
    </div>

    <el-dialog v-model="visible" :title="editing ? '编辑客户端' : '新建客户端'" width="640px">
      <el-form label-width="88px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item v-if="editing" label="状态">
          <el-select v-model="form.status" style="width: 180px">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="停用" value="DISABLED" />
            <el-option label="已吊销" value="REVOKED" />
          </el-select>
        </el-form-item>
        <el-form-item label="权限范围">
          <el-checkbox-group v-model="form.scopes" class="scope-group">
            <el-checkbox v-for="item in CLIENT_SCOPE_OPTIONS" :key="item.value" :value="item.value" :label="item.value">
              {{ item.label }}
              <span class="jc-code">{{ item.value }}</span>
            </el-checkbox>
          </el-checkbox-group>
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
      @dismissed="secretValue = ''"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { clientsApi } from '@/api'
import { CLIENT_SCOPE_OPTIONS, type ClientCreated, type ClientView } from '@/api/types'
import { confirmAction, confirmDelete, toastError } from '@/utils/feedback'
import { scopeLabel } from '@/utils/labels'
import { formatTime } from '@/utils/time'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import SecretDialog from '@/components/SecretDialog.vue'

const loading = ref(false)
const saving = ref(false)
const list = ref<ClientView[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const keyword = ref('')
const status = ref('')
const visible = ref(false)
const editing = ref<ClientView | null>(null)
const form = reactive({
  name: '',
  description: '',
  status: 'ACTIVE',
  scopes: [] as string[],
})

const secretVisible = ref(false)
const secretTitle = ref('请保存一次性密钥')
const secretName = ref('')
const secretId = ref('')
const secretValue = ref('')

function showSecret(item: ClientCreated, title: string) {
  secretTitle.value = title
  secretName.value = item.name
  secretId.value = item.id
  secretValue.value = item.secret
  secretVisible.value = true
}

async function fetchList() {
  loading.value = true
  try {
    const res = await clientsApi.list({
      keyword: keyword.value.trim(),
      status: status.value,
      page: page.value,
      limit: limit.value,
    })
    list.value = res.list
    total.value = res.total
  } catch (err) {
    toastError(err, '加载客户端失败')
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
  form.description = ''
  form.status = 'ACTIVE'
  form.scopes = CLIENT_SCOPE_OPTIONS.map((item) => item.value)
  visible.value = true
}

function openEdit(row: ClientView) {
  editing.value = row
  form.name = row.name
  form.description = row.description || ''
  form.status = row.status
  form.scopes = [...(row.scopes || [])]
  visible.value = true
}

async function onSubmit() {
  if (!form.name.trim()) {
    ElMessage.warning('请填写名称')
    return
  }
  if (!editing.value && form.scopes.length === 0) {
    ElMessage.warning('请至少选择一个权限范围')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await clientsApi.patch(editing.value.id, {
        name: form.name.trim(),
        description: form.description,
        status: form.status,
        scopes: form.scopes,
      })
      ElMessage.success('已更新')
      visible.value = false
      await fetchList()
    } else {
      const created = await clientsApi.create({
        name: form.name.trim(),
        description: form.description,
        scopes: form.scopes,
      })
      visible.value = false
      showSecret(created, '客户端已创建，请保存密钥')
      await fetchList()
    }
  } catch (err) {
    toastError(err, '保存失败')
  } finally {
    saving.value = false
  }
}

async function onRotate(row: ClientView) {
  const ok = await confirmAction(`确认轮换客户端「${row.name}」的密钥？旧密钥将立即失效。`, '轮换密钥')
  if (!ok) return
  try {
    const created = await clientsApi.rotate(row.id)
    showSecret(created, '密钥已轮换，请保存新密钥')
    await fetchList()
  } catch (err) {
    toastError(err, '轮换失败')
  }
}

async function onRevoke(row: ClientView) {
  const ok = await confirmAction(`确认吊销客户端「${row.name}」？`, '吊销客户端')
  if (!ok) return
  try {
    await clientsApi.revoke(row.id)
    ElMessage.success('已吊销')
    await fetchList()
  } catch (err) {
    toastError(err, '吊销失败')
  }
}

async function onDelete(row: ClientView) {
  const mode = await confirmDelete(row.name)
  if (!mode) return
  try {
    await clientsApi.remove(row.id, mode === 'hard')
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
.table-card { padding: 16px 16px 12px; }
.name { font-weight: 600; }
.scopes { display: flex; flex-wrap: wrap; gap: 4px; }
.pager { display: flex; justify-content: flex-end; padding: 14px 4px 4px; }
.scope-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
}
.scope-group :deep(.el-checkbox) {
  margin-right: 0;
  height: auto;
  align-items: flex-start;
  white-space: normal;
}
</style>
