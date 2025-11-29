<template>
  <div class="description-section">
    <div class="description-header">
      <label class="metadata-label">説明</label>
      <span class="char-count">{{ modelValue.length }}/1000</span>
    </div>
    <textarea
      v-model="value"
      class="metadata-textarea"
      :maxlength="1000"
      placeholder="デッキの説明を入力..."
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const value = computed({
  get() {
    return props.modelValue
  },
  set(newValue: string) {
    emit('update:modelValue', newValue)
  }
})
</script>

<style scoped lang="scss">
.description-section {
  margin-top: 8px;
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.description-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  width: 100%;
}

.metadata-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: left;
}

.char-count {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: right;
}

.metadata-textarea {
  width: 100%;
  max-width: 100%;
  padding: 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--text-primary);
  background: var(--bg-primary);
  resize: none;
  flex: 1;
  min-height: 0;
  line-height: 1.6;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--theme-gradient-start, #00d9b8);
    box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px rgba(0, 217, 184, 0.1);
  }

  &:hover {
    border-color: var(--text-tertiary);
  }

  &::placeholder {
    color: var(--text-tertiary);
  }
}
</style>
