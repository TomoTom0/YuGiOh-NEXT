<template>
  <div class="toast-container">
    <transition-group name="toast" tag="div">
      <div
        v-for="notification in toastStore.toasts"
        :key="notification.id"
        class="toast"
        :class="notification.type"
      >
        <div class="toast-content">
          <span class="toast-icon">{{ getIcon(notification.type) }}</span>
          <span class="toast-message">{{ notification.message }}</span>
          <button class="toast-close" @click="toastStore.removeToast(notification.id)">×</button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '@/stores/toast-notification'

const toastStore = useToastStore()

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
  z-index: 999999;
  pointer-events: none;

  > div {
    pointer-events: auto;
  }
}

.toast {
  min-width: 280px;
  max-width: 400px;
  padding: 14px 18px;
  margin-bottom: 12px;
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
  flex: 1;
}

.toast-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  flex-shrink: 0;

  &:hover {
    color: var(--text-primary);
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
