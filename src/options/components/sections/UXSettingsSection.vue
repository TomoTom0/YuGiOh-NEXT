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
          v-model="settingsStore.appSettings.ux.enableMouseOperations"
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

    <!-- 検索モードのデフォルト -->
    <div class="setting-group">
      <h3 class="setting-title">検索モードのデフォルト</h3>
      <p class="setting-desc">検索入力欄の検索対象の初期値</p>
      <div class="radio-group">
        <label
          class="radio-label"
          :class="{ active: settingsStore.appSettings.ux.defaultSearchMode === 'auto' }"
        >
          <input
            type="radio"
            value="auto"
            v-model="settingsStore.appSettings.ux.defaultSearchMode"
            @change="handleSearchModeChange"
          />
          <span class="radio-text">
            <strong>自動</strong>
            <span class="radio-desc">カード名+テキスト+Pテキストで検索</span>
          </span>
        </label>
        <label
          class="radio-label"
          :class="{ active: settingsStore.appSettings.ux.defaultSearchMode === 'name' }"
        >
          <input
            type="radio"
            value="name"
            v-model="settingsStore.appSettings.ux.defaultSearchMode"
            @change="handleSearchModeChange"
          />
          <span class="radio-text">
            <strong>カード名で検索</strong>
            <span class="radio-desc">カード名のみで検索</span>
          </span>
        </label>
        <label
          class="radio-label"
          :class="{ active: settingsStore.appSettings.ux.defaultSearchMode === 'text' }"
        >
          <input
            type="radio"
            value="text"
            v-model="settingsStore.appSettings.ux.defaultSearchMode"
            @change="handleSearchModeChange"
          />
          <span class="radio-text">
            <strong>テキストで検索</strong>
            <span class="radio-desc">カードテキストで検索</span>
          </span>
        </label>
        <label
          class="radio-label"
          :class="{ active: settingsStore.appSettings.ux.defaultSearchMode === 'pendulum' }"
        >
          <input
            type="radio"
            value="pendulum"
            v-model="settingsStore.appSettings.ux.defaultSearchMode"
            @change="handleSearchModeChange"
          />
          <span class="radio-text">
            <strong>ペンデュラムテキストで検索</strong>
            <span class="radio-desc">ペンデュラム効果で検索</span>
          </span>
        </label>
        <label
          class="radio-label"
          :class="{ active: settingsStore.appSettings.ux.defaultSearchMode === 'mydeck' }"
        >
          <input
            type="radio"
            value="mydeck"
            v-model="settingsStore.appSettings.ux.defaultSearchMode"
            @change="handleSearchModeChange"
          />
          <span class="radio-text">
            <strong>マイデッキから選択</strong>
            <span class="radio-desc">保存されているデッキから選択</span>
          </span>
        </label>
      </div>
    </div>

    <!-- デフォルトソート順序 -->
    <div class="setting-group">
      <h3 class="setting-title">デフォルトソート順序</h3>
      <p class="setting-desc">デッキ編集画面で最初に表示されるソート順序</p>
      <div class="radio-group">
        <label
          class="radio-label"
          :class="{ active: settingsStore.appSettings.defaultSortOrder === 'release_desc' }"
        >
          <input
            type="radio"
            value="release_desc"
            v-model="settingsStore.appSettings.defaultSortOrder"
            @change="handleSortOrderChange"
          />
          <span class="radio-text">
            <strong>新しい順（デフォルト）</strong>
            <span class="radio-desc">リリース日が新しいカードから表示</span>
          </span>
        </label>
        <label
          class="radio-label"
          :class="{ active: settingsStore.appSettings.defaultSortOrder === 'release_asc' }"
        >
          <input
            type="radio"
            value="release_asc"
            v-model="settingsStore.appSettings.defaultSortOrder"
            @change="handleSortOrderChange"
          />
          <span class="radio-text">
            <strong>古い順</strong>
            <span class="radio-desc">リリース日が古いカードから表示</span>
          </span>
        </label>
        <label
          class="radio-label"
          :class="{ active: settingsStore.appSettings.defaultSortOrder === 'name_asc' }"
        >
          <input
            type="radio"
            value="name_asc"
            v-model="settingsStore.appSettings.defaultSortOrder"
            @change="handleSortOrderChange"
          />
          <span class="radio-text">
            <strong>あいうえお順</strong>
            <span class="radio-desc">カード名の昇順</span>
          </span>
        </label>
      </div>
    </div>

    <!-- ソート機能 -->
    <div class="setting-group">
      <h3 class="setting-title">ソート機能</h3>
      <p class="setting-desc">デッキ編集画面のソート機能の有効/無効</p>

      <!-- カテゴリ優先 -->
      <label class="checkbox-label">
        <input
          type="checkbox"
          v-model="settingsStore.appSettings.enableCategoryPriority"
          @change="handleCategoryPriorityChange"
        />
        <span class="checkbox-text">
          <strong>カテゴリ優先を有効化</strong>
          <span class="checkbox-desc">
            デッキメタデータで設定したカテゴリに該当するカードを先頭に配置
          </span>
        </span>
      </label>

      <!-- 末尾配置 -->
      <label class="checkbox-label" style="margin-top: 12px;">
        <input
          type="checkbox"
          v-model="settingsStore.appSettings.enableTailPlacement"
          @change="handleTailPlacementChange"
        />
        <span class="checkbox-text">
          <strong>末尾配置を有効化</strong>
          <span class="checkbox-desc">
            末尾配置指定されたカードをデッキの最後に配置
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
                v-for="(shortcut, index) in settingsStore.appSettings.ux.keyboardShortcuts.globalSearch"
                :key="index"
                class="shortcut-tag clickable"
                @click="openKeyDialog('globalSearch', 'グローバル検索')"
              >
                {{ formatShortcut(shortcut) }}
              </span>
              <button
                v-if="settingsStore.appSettings.ux.keyboardShortcuts.globalSearch.length < 3"
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
                v-for="(shortcut, index) in settingsStore.appSettings.ux.keyboardShortcuts.undo"
                :key="index"
                class="shortcut-tag clickable"
                @click="openKeyDialog('undo', 'Undo')"
              >
                {{ formatShortcut(shortcut) }}
              </span>
              <button
                v-if="settingsStore.appSettings.ux.keyboardShortcuts.undo.length < 3"
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
                v-for="(shortcut, index) in settingsStore.appSettings.ux.keyboardShortcuts.redo"
                :key="index"
                class="shortcut-tag clickable"
                @click="openKeyDialog('redo', 'Redo')"
              >
                {{ formatShortcut(shortcut) }}
              </span>
              <button
                v-if="settingsStore.appSettings.ux.keyboardShortcuts.redo.length < 3"
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
import { useToastStore } from '../../../stores/toast-notification';
import KeyInputDialog from '../KeyInputDialog.vue';
import type { KeyboardShortcut } from '../../../types/settings';

const settingsStore = useSettingsStore();
const toastStore = useToastStore();

const dialogVisible = ref(false);
const dialogTitle = ref('');
const editingKey = ref<'globalSearch' | 'undo' | 'redo' | null>(null);

const currentShortcuts = computed(() => {
  if (!editingKey.value) return [];
  return settingsStore.appSettings.ux.keyboardShortcuts[editingKey.value];
});

onMounted(() => {
  // Settings loaded and ready to use
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

const handleSearchModeChange = () => {
  settingsStore.saveSettings();
  showSaveMessage('検索モードのデフォルトを変更しました');
};

const handleSortOrderChange = () => {
  settingsStore.saveSettings();
  showSaveMessage('デフォルトソート順序を変更しました');
};

const handleCategoryPriorityChange = () => {
  settingsStore.saveSettings();
  showSaveMessage('カテゴリ優先設定を変更しました');
};

const handleTailPlacementChange = () => {
  settingsStore.saveSettings();
  showSaveMessage('末尾配置設定を変更しました');
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
  toastStore.showToast(message, 'info');
};
</script>

<style scoped lang="scss">
.ux-settings-section {
  max-width: 800px;
}

.main-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0 0 32px 0;
}

.setting-group {
  margin-bottom: 32px;
  padding: 24px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
}

.setting-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.setting-desc {
  font-size: 13px;
  color: var(--text-secondary);
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
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: var(--bg-primary);

  &:hover {
    border-color: var(--color-info);
    background-color: var(--color-info-bg);
  }

  &.active {
    border-color: var(--color-info);
    background-color: var(--color-info-bg);
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
      color: var(--text-primary);
    }

    .radio-desc {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.4;
    }
  }
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  padding: 14px 16px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: var(--bg-primary);

  &:hover {
    border-color: var(--color-info);
    background-color: var(--color-info-bg);
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
      color: var(--text-primary);
    }

    .checkbox-desc {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
  }
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
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
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
  color: var(--text-primary);
}

.shortcut-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.shortcut-tag {
  display: inline-block;
  padding: 4px 10px;
  background: var(--color-info-bg);
  color: var(--color-info);
  border: 1px solid var(--color-info);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Courier New', monospace;

  &.clickable {
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--button-bg);
      color: var(--button-text);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }
  }
}

.add-button {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-primary);
  border: 1px dashed var(--text-tertiary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: var(--color-info);
    border-color: var(--color-info);
    background: var(--color-info-bg);
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
