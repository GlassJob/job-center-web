<template>
  <div class="jc-page">
    <PageHeader title="连接设置" description="配置任务中心地址与 HMAC 凭证。密钥仅保存在本机浏览器，不会写入仓库。" />

    <div class="jc-card form-card">
      <el-form label-width="140px" @submit.prevent="onSave">
        <el-form-item label="服务地址">
          <el-input
            v-model="conn.baseUrl"
            placeholder="http://127.0.0.1:8080"
            clearable
          />
          <div class="hint">
            留空或填写 <code>/</code> 时使用相对路径，开发环境下由 Vite 将
            <code>/v1</code> 与 <code>/health</code> 代理到
            <code>{{ proxyTarget }}</code>（可通过环境变量 <code>VITE_JC_PROXY_TARGET</code> 覆盖），从而避免跨域。
            直接填写后端地址则由浏览器发起跨域请求。
          </div>
        </el-form-item>
        <el-form-item label="客户端 ID" required>
          <el-input v-model="conn.clientId" placeholder="管理端客户端 ID" clearable />
        </el-form-item>
        <el-form-item label="客户端密钥" required>
          <el-input
            v-model="conn.clientSecret"
            type="password"
            show-password
            placeholder="仅保存在本机浏览器"
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="操作者 ID">
          <el-input v-model="conn.operatorId" placeholder="写入审计的操作者 ID" clearable />
        </el-form-item>
        <el-form-item label="操作者名称">
          <el-input v-model="conn.operatorName" placeholder="写入审计的操作者名称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" native-type="submit">保存</el-button>
          <el-button :loading="testing" @click="onTest">测试连接</el-button>
        </el-form-item>
      </el-form>

      <div v-if="testResult" class="result" :class="testResult.ok ? 'ok' : 'bad'">
        <div class="result-title">{{ testResult.ok ? '连接成功' : '连接失败' }}</div>
        <pre class="json-pre">{{ testResult.detail }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { healthApi, servicesApi } from '@/api'
import { prettyJson } from '@/utils/json'
import { toastError } from '@/utils/feedback'
import { useSettingsStore, type ConnectionSettings } from '@/stores/settings'
import PageHeader from '@/components/PageHeader.vue'

const settings = useSettingsStore()
const conn = ref<ConnectionSettings>({
  baseUrl: settings.settings.baseUrl,
  clientId: settings.settings.clientId,
  clientSecret: settings.settings.clientSecret,
  operatorId: settings.settings.operatorId,
  operatorName: settings.settings.operatorName,
})
const saving = ref(false)
const testing = ref(false)
const testResult = ref<{ ok: boolean; detail: string } | null>(null)
const proxyTarget = import.meta.env.VITE_JC_PROXY_TARGET || 'http://127.0.0.1:8080'

function onSave() {
  saving.value = true
  try {
    settings.save({ ...conn.value })
    ElMessage.success('已保存到本机浏览器')
  } finally {
    saving.value = false
  }
}

async function onTest() {
  settings.save({ ...conn.value })
  testing.value = true
  testResult.value = null
  try {
    const live = await healthApi.live()
    const ready = await healthApi.ready()
    const lines = [
      `GET /health/live  → ${JSON.stringify(live)}`,
      `GET /health/ready → ${JSON.stringify(ready)}`,
    ]
    if (!settings.hasCredentials) {
      testResult.value = {
        ok: live.status === 'ok',
        detail: `${lines.join('\n')}\n\n未填写 Client 凭证，已跳过签名接口探测。`,
      }
      return
    }
    const list = await servicesApi.list({ page: 1, limit: 1 })
    lines.push(`GET /v1/admin/services?limit=1 → total=${list.total}`)
    if (list.list[0]) lines.push(prettyJson(list.list[0]))
    testResult.value = { ok: true, detail: lines.join('\n') }
    ElMessage.success('连接与签名校验通过')
  } catch (err) {
    toastError(err, '测试连接失败')
    testResult.value = {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    }
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.form-card {
  padding: 24px 28px 28px;
  max-width: 760px;
}
.hint {
  margin-top: 6px;
  color: var(--jc-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}
.hint code {
  background: #f3f4f6;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 12px;
}
.result {
  margin-top: 8px;
  padding-top: 8px;
}
.result-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.result.ok .result-title {
  color: var(--jc-success);
}
.result.bad .result-title {
  color: var(--jc-danger);
}
</style>
