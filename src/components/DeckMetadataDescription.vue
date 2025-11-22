<template>
  <div class="description-section">
    <div class="description-header">
      <label class="metadata-label">説明</label>
      <span class="char-count">{{ modelValue.length }}/1000</span>
    </div>
    <textarea
      :value="modelValue"
      class="metadata-textarea"
      :maxlength="1000"
      placeholder="デッキの説明を入力..."
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<style scoped lang="scss">
.description-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.description-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metadata-label {
  font-size: 12px;
  font-weight: 500;
  color: #555;
}

.char-count {
  font-size: 10px;
  color: #999;
}

.metadata-textarea {
  width: 100%;
  min-height: 60px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
}
</style>
