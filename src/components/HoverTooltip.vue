<template>
  <div
    class="btn-tooltip-wrapper"
    ref="wrapperRef"
    @mouseenter="visible = true"
    @mouseleave="visible = false"
  >
    <slot />
    <Teleport to="body">
      <Transition name="tooltip-fade">
        <div
          v-if="visible && text"
          class="command-tooltip-fixed"
          :class="tooltipClass"
          :style="style"
        >
          {{ text }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'

/**
 * ボタン等をhoverした際に、独自のtooltip（Teleport to body）を表示する共通ラッパー。
 * ブラウザネイティブのtitle属性の代替として使用する。
 * position: fixedでbodyへteleportするため、祖先のoverflow:hiddenの影響を受けない。
 */
export default defineComponent({
  name: 'HoverTooltip',
  props: {
    text: {
      type: String,
      default: ''
    },
    tooltipClass: {
      type: String,
      default: ''
    }
  },
  setup() {
    const visible = ref(false)
    const wrapperRef = ref<HTMLElement | null>(null)

    const style = computed(() => {
      if (!wrapperRef.value) return {}
      const rect = wrapperRef.value.getBoundingClientRect()
      return {
        position: 'fixed' as const,
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top - 4}px`,
        transform: 'translate(-50%, -100%)'
      }
    })

    return { visible, wrapperRef, style }
  }
})
</script>

<style scoped lang="scss">
.btn-tooltip-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.command-tooltip-fixed {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 10000;
  pointer-events: none;
  line-height: 1.4;
  min-height: 20px;

  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);

  &.type-add {
    background: #2e7d32;
    color: #fff;
    border-color: #4caf50;
  }

  &.type-remove {
    background: #c62828;
    color: #fff;
    border-color: #f44336;
  }

  &.type-move {
    background: #616161;
    color: #fff;
    border-color: #9e9e9e;
  }

  &.type-reorder {
    background: #ef6c00;
    color: #fff;
    border-color: #ff9800;
  }
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
