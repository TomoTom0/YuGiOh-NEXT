<template>
  <div class="toast-container">
    <transition-group name="toast" tag="div">
      <div
        v-for="notification in toastStore.toasts"
        :key="notification.id"
        class="toast"
        :class="notification.type"
      >
        <div class="toast-header">
          <span class="toast-icon">{{ getIcon(notification.type) }}</span>
          <span class="toast-title">{{ notification.title || notification.message }}</span>
          <button class="toast-close" @click="toastStore.removeToast(notification.id)">×</button>
        </div>
        <div v-if="notification.body" class="toast-body">
          <div v-for="(line, index) in notification.body.split('\n')" :key="index" class="toast-body-line">
            {{ line }}
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useToastStore } from '@/stores/toast-notification'

const toastStore = useToastStore()

watch(() => toastStore.toasts, (newToasts) => {
  console.debug('[ToastContainer] Toasts changed:', newToasts.length, newToasts)
}, { deep: true })

const getIcon = (type: string): string => {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'warning': return '⚠'
    default: return 'ℹ'
  }
}
</script>

<style scoped lang="scss">
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  pointer-events: none;

  > div {
    pointer-events: auto;
  }
}

.toast {
  min-width: 280px;
  max-width: 380px;
  margin-bottom: 10px;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  background: var(--toast-bg);
  border-left: 4px solid;
  overflow: hidden;

  &.success {
    border-left-color: var(--color-success);

    .toast-header {
      background: var(--color-success-gradient);
    }
  }

  &.error {
    border-left-color: var(--color-error);

    .toast-header {
      background: var(--color-error-gradient);
    }
  }

  &.warning {
    border-left-color: var(--color-warning);

    .toast-header {
      background: var(--color-warning-gradient);
    }
  }

  &.info {
    border-left-color: var(--color-info);

    .toast-header {
      background: var(--color-info-gradient);
    }
  }
}

.toast-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: #ffffff;
  font-weight: 500;
}

.toast-icon {
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  flex: 1;
}

.toast-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #ffffff;
  padding: 0;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 0.8;
  }
}

.toast-body {
  padding: 8px 12px 8px 32px;
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.5;
  background: var(--toast-bg);
  border-top: 1px solid rgba(255, 255, 255, 0.2);

  .toast-body-line {
    padding: 2px 0;
    word-break: break-word;

    &:not(:last-child) {
      margin-bottom: 2px;
      padding-bottom: 2px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
  }
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
