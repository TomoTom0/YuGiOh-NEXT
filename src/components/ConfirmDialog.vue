<template>
  <div v-if="show" class="dialog-overlay" @click.self="onCancel">
    <div class="dialog-content">
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

.dialog-content {
  padding: 24px;
  min-width: 400px;
}

.dialog-title {
  margin-bottom: 16px;
}

.dialog-message {
  margin: 0 0 20px 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
}
</style>
