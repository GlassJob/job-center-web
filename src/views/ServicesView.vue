<template>
  <div class="jc-page">
    <PageHeader title="服务" description="管理 Job Center 中的服务及其下属任务与凭据。">
      <el-button type="primary" @click="openCreate">新建服务</el-button>
    </PageHeader>

    <div class="jc-card table-card">
      <div class="jc-toolbar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索名称或编码"
          @keyup.enter="reload"
          @clear="reload"
        />
        <el-button @click="reload">查询</el-button>
        <span class="jc-toolbar-spacer" />
        <span class="jc-muted">共 {{ total }} 条</span>
      </div>

      <el-table v-loading="loading" :data="list" @row-click="goDetail">
        <el-table-column label="服务" min-width="220">
          <template #default="{ row }">
            <div class="name">{{ row.name }}</div>
            <div class="jc-code">{{ row.code }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <StatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '—' }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ formatTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status === 'ACTIVE'"
              link
              type="primary"
              @click.stop="toggleStatus(row, 'DISABLED')"
            >停用</el-button>
            <el-button v-else link type="primary" @click.stop="toggleStatus(row, 'ACTIVE')">启用</el-button>
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

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑服务' : '新建服务'" width="520px">
      <el-form label-width="88px">
        <el-form-item v-if="!editing" label="编码" required>
          <el-input v-model="form.code" placeholder="服务唯一编码，创建后不可改" />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item v-if="editing" label="状态">
          <el-select v-model="form.status" style="width: 180px">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="停用" value="DISABLED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { servicesApi } from '@/api'
import type { Service } from '@/api/types'
import { confirmDelete, toastError } from '@/utils/feedback'
import { formatTime } from '@/utils/time'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const list = ref<Service[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const keyword = ref('')

const dialogVisible = ref(false)
const editing = ref<Service | null>(null)
const form = reactive({ code: '', name: '', description: '', status: 'ACTIVE' })

function goDetail(row: Service) {
  void router.push(`/services/${row.id}`)
}

function openCreate() {
  editing.value = null
  form.code = ''
  form.name = ''
  form.description = ''
  form.status = 'ACTIVE'
  dialogVisible.value = true
}

function openEdit(row: Service) {
  editing.value = row
  form.code = row.code
  form.name = row.name
  form.description = row.description || ''
  form.status = row.status
  dialogVisible.value = true
}

async function fetchList() {
  loading.value = true
  try {
    const res = await servicesApi.list({
      keyword: keyword.value.trim(),
      page: page.value,
      limit: limit.value,
    })
    list.value = res.list
    total.value = res.total
  } catch (err) {
    toastError(err, '加载服务失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  void fetchList()
}

async function onSubmit() {
  if (!form.name.trim() || (!editing.value && !form.code.trim())) {
    ElMessage.warning('请填写编码和名称')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await servicesApi.patch(editing.value.id, {
        name: form.name.trim(),
        description: form.description,
        status: form.status,
      })
      ElMessage.success('已更新')
    } else {
      await servicesApi.create({
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description,
      })
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    await fetchList()
  } catch (err) {
    toastError(err, '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(row: Service, status: string) {
  try {
    await servicesApi.patch(row.id, { status })
    ElMessage.success(status === 'ACTIVE' ? '已启用' : '已停用')
    await fetchList()
  } catch (err) {
    toastError(err, '更新状态失败')
  }
}

async function onDelete(row: Service) {
  const mode = await confirmDelete(row.name)
  if (!mode) return
  try {
    await servicesApi.remove(row.id, mode === 'hard')
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
.table-card {
  padding: 16px 16px 12px;
}
.name {
  font-weight: 600;
}
.pager {
  display: flex;
  justify-content: flex-end;
  padding: 14px 4px 4px;
}
</style>
