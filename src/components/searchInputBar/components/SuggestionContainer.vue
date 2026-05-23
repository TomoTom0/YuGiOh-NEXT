<!--
/**
 * SuggestionContainer - 候補リスト表示コンテナ
 *
 * コマンド候補、フィルター候補、マイデッキ候補の表示を管理します。
 *
 * @component
 */
-->
<template>
  <!-- コマンド候補リスト -->
  <SuggestionList
    v-if="showCommandSuggestions"
    :suggestions="commandSuggestions"
    :selected-index="selectedCommandIndex"
    :is-bottom-position="isBottomPosition"
    variant="command"
    @select="$emit('select-command', $event)"
  />

  <!-- フィルター候補リスト -->
  <SuggestionList
    v-if="showFilterSuggestions"
    :suggestions="filteredSuggestions"
    :selected-index="selectedSuggestionIndex"
    :is-bottom-position="isBottomPosition"
    @select="$emit('select-suggestion', $event)"
  />

  <!-- mydeckモード用の候補リスト -->
  <div v-if="showMydeckDropdown" class="mode-dropdown-overlay" @click="$emit('close-mydeck')"></div>
  <SuggestionList
    v-if="showMydeckDropdown"
    :suggestions="mydeckSuggestions"
    :selected-index="selectedMydeckIndex"
    :is-bottom-position="isBottomPosition"
    variant="mydeck"
    @select="$emit('select-mydeck', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SuggestionList from './SuggestionList.vue'
// @ts-ignore - PendingCommand is used in defineProps type parameter
import { type PendingCommand } from '../composables/useSlashCommands'

const props = defineProps<{
  pendingCommand: PendingCommand | null
  commandSuggestions: any[]
  filteredSuggestions: any[]
  mydeckSuggestions: any[]
  selectedCommandIndex: number
  selectedSuggestionIndex: number
  selectedMydeckIndex: number
  showMydeckDropdown: boolean
  isBottomPosition: boolean
}>()

defineEmits<{
  'select-command': [suggestion: any]
  'select-suggestion': [suggestion: any]
  'select-mydeck': [suggestion: any]
  'close-mydeck': []
}>()

// コマンド候補を表示するかどうか
const showCommandSuggestions = computed(() => {
  return !props.pendingCommand && props.commandSuggestions.length > 0
})

// フィルター候補を表示するかどうか
const showFilterSuggestions = computed(() => {
  return props.pendingCommand && props.filteredSuggestions.length > 0
})
</script>

<style scoped lang="scss">
.mode-dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 999;
}
</style>
