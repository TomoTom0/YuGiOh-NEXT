<template>
  <div class="ux-settings-section">
    <h2 class="main-title">UX設定</h2>
    <p class="description">デッキ編集画面の操作性に関する設定</p>

    <!-- デッキ枚数制限 -->
    <div class="setting-group">
      <h3 class="setting-title">カード枚数制限</h3>
      <p class="setting-desc">デッキに追加できるカードの枚数制限</p>
      <div class="radio-group">
        <label
          class="radio-label"
          :class="{ active: settingsStore.cardLimitMode === 'all-3' }"
        >
          <input
            type="radio"
            value="all-3"
            v-model="settingsStore.cardLimitMode"
            @change="handleDeckLimitChange"
          />
          <span class="radio-text">
            <strong>全カード3枚まで（デフォルト）</strong>
            <span class="radio-desc">すべてのカードを3枚まで追加可能</span>
          </span>
        </label>
        <label
          class="radio-label"
          :class="{ active: settingsStore.cardLimitMode === 'limit-reg' }"
        >
          <input
            type="radio"
            value="limit-reg"
            v-model="settingsStore.cardLimitMode"
            @change="handleDeckLimitChange"
          />
          <span class="radio-text">
            <strong>禁止制限リストに従う</strong>
            <span class="radio-desc">禁止・制限・準制限カードの枚数制限を適用</span>
          </span>
        </label>
      </div>
    </div>

    <!-- 未保存時の警告 -->
    <div class="setting-group">
      <h3 class="setting-title">未保存時の警告</h3>
      <p class="setting-desc">デッキを保存せずにページを離れる際の警告</p>
      <div class="radio-group">
        <label
          class="radio-label"
          :class="{ active: settingsStore.appSettings.unsavedWarning === 'always' }"
        >
          <input
            type="radio"
            value="always"
            v-model="settingsStore.appSettings.unsavedWarning"
            @change="handleWarningChange"
          />
          <span class="radio-text">
            <strong>常に警告（デフォルト）</strong>
            <span class="radio-desc">変更があれば警告</span>
          </span>
        </label>
        <label
          class="radio-label"
          :class="{ active: settingsStore.appSettings.unsavedWarning === 'without-sorting-only' }"
        >
          <input
            type="radio"
            value="without-sorting-only"
            v-model="settingsStore.appSettings.unsavedWarning"
            @change="handleWarningChange"
          />
          <span class="radio-text">
            <strong>ソート順のみ除外</strong>
            <span class="radio-desc">ソート順変更は警告なし</span>
          </span>
        </label>
        <label
          class="radio-label"
          :class="{ active: settingsStore.appSettings.unsavedWarning === 'never' }"
        >
          <input
            type="radio"
            value="never"
            v-model="settingsStore.appSettings.unsavedWarning"
            @change="handleWarningChange"
          />
          <span class="radio-text">
            <strong>警告しない</strong>
            <span class="radio-desc">未保存でも警告なし</span>
          </span>
        </label>
      </div>
    </div>

    <!-- マウス操作 -->
    <div class="setting-group">
      <h3 class="setting-title">高度なマウス操作</h3>
      <p class="setting-desc">右クリック・中クリックでのカード操作</p>
      <label class="checkbox-label">
        <input
          type="checkbox"
          v-model="settingsStore.appSettings.enableMouseOperations"
          @change="handleMouseOpsChange"
        />
        <span class="checkbox-text">
          <strong>右クリックでカード移動、中クリックでカード追加を有効化</strong>
          <span class="checkbox-desc">
            右クリック: Main/Extra/Side間でカードを移動<br />
            中クリック: デッキにカードを追加
          </span>
        </span>
      </label>
    </div>

    <!-- キーボードショートカット -->
    <div v-if="settingsStore.isLoaded" class="setting-group">
      <h3 class="setting-title">キーボードショートカット</h3>
      <p class="setting-desc">各機能のキーボードショートカットを設定（各機能に最大3つまで登録可能）</p>
      <div class="shortcut-list">
        <div class="shortcut-item">
          <div class="shortcut-info">
            <span class="shortcut-label">グローバル検索</span>
            <div class="shortcut-tags">
              <span
                v-for="(shortcut, index) in settingsStore.appSettings.keyboardShortcuts.globalSearch"
                :key="index"
                class="shortcut-tag clickable"
                @click="openKeyDialog('globalSearch', 'グローバル検索')"
              >
                {{ formatShortcut(shortcut) }}
              </span>
              <button
                v-if="settingsStore.appSettings.keyboardShortcuts.globalSearch.length < 3"
                class="add-button"
                @click="openKeyDialog('globalSearch', 'グローバル検索')"
              >
                + 追加
              </button>
            </div>
          </div>
        </div>
        <div class="shortcut-item">
          <div class="shortcut-info">
            <span class="shortcut-label">Undo</span>
            <div class="shortcut-tags">
              <span
                v-for="(shortcut, index) in settingsStore.appSettings.keyboardShortcuts.undo"
                :key="index"
                class="shortcut-tag clickable"
                @click="openKeyDialog('undo', 'Undo')"
              >
                {{ formatShortcut(shortcut) }}
              </span>
              <button
                v-if="settingsStore.appSettings.keyboardShortcuts.undo.length < 3"
                class="add-button"
                @click="openKeyDialog('undo', 'Undo')"
              >
                + 追加
              </button>
            </div>
          </div>
        </div>
        <div class="shortcut-item">
          <div class="shortcut-info">
            <span class="shortcut-label">Redo</span>
            <div class="shortcut-tags">
              <span
                v-for="(shortcut, index) in settingsStore.appSettings.keyboardShortcuts.redo"
                :key="index"
                class="shortcut-tag clickable"
                @click="openKeyDialog('redo', 'Redo')"
              >
                {{ formatShortcut(shortcut) }}
              </span>
              <button
                v-if="settingsStore.appSettings.keyboardShortcuts.redo.length < 3"
                class="add-button"
                @click="openKeyDialog('redo', 'Redo')"
              >
                + 追加
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="saveMessage" class="save-message">
      {{ saveMessage }}
    </div>

    <KeyInputDialog
      :isVisible="dialogVisible"
      :title="dialogTitle"
      :shortcuts="currentShortcuts"
      @save="handleSaveShortcut"
      @remove="handleRemoveShortcut"
      @cancel="dialogVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSettingsStore } from '../../../stores/settings';
import KeyInputDialog from '../KeyInputDialog.vue';
import type { KeyboardShortcut } from '../../../types/settings';

const settingsStore = useSettingsStore();
const saveMessage = ref('');

const dialogVisible = ref(false);
const dialogTitle = ref('');
const editingKey = ref<'globalSearch' | 'undo' | 'redo' | null>(null);

const currentShortcuts = computed(() => {
  if (!editingKey.value) return [];
  return settingsStore.appSettings.keyboardShortcuts[editingKey.value];
});

onMounted(() => {
  console.log('[UXSettings] Settings loaded:', settingsStore.isLoaded);
  console.log('[UXSettings] Keyboard shortcuts:', settingsStore.appSettings.keyboardShortcuts);
  console.log('[UXSettings] globalSearch length:', settingsStore.appSettings.keyboardShortcuts.globalSearch?.length);
});

const handleDeckLimitChange = () => {
  settingsStore.saveSettings();
  showSaveMessage('デッキ枚数制限を変更しました');
};

const handleWarningChange = () => {
  settingsStore.saveSettings();
  showSaveMessage('未保存時の警告設定を変更しました');
};

const handleMouseOpsChange = () => {
  settingsStore.saveSettings();
  showSaveMessage('マウス操作設定を変更しました');
};

const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join('+');
};

const openKeyDialog = (key: 'globalSearch' | 'undo' | 'redo', title: string) => {
  editingKey.value = key;
  dialogTitle.value = title;
  dialogVisible.value = true;
};

const handleSaveShortcut = (shortcut: KeyboardShortcut) => {
  if (editingKey.value) {
    settingsStore.addKeyboardShortcut(editingKey.value, shortcut);
    dialogVisible.value = false;
    showSaveMessage('ショートカットを追加しました');
  }
};

const handleRemoveShortcut = (index: number) => {
  if (editingKey.value) {
    settingsStore.removeKeyboardShortcut(editingKey.value, index);
    showSaveMessage('ショートカットを削除しました');
  }
};

const showSaveMessage = (message: string) => {
  saveMessage.value = message;
  setTimeout(() => {
    saveMessage.value = '';
  }, 3000);
};
</script>

<style scoped lang="scss">
.ux-settings-section {
  max-width: 800px;
}

.main-title {
  font-size: 24px;
  font-weight: 700;
  color: #202124;
  margin: 0 0 16px 0;
}

.description {
  font-size: 15px;
  color: #555;
  line-height: 1.7;
  margin: 0 0 32px 0;
}

.setting-group {
  margin-bottom: 32px;
  padding: 24px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.setting-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.setting-desc {
  font-size: 13px;
  color: #666;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-label {
  display: flex;
  align-items: flex-start;
  padding: 14px 16px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: white;

  &:hover {
    border-color: #008cff;
    background-color: #f0f7ff;
  }

  &.active {
    border-color: #008cff;
    background-color: #f0f7ff;
  }

  input[type="radio"] {
    margin-top: 3px;
    margin-right: 10px;
    cursor: pointer;
  }

  .radio-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    strong {
      font-size: 14px;
      color: #333;
    }

    .radio-desc {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }
  }
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  padding: 14px 16px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: white;

  &:hover {
    border-color: #008cff;
    background-color: #f0f7ff;
  }

  input[type="checkbox"] {
    margin-top: 3px;
    margin-right: 10px;
    cursor: pointer;
  }

  .checkbox-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;

    strong {
      font-size: 14px;
      color: #333;
    }

    .checkbox-desc {
      font-size: 12px;
      color: #666;
      line-height: 1.5;
    }
  }
}

.save-message {
  margin-top: 16px;
  padding: 12px 16px;
  background-color: #d1f4e0;
  color: #0f5132;
  border-radius: 4px;
  font-size: 14px;
  animation: fadeIn 0.3s ease;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
}

.shortcut-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.shortcut-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.shortcut-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.shortcut-tag {
  display: inline-block;
  padding: 4px 10px;
  background: #e8f0fe;
  color: #1a73e8;
  border: 1px solid #1a73e8;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Courier New', monospace;

  &.clickable {
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #1a73e8;
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }
  }
}

.add-button {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #5f6368;
  background: #ffffff;
  border: 1px dashed #9aa0a6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #1a73e8;
    border-color: #1a73e8;
    background: #f0f7ff;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
