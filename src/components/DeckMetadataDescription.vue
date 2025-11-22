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
