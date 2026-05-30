<template>
  <transition name="toast">
    <div v-if="visible" class="toast" :class="type">
      <div class="toast-content">
        <span class="toast-icon">{{ icon }}</span>
        <span class="toast-message">{{ message }}</span>
      </div>
    </div>
  </transition>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'Toast',
  props: {
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'info',
      validator: (value) => ['success', 'error', 'info', 'warning'].includes(value)
    },
    duration: {
      type: Number,
      default: 3000
    },
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const visible = ref(props.show)
    let timer = null

    const icon = computed(() => {
      switch (props.type) {
        case 'success': return '✓'
        case 'error': return '✕'
        case 'warning': return '⚠'
        default: return 'ℹ'
      }
    })

    watch(() => props.show, (newVal) => {
      visible.value = newVal
      if (newVal) {
        clearTimeout(timer)
        timer = setTimeout(() => {
          visible.value = false
          emit('close')
        }, props.duration)
      }
    })

    return {
      visible,
      icon
    }
  }
}
</script>

<style scoped lang="scss">
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  min-width: 280px;
  max-width: 400px;
  padding: 14px 18px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: var(--toast-bg);
  border-left: 4px solid;

  &.success {
    border-left-color: var(--color-success);
    background: var(--toast-success-bg);
  }

  &.error {
    border-left-color: var(--color-error);
    background: var(--toast-error-bg);
  }

  &.warning {
    border-left-color: var(--color-warning);
    background: var(--toast-warning-bg);
  }

  &.info {
    border-left-color: var(--color-info);
    background: var(--toast-info-bg);
  }
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toast-icon {
  font-size: 18px;
  font-weight: bold;
  flex-shrink: 0;

  .success & {
    color: var(--color-success);
  }

  .error & {
    color: var(--color-error);
  }

  .warning & {
    color: var(--color-warning);
  }

  .info & {
    color: var(--color-info);
  }
}

.toast-message {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
