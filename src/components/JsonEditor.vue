<template>
  <div class="json-editor">
    <div class="bar">
      <span class="label">{{ label }}</span>
      <span class="size" :class="{ over: oversize }">{{ sizeLabel }}</span>
      <span class="spacer" />
      <el-button link type="primary" @click="format">格式化</el-button>
      <el-button v-if="clearable" link type="primary" @click="clear">清空</el-button>
    </div>
    <el-input
      v-model="model"
      type="textarea"
      :autosize="{ minRows, maxRows }"
      :placeholder="placeholder"
      spellcheck="false"
      class="area"
    />
    <div v-if="error" class="err">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  assertObjectSize,
  JSON_OBJECT_MAX_BYTES,
  parseJsonObject,
  prettyJson,
  utf8ByteLength,
} from '@/utils/json'
import type { JsonObject } from '@/api/types'

const props = withDefaults(
  defineProps<{
    label?: string
    placeholder?: string
    minRows?: number
    maxRows?: number
    clearable?: boolean
    emptyAs?: 'object' | 'null'
  }>(),
  {
    label: 'JSON 对象',
    placeholder: '{ }',
    minRows: 6,
    maxRows: 16,
    clearable: false,
    emptyAs: 'object',
  },
)

const model = defineModel<string>({ default: '' })
const error = ref('')

const bytes = computed(() => utf8ByteLength(model.value || ''))
const oversize = computed(() => bytes.value > JSON_OBJECT_MAX_BYTES)
const sizeLabel = computed(() => {
  const n = bytes.value
  if (n < 1024) return `${n} B / 64 KiB`
  return `${(n / 1024).toFixed(1)} KiB / 64 KiB`
})

watch(model, () => {
  error.value = ''
})

function format() {
  try {
    const obj = parseJsonObject(model.value, props.emptyAs)
    if (obj === null) {
      model.value = ''
      return
    }
    model.value = prettyJson(obj)
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'JSON 格式无效'
  }
}

function clear() {
  model.value = ''
  error.value = ''
}

function validate(): JsonObject | null {
  try {
    const obj = parseJsonObject(model.value, props.emptyAs)
    if (obj !== null) assertObjectSize(obj, props.label)
    error.value = ''
    return obj
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'JSON 格式无效'
    throw e
  }
}

defineExpose({ validate })
</script>

<style scoped>
.json-editor {
  width: 100%;
}
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.label {
  font-weight: 600;
  font-size: 13px;
}
.size {
  color: var(--jc-text-muted);
  font-size: 12px;
}
.size.over {
  color: var(--jc-danger);
}
.spacer {
  flex: 1;
}
.area :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
}
.err {
  margin-top: 6px;
  color: var(--jc-danger);
  font-size: 12px;
}
</style>
