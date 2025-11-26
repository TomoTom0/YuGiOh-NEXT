<template>
  <div v-if="show" class="dialog-overlay" @click.self="onCancel">
    <div class="dialog-content">
      <h3 class="dialog-title">{{ title }}</h3>
      <p class="dialog-message">{{ message }}</p>
      <div class="dialog-buttons">
        <button
          v-for="(button, index) in buttons"
          :key="index"
          class="dialog-button"
          :class="button.class"
          @click="button.onClick"
        >
          {{ button.label }}
        </button>
      </div>
    </div>
  </div>
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
    }
  },
  emits: ['cancel'],
  setup(_props, { emit }) {
    const onCancel = () => {
      emit('cancel');
    };

    return {
      onCancel
    };
  }
});
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.dialog-content {
  background: var(--bg-primary, #fff);
  border-radius: 8px;
  padding: 24px;
  min-width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.dialog-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: bold;
  color: var(--text-primary, #000);
}

.dialog-message {
  margin: 0 0 20px 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary, #666);
}

.dialog-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.dialog-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-primary, #000);
  
  &:hover {
    opacity: 0.8;
  }
  
  &.primary {
    background: var(--accent-color, #007bff);
    color: #fff;
  }
  
  &.danger {
    background: #dc3545;
    color: #fff;
  }
  
  &.secondary {
    background: var(--bg-tertiary, #e0e0e0);
  }
}
</style>
