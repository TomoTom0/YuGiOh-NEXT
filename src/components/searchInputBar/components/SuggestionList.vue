<template>
  <div
    v-if="suggestions.length > 0"
    class="suggestions-dropdown"
    :class="[
      { 'dropdown-above': isBottomPosition },
      variantClass
    ]"
  >
    <div
      v-for="(suggestion, index) in suggestions"
      :key="suggestion.value"
      class="suggestion-item"
      :class="{ selected: index === selectedIndex }"
      @click="$emit('select', suggestion)"
    >
      <span class="suggestion-value">{{ suggestion.value }}</span>
      <span class="suggestion-label">{{ suggestion.label }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue'

export interface Suggestion {
  value: string
  label: string
}

export default defineComponent({
  name: 'SuggestionList',
  props: {
    suggestions: {
      type: Array as PropType<Suggestion[]>,
      required: true
    },
    selectedIndex: {
      type: Number,
      default: -1
    },
    isBottomPosition: {
      type: Boolean,
      default: false
    },
    variant: {
      type: String as PropType<'command' | 'filter' | 'mydeck'>,
      default: 'filter'
    }
  },
  emits: ['select'],
  setup(props) {
    const variantClass = computed(() => {
      switch (props.variant) {
        case 'command':
          return 'command-suggestions'
        case 'mydeck':
          return 'mydeck-suggestions'
        default:
          return ''
      }
    })

    return {
      variantClass
    }
  }
})
</script>
