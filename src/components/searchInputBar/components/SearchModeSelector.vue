<template>
  <div class="search-mode-selector">
    <button class="search-mode-btn" @click.stop="toggleDropdown">
      <span class="mode-text">{{ modeLabel }}</span>
    </button>
    <div v-if="isOpen" class="mode-dropdown-overlay" @click="closeDropdown"></div>
    <Transition name="dropdown">
      <div v-if="isOpen" class="mode-dropdown" :class="{ 'dropdown-above': isBottomPosition }">
        <div class="mode-option" @click="selectMode('auto')">自動</div>
        <div class="mode-option" @click="selectMode('name')">カード名で検索</div>
        <div class="mode-option" @click="selectMode('text')">テキストで検索</div>
        <div class="mode-option" @click="selectMode('pendulum')">ペンデュラムテキストで検索</div>
        <div class="mode-option" @click="selectMode('mydeck')">マイデッキから選択</div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import type { SearchMode } from '../../../types/settings'

export default defineComponent({
  name: 'SearchModeSelector',
  props: {
    modelValue: {
      type: String as () => SearchMode,
      required: true
    },
    isBottomPosition: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const isOpen = ref(false)

    const modeLabel = computed(() => {
      switch (props.modelValue) {
        case 'auto': return 'auto'
        case 'name': return 'name'
        case 'text': return 'text'
        case 'pendulum': return 'pend'
        case 'mydeck': return 'mydeck'
        default: return 'auto'
      }
    })

    const toggleDropdown = () => {
      isOpen.value = !isOpen.value
    }

    const closeDropdown = () => {
      isOpen.value = false
    }

    const selectMode = (mode: SearchMode) => {
      emit('update:modelValue', mode)
      closeDropdown()
    }

    return {
      isOpen,
      modeLabel,
      toggleDropdown,
      closeDropdown,
      selectMode
    }
  }
})
</script>
