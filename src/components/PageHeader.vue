<template>
  <div class="page-header">
    <div class="titles">
      <h1>{{ title }}</h1>
      <p v-if="description" class="desc">{{ description }}</p>
    </div>
    <div class="actions">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.titles h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.desc {
  margin: 4px 0 0;
  color: var(--jc-text-secondary);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
</style>
