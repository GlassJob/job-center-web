<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="560px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="请立即复制并妥善保存。关闭后无法再次查看明文。"
      style="margin-bottom: 16px"
    />
    <div v-if="name" class="row">
      <span class="k">名称</span>
      <span>{{ name }}</span>
    </div>
    <div v-if="id" class="row">
      <span class="k">ID</span>
      <span class="jc-code">{{ id }}</span>
    </div>
    <div v-if="secret" class="block">
      <div class="block-head">
        <strong>Secret</strong>
        <el-button type="primary" link @click="copy(secret)">复制</el-button>
      </div>
      <pre class="json-pre">{{ secret }}</pre>
    </div>
    <div v-if="token" class="block">
      <div class="block-head">
        <strong>Token</strong>
        <el-button type="primary" link @click="copy(token)">复制</el-button>
      </div>
      <pre class="json-pre">{{ token }}</pre>
      <p class="hint">Token 格式为 jcs_&lt;id&gt;.&lt;secret&gt;，用于 HTTP 联调；WebSocket 请使用 HMAC。</p>
    </div>
    <template #footer>
      <el-button type="primary" @click="visible = false">我已保存，关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  title?: string
  name?: string
  id?: string
  secret?: string
  token?: string
}>()

const visible = defineModel<boolean>({ default: false })
const title = computed(() => props.title || '请保存一次性密钥')

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.warning('复制失败，请手动选择文本')
  }
}

function onClosed() {
  emit('dismissed')
}

const emit = defineEmits<{
  dismissed: []
}>()
</script>

<style scoped>
.row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}
.k {
  width: 64px;
  color: var(--jc-text-muted);
}
.block {
  margin-top: 12px;
}
.block-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.hint {
  margin: 6px 0 0;
  color: var(--jc-text-secondary);
  font-size: 12px;
}
</style>
