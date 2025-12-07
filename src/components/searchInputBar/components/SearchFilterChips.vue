<template>
  <div class="filter-icons-top">
    <!-- 予定チップ（入力が有効な場合のみ） -->
    <span
      v-if="previewChip"
      class="filter-icon-item filter-chip-preview"
      :class="{ 'not-condition': previewChip.isNot }"
      title="Enter で追加"
    >
      <span v-if="previewChip.isNot" class="not-prefix">!</span>{{ previewChip.label }}
    </span>

    <!-- SearchFilterDialogで選択した条件 -->
    <span
      v-for="(icon, index) in displayFilterIcons"
      :key="`icon-${index}`"
      class="filter-icon-item clickable"
      :class="icon.type"
      @click="$emit('remove-icon', icon)"
      :title="`クリックで削除: ${icon.label}`"
    >{{ icon.label }}</span>
    <button
      v-if="hasActiveFilters || filterChipsCount > 0"
      class="clear-filters-btn-top"
      @click="$emit('clear-all')"
      title="検索条件をクリア"
    >×</button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { FilterIcon } from '../../../utils/filter-icons'
import type { PreviewChip } from '../../../types/search-ui'

export default defineComponent({
  name: 'SearchFilterChips',
  props: {
    previewChip: {
      type: Object as PropType<PreviewChip | null>,
      default: null
    },
    displayFilterIcons: {
      type: Array as PropType<FilterIcon[]>,
      required: true
    },
    hasActiveFilters: {
      type: Boolean,
      required: true
    },
    filterChipsCount: {
      type: Number,
      required: true
    }
  },
  emits: ['remove-icon', 'clear-all']
})
</script>
