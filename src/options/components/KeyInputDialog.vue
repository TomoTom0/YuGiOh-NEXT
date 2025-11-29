<template>
  <div v-if="isVisible" class="dialog-overlay" @click="$emit('cancel')">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="$emit('cancel')">×</button>
      </div>
      <div class="dialog-content">
        <!-- ショートカット入力欄 -->
        <div class="key-input-section">
          <p class="instruction">キーを押してください</p>
          <div class="key-display-box">
            <div class="key-display">
              <span v-if="capturedKey.ctrl" class="modifier-key">Ctrl</span>
              <span v-if="capturedKey.shift" class="modifier-key">Shift</span>
              <span v-if="capturedKey.alt" class="modifier-key">Alt</span>
              <span v-if="capturedKey.key" class="main-key">{{ capturedKey.key.toUpperCase() }}</span>
              <span v-else class="placeholder">入力待ち...</span>
            </div>
          </div>
        </div>

        <!-- 登録済みショートカット一覧 -->
        <div v-if="otherShortcuts.length > 0" class="existing-shortcuts">
          <p class="existing-label">登録済みショートカット</p>
          <div class="existing-list">
            <div
              v-for="(shortcut, index) in otherShortcuts"
              :key="index"
              class="existing-item"
            >
              <span class="existing-tag">{{ formatShortcut(shortcut) }}</span>
              <button class="delete-btn" @click="handleRemove(index)">削除</button>
            </div>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="secondary-button" @click="$emit('cancel')">Cancel</button>
        <button
          class="primary-button"
          :disabled="!capturedKey.key"
          @click="handleSave"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { KeyboardShortcut } from '../../types/settings';

const props = defineProps<{
  isVisible: boolean;
  title: string;
  shortcuts: KeyboardShortcut[];
}>();

const emit = defineEmits<{
  save: [shortcut: KeyboardShortcut];
  remove: [index: number];
  cancel: [];
}>();

const capturedKey = ref<KeyboardShortcut>({
  ctrl: false,
  shift: false,
  alt: false,
  key: ''
});

// 既存のショートカット（参考表示用）
const otherShortcuts = computed(() => props.shortcuts);

const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join('+');
};

const handleKeyDown = (event: KeyboardEvent) => {
  // ダイアログが表示されていない場合は無視
  if (!props.isVisible) {
    return;
  }

  // Ctrl, Shift, Alt以外のキーが押された場合のみキャプチャ
  if (event.key === 'Control' || event.key === 'Shift' || event.key === 'Alt' || event.key === 'Meta') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  capturedKey.value = {
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    key: event.key.toLowerCase()
  };
};

const handleSave = () => {
  if (capturedKey.value.key) {
    emit('save', { ...capturedKey.value });
    reset();
  }
};

const handleRemove = (index: number | string) => {
  const numIndex = typeof index === 'string' ? parseInt(index, 10) : index;
  emit('remove', numIndex);
};

const reset = () => {
  capturedKey.value = {
    ctrl: false,
    shift: false,
    alt: false,
    key: ''
  };
};

// ダイアログが表示されたらキャプチャ状態をリセット
watch(() => props.isVisible, (visible) => {
  if (visible) {
    reset();
  }
});

// キーボードイベントリスナーを設定
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.dialog {
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-primary);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
}

.dialog-content {
  padding: 24px 20px;
  overflow-y: auto;
  flex: 1;
}

.key-input-section {
  margin-bottom: 20px;
}

.instruction {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}

.key-display-box {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
}

.key-display {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background: var(--bg-primary);
  border-radius: 8px;
  min-height: 70px;
  border: 2px dashed var(--border-primary);
}

.modifier-key,
.main-key {
  display: inline-block;
  padding: 10px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.main-key {
  background: var(--button-bg);
  color: var(--button-text);
  border-color: var(--color-info);
  font-weight: 600;
}

.placeholder {
  color: var(--text-tertiary);
  font-size: 14px;
  font-style: italic;
}

.existing-shortcuts {
  margin-top: 20px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.existing-label {
  margin: 0 0 10px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.existing-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.existing-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
}

.existing-tag {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-info);
  font-family: 'Courier New', monospace;
}

.delete-btn {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-error-text);
  background: transparent;
  border: 1px solid var(--color-error);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--color-error);
    color: var(--button-text);
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-secondary);
}

.primary-button,
.secondary-button {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.primary-button {
  background: var(--button-bg);
  color: var(--button-text);

  &:not(:disabled):hover {
    background: var(--button-hover-bg);
  }
}

.secondary-button {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);

  &:hover {
    background: var(--bg-secondary);
  }
}
</style>
