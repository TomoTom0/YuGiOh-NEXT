<template>
  <footer class="version-footer">
    <span class="update-date">更新日: {{ updateDate }}</span>
    <span class="version">v{{ version }}</span>
  </footer>
</template>

<script setup lang="ts">
defineProps<{
  updateDate: string;
  version: string;
}>();
</script>

<style scoped lang="scss">
.version-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: auto;
}

.update-date {
  font-weight: normal;
}

.version {
  font-weight: 600;
  color: var(--color-info);
}
</style>
