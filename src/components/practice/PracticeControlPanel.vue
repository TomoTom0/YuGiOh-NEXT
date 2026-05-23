<template>
  <div class="ygo-next practice-control-panel">
    <button class="ctrl-btn" @click="$emit('draw')" title="Draw">Draw</button>
    <button class="ctrl-btn" @click="$emit('shuffle')" title="Shuffle">Shuffle</button>
    <button class="ctrl-btn" @click="$emit('reset')" title="Reset">Reset</button>
    <button class="ctrl-btn" @click="$emit('undo')" :disabled="!canUndo" title="Undo">Undo</button>
    <button class="ctrl-btn" @click="$emit('redo')" :disabled="!canRedo" title="Redo">Redo</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  canUndo: boolean
  canRedo: boolean
}>()

defineEmits<{
  draw: []
  shuffle: []
  reset: []
  undo: []
  redo: []
}>()
</script>

<style scoped lang="scss">
.practice-control-panel {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.ctrl-btn {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 4px;
  background: var(--bg-secondary, rgba(255, 255, 255, 0.05));
  color: var(--text-primary, #e0e0e0);
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--color-primary, #1976d2);
    border-color: var(--color-primary, #1976d2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>
