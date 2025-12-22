<template>
  <Teleport to="body">

  <div v-if="show" class="ygo-next dialog-overlay" :data-ygo-next-theme="theme" @click.self="onCancel">
    <div class="dialog-content" @click.stop>
      <h3 class="dialog-title">{{ title }}</h3>
      <p class="dialog-message">{{ message }}</p>
      <div class="dialog-footer">
        <button
          v-for="(button, index) in buttons"
          :key="index"
          class="btn"
          :class="getButtonClass(button.class)"
          @click="button.onClick"
        >
          {{ button.label }}
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

interface DialogButton {
  label: string;
  class?: string;
  onClick: () => void;
}

export default defineComponent({
  name: 'ConfirmDialog',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    buttons: {
      type: Array as PropType<DialogButton[]>,
      required: true
    },
    theme: {
      type: String as PropType<'light' | 'dark'>,
      default: 'light'
    }
  },
  emits: ['cancel'],
  setup(_props, { emit }) {
    const onCancel = () => {
      emit('cancel');
    };

    const getButtonClass = (customClass?: string) => {
      if (!customClass) return 'btn-secondary';
      if (customClass === 'primary') return 'btn-primary';
      if (customClass === 'danger') return 'btn-danger';
      if (customClass === 'secondary') return 'btn-secondary';
      return customClass;
    };

    return {
      onCancel,
      getButtonClass
    };
  }
});
</script>

<style scoped lang="scss">
@use '../styles/common.scss' as *;

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--dialog-overlay-bg, rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog-content {
  background: var(--dialog-bg, #ffffff);
  border: 1px solid var(--dialog-border, #e0e0e0);
  border-radius: 8px;
  box-shadow: var(--shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.2));
  padding: 24px;
  min-width: 400px;
  max-width: 520px;
}

.dialog-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-message {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: translateY(1px);
  }
}

.btn-primary {
  background: var(--button-bg);
  color: var(--button-text);

  &:hover {
    background: var(--button-hover-bg);
  }
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);

  &:hover {
    background: var(--bg-tertiary);
  }
}

.btn-danger {
  background: var(--color-error);
  color: var(--button-text);

  &:hover {
    opacity: 0.85;
  }
}
</style>
