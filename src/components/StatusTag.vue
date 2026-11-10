<template>
  <span class="jc-status" :class="`is-${meta.tone}`">{{ meta.label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { statusMeta, type TagTone } from '@/utils/status'

const props = defineProps<{
  status?: string | null
  label?: string
  tone?: TagTone
}>()

const meta = computed(() => {
  const base = statusMeta(props.status)
  return {
    label: props.label || base.label,
    tone: props.tone || base.tone,
  }
})
</script>

<style scoped>
.jc-status {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  border: 1px solid transparent;
  white-space: nowrap;
}
.is-primary {
  color: #5a35d1;
  background: #f1edfd;
  border-color: #e2dafc;
}
.is-success {
  color: #046c4e;
  background: #def7ec;
  border-color: #bcf0da;
}
.is-warning {
  color: #9a3412;
  background: #fef3c7;
  border-color: #fde68a;
}
.is-danger {
  color: #9b1c1c;
  background: #fde8e8;
  border-color: #fbd5d5;
}
.is-info {
  color: #1e429f;
  background: #e8f0fe;
  border-color: #c3ddfd;
}
.is-muted {
  color: #6b7280;
  background: #f3f4f6;
  border-color: #e5e7eb;
}
</style>
