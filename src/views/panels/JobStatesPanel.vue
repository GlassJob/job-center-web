<template>
  <div>
    <div class="jc-toolbar">
      <el-input v-model="keyword" clearable placeholder="搜索键名" @keyup.enter="reload" @clear="reload" />
      <el-button @click="reload">查询</el-button>
      <span class="jc-toolbar-spacer" />
      <el-button type="primary" @click="openCreate">新建游标</el-button>
    </div>

    <el-table v-loading="loading" :data="list" @row-click="openEdit">
      <el-table-column label="键" min-width="160">
        <template #default="{ row }"><span class="jc-code">{{ row.key }}</span></template>
      </el-table-column>
      <el-table-column label="版本" width="100" prop="version" />
      <el-table-column label="更新者" min-width="160">
        <template #default="{ row }">{{ row.updated_by || '—' }}</template>
      </el-table-column>
      <el-table-column label="关联执行" min-width="180">
        <template #default="{ row }">
          <span
            v-if="row.updated_by_execution_id"
            class="clickable-id"
            @click.stop="goExecution(row.updated_by_execution_id)"
          >{{ row.updated_by_execution_id }}</span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="180">
        <template #default="{ row }">{{ formatTime(row.updated_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="openEdit(row)">编辑</el-button>
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

    <el-dialog v-model="visible" :title="editing ? `编辑游标 · ${editing.key} · v${editing.version}` : '新建游标'" width="640px">
      <el-form label-width="88px">
        <el-form-item v-if="!editing" label="键" required>
          <el-input v-model="form.key" placeholder="例如 cursor" />
        </el-form-item>
        <el-form-item label="值">
          <JsonEditor ref="valueEditor" v-model="form.valueText" label="游标值" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { statesApi } from '@/api'
import type { JobStateView } from '@/api/types'
import { confirmHardOnly, handleConflict, toastError } from '@/utils/feedback'
import { prettyJson } from '@/utils/json'
import { formatTime } from '@/utils/time'
import JsonEditor from '@/components/JsonEditor.vue'

const props = defineProps<{ serviceId: string; jobId: string }>()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const list = ref<JobStateView[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const keyword = ref('')
const visible = ref(false)
const editing = ref<JobStateView | null>(null)
const valueEditor = ref<InstanceType<typeof JsonEditor>>()
const form = reactive({ key: '', valueText: '{\n  \n}' })

async function fetchList() {
  loading.value = true
  try {
    const res = await statesApi.list(props.serviceId, props.jobId, {
      keyword: keyword.value.trim(),
      page: page.value,
      limit: limit.value,
    })
    list.value = res.list
    total.value = res.total
  } catch (err) {
    toastError(err, '加载游标失败')
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
  form.key = ''
  form.valueText = '{\n  \n}'
  visible.value = true
}

function openEdit(row: JobStateView) {
  editing.value = row
  form.key = row.key
  form.valueText = prettyJson(row.value) || '{}'
  visible.value = true
}

async function onSubmit() {
  let value
  try {
    value = valueEditor.value?.validate()
  } catch {
    return
  }
  if (!value) {
    ElMessage.warning('值必须是 JSON 对象')
    return
  }
  if (!editing.value && !form.key.trim()) {
    ElMessage.warning('请填写键名')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await statesApi.patch(props.serviceId, props.jobId, editing.value.id, {
        version: editing.value.version,
        value,
      })
      ElMessage.success('已保存（版本号已递增）')
    } else {
      await statesApi.create(props.serviceId, props.jobId, { key: form.key.trim(), value })
      ElMessage.success('已创建')
    }
    visible.value = false
    await fetchList()
  } catch (err) {
    if (await handleConflict(err, fetchList)) {
      visible.value = false
      return
    }
    toastError(err, '保存失败')
  } finally {
    saving.value = false
  }
}

async function onDelete(row: JobStateView) {
  const ok = await confirmHardOnly(row.key, '游标删除为物理删除，不会软删除。')
  if (!ok) return
  try {
    await statesApi.remove(props.serviceId, props.jobId, row.id)
    ElMessage.success('已删除')
    await fetchList()
  } catch (err) {
    toastError(err, '删除失败')
  }
}

function goExecution(executionId: string) {
  void router.push(
    `/services/${props.serviceId}/jobs/${props.jobId}/executions/${executionId}`,
  )
}

onMounted(() => {
  void fetchList()
})
</script>

<style scoped>
.pager { display: flex; justify-content: flex-end; padding: 14px 4px 4px; }
</style>
