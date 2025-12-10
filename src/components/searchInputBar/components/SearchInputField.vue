<!--
/**
 * SearchInputField - 検索入力フィールドコンポーネント
 *
 * 検索入力とキーボードイベントハンドリングをカプセル化します。
 *
 * @component
 */
-->
<template>
  <div class="input-row">
    <!-- コマンドモード表示 -->
    <span v-if="pendingCommand" class="command-prefix">{{ pendingCommand.command }}</span>
    <input
      ref="inputRef"
      :value="modelValue"
      type="text"
      class="search-input"
      :class="{
        'has-prefix': pendingCommand,
        [placeholderSizeClass]: true
      }"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value); $emit('input', $event)"
      @focus="$emit('focus', $event)"
      @keydown.enter.prevent="$emit('enter', $event)"
      @keydown.escape="$emit('escape', $event)"
      @keydown="$emit('keydown', $event)"
    >
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// @ts-ignore - PendingCommand is used in defineProps type parameter
import { type PendingCommand } from '../composables/useSlashCommands'

defineProps<{
  modelValue: string
  placeholder: string
  placeholderSizeClass: string
  pendingCommand: PendingCommand | null
}>()

defineEmits<{
  'update:modelValue': [value: string]
  'input': [event: Event]
  'focus': [event: FocusEvent]
  'enter': [event: KeyboardEvent]
  'escape': [event: KeyboardEvent]
  'keydown': [event: KeyboardEvent]
}>()

const inputRef = ref<HTMLInputElement>()

// 親コンポーネントからフォーカスできるようにする
defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>

<style scoped lang="scss">
.input-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.command-prefix {
  color: var(--ygo-next-color-primary);
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--ygo-next-color-text);
  min-width: 0;
  text-align: left;

  &.has-prefix {
    padding-left: 2px;
  }

  &::placeholder {
    color: var(--ygo-next-color-text-secondary);
    opacity: 0.6;
  }

  &.compact {
    font-size: 12px;
  }

  &.large {
    font-size: 14px;
  }

  &.small {
    font-size: 12px;
  }
}
</style>
