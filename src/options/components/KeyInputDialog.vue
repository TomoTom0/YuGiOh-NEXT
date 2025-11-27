<template>
  <div v-if="isVisible" class="dialog-overlay" @click="$emit('cancel')">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="$emit('cancel')">×</button>
      </div>
      <div class="dialog-content">
        <!-- 既存のショートカット一覧 -->
        <div v-if="shortcuts.length > 0" class="existing-shortcuts">
          <p class="section-label">登録済みショートカット</p>
          <div class="shortcut-list">
            <div v-for="(shortcut, index) in shortcuts" :key="index" class="shortcut-item">
              <span class="shortcut-display">{{ formatShortcut(shortcut) }}</span>
              <button class="delete-btn" @click="handleDelete(index)">削除</button>
            </div>
          </div>
        </div>
        <div v-else class="no-shortcuts">
          <p>ショートカットが登録されていません</p>
        </div>

        <!-- 新規追加セクション -->
        <div v-if="shortcuts.length < 3" class="add-section">
          <p class="section-label">新しいショートカットを追加（{{ shortcuts.length }}/3）</p>
          <div class="key-capture">
            <p class="instruction">キーを押してください</p>
            <div class="key-display">
              <span v-if="capturedKey.ctrl" class="modifier-key">Ctrl</span>
              <span v-if="capturedKey.shift" class="modifier-key">Shift</span>
              <span v-if="capturedKey.alt" class="modifier-key">Alt</span>
              <span v-if="capturedKey.key" class="main-key">{{ capturedKey.key.toUpperCase() }}</span>
              <span v-else class="placeholder">入力待ち...</span>
            </div>
          </div>
        </div>
        <div v-else class="max-reached">
          <p>最大3つまで登録できます</p>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="secondary-button" @click="$emit('cancel')">閉じる</button>
        <button
          v-if="shortcuts.length < 3"
          class="primary-button"
          :disabled="!capturedKey.key"
          @click="handleAdd"
        >
          追加
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { KeyboardShortcut } from '../../types/settings';

const props = defineProps<{
  isVisible: boolean;
  title: string;
  shortcuts: KeyboardShortcut[];
}>();

const emit = defineEmits<{
  add: [shortcut: KeyboardShortcut];
  remove: [index: number];
  cancel: [];
}>();

const capturedKey = ref<KeyboardShortcut>({
  ctrl: false,
  shift: false,
  alt: false,
  key: ''
});

const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join('+');
};

const handleKeyDown = (event: KeyboardEvent) => {
  // ダイアログが表示されていない、または最大数に達している場合は無視
  if (!props.isVisible || props.shortcuts.length >= 3) {
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

const handleAdd = () => {
  if (capturedKey.value.key && props.shortcuts.length < 3) {
    emit('add', { ...capturedKey.value });
    reset();
  }
};

const handleDelete = (index: number | string) => {
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
  background: #ffffff;
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
  border-bottom: 1px solid #e0e0e0;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #202124;
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #5f6368;
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
    background: #f1f3f4;
    color: #202124;
  }
}

.dialog-content {
  padding: 24px 20px;
  overflow-y: auto;
  flex: 1;
}

.section-label {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #5f6368;
}

.existing-shortcuts {
  margin-bottom: 24px;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.shortcut-display {
  font-size: 13px;
  font-weight: 500;
  color: #202124;
  font-family: 'Courier New', monospace;
}

.delete-btn {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #d93025;
  background: transparent;
  border: 1px solid #d93025;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #d93025;
    color: white;
  }
}

.no-shortcuts {
  padding: 20px;
  text-align: center;
  color: #9aa0a6;
  font-size: 13px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 24px;

  p {
    margin: 0;
  }
}

.add-section {
  .key-capture {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
  }
}

.max-reached {
  padding: 16px;
  text-align: center;
  color: #9aa0a6;
  font-size: 13px;
  background: #f8f9fa;
  border-radius: 4px;

  p {
    margin: 0;
  }
}

.instruction {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #5f6368;
  text-align: center;
}

.key-display {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  min-height: 60px;
  border: 2px dashed #dadce0;
}

.modifier-key,
.main-key {
  display: inline-block;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #202124;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.main-key {
  background: #1a73e8;
  color: #ffffff;
  border-color: #1a73e8;
  font-weight: 600;
}

.placeholder {
  color: #9aa0a6;
  font-size: 14px;
  font-style: italic;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
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
  background: #1a73e8;
  color: #ffffff;

  &:not(:disabled):hover {
    background: #1765cc;
  }
}

.secondary-button {
  background: transparent;
  color: #5f6368;
  border: 1px solid #dadce0;

  &:hover {
    background: #f1f3f4;
  }
}
</style>
