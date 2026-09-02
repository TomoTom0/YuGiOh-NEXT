<template>
  <BaseDialog :is-visible="show" :theme="theme" @close="onCancel">
    <div class="dialog-content">
      <h3 class="dialog-title">{{ title }}</h3>
      <p class="dialog-message">{{ message }}</p>
      <div class="dialog-footer">
        <button
          v-for="(button, index) in buttons"
          :key="index"
          class="btn"
          :class="getButtonClass(button.class)"
          :disabled="loadingIndex !== null"
          @click="handleClick(button, index)"
        >
          <SpinnerIcon v-if="loadingIndex === index" class="btn-spinner" />
          <span v-else>{{ button.label }}</span>
        </button>
      </div>
    </div>
  </BaseDialog>
</template>

<script lang="ts">
import { defineComponent, ref, type PropType } from 'vue';
import BaseDialog from './BaseDialog.vue';
import SpinnerIcon from './icons/SpinnerIcon.vue';

interface DialogButton {
  label: string;
  class?: string;
  onClick: () => void | Promise<void>;
}

export default defineComponent({
  name: 'ConfirmDialog',
  components: {
    BaseDialog,
    SpinnerIcon
  },
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

    // onClickが非同期処理の場合のみ、完了までボタンにローディング表示を出す
    // （fire-and-forgetなonClick(戻り値がvoid)は従来通り即座に見た目上は何もしない）
    const loadingIndex = ref<number | null>(null);

    const handleClick = async (button: DialogButton, index: number) => {
      if (loadingIndex.value !== null) return;
      const result = button.onClick();
      if (result instanceof Promise) {
        loadingIndex.value = index;
        try {
          await result;
        } finally {
          loadingIndex.value = null;
        }
      }
    };

    return {
      onCancel,
      getButtonClass,
      loadingIndex,
      handleClick
    };
  }
});
</script>

<style scoped lang="scss">
@use '../styles/common.scss' as *;

.dialog-content {
  background: var(--dialog-bg, #ffffff);
  border: 1px solid var(--dialog-border, #e0e0e0);
  border-radius: 8px;
  box-shadow: var(--shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.2));
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-sizing: border-box;
  overflow-y: auto;

  .dialog-footer {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
  }
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

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
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

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
}

.btn-spinner {
  width: 16px;
  height: 16px;
}

.btn-primary {
  background: var(--button-bg, #4a9eff);
  color: var(--button-text, #ffffff);

  &:hover {
    background: var(--button-hover-bg, #3a8eef);
  }
}

.btn-secondary {
  background: var(--color-info-bg, #e3f2fd);
  color: var(--text-primary, #333);
  border: 1px solid var(--color-info-border, #64b5f6);

  &:hover {
    background: var(--color-info-hover-bg, #bbdefb);
  }
}

.btn-danger {
  background: var(--color-error, #f44336);
  color: var(--button-text, #ffffff);

  &:hover {
    opacity: 0.85;
  }
}
</style>
