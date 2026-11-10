<template>
  <div class="entity-header jc-card">
    <div class="lead">
      <div class="tile" :style="{ background: tileColor }">
        <el-icon :size="22"><component :is="icon" /></el-icon>
      </div>
      <div class="meta">
        <div class="name-row">
          <h2>{{ name }}</h2>
          <StatusTag v-if="status" :status="status" />
          <slot name="tags" />
        </div>
        <div class="code-row">
          <span class="jc-code">{{ code }}</span>
          <el-button
            v-if="code"
            link
            type="primary"
            size="small"
            @click="copy(code)"
          >复制编码</el-button>
        </div>
        <p v-if="description" class="desc">{{ description }}</p>
      </div>
    </div>
    <div class="actions">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { Component } from 'vue'
import StatusTag from './StatusTag.vue'

defineProps<{
  name: string
  code?: string
  status?: string
  description?: string
  icon: Component
  tileColor?: string
}>()

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.warning('复制失败')
  }
}

</script>

<style scoped>
.entity-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}
.lead {
  display: flex;
  gap: 14px;
  min-width: 0;
}
.tile {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #7147e8;
  flex-shrink: 0;
}
.meta {
  min-width: 0;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.name-row h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.code-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}
.desc {
  margin: 6px 0 0;
  color: var(--jc-text-secondary);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}
</style>
