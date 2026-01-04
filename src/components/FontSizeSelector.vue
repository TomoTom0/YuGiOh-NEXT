<template>
  <div class="setting-block">
    <div class="block-title">{{ title }}</div>
    <div class="size-grid">
      <button
        v-for="size in options"
        :key="size"
        class="size-btn"
        :class="{ active: modelValue === size }"
        @click="$emit('update:modelValue', size)"
      >
        {{ size.toUpperCase() }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RightAreaFontSize } from '../types/settings';

withDefaults(defineProps<{
  title: string;
  modelValue: RightAreaFontSize;
  options?: RightAreaFontSize[];
}>(), {
  options: () => ['s', 'm', 'l', 'xl'] as RightAreaFontSize[]
});

defineEmits<{
  'update:modelValue': [value: RightAreaFontSize];
}>();
</script>

<style scoped lang="scss">
.setting-block {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px;
  min-height: 120px;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.block-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.size-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  flex: 1;
}

.size-btn {
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.15s;

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    background: linear-gradient(135deg, #0089ff 0%, #0068d9 100%);
    color: white;
    border-color: #0068d9;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(0, 137, 255, 0.3);
  }
}
</style>
