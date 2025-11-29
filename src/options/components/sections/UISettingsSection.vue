<template>
  <div class="ui-settings-section">
    <h2 class="main-title">UI設定</h2>
    <p class="description">デッキ編集画面の表示設定</p>

    <!-- カラーテーマ -->
    <div class="setting-group">
      <h3 class="setting-title">カラーテーマ</h3>
      <div class="theme-buttons">
        <button
          v-for="themeOption in themeOptions"
          :key="themeOption.value"
          class="theme-button"
          :class="{ active: settingsStore.appSettings.theme === themeOption.value }"
          @click="handleThemeChange(themeOption.value)"
        >
          {{ themeOption.label }}
        </button>
      </div>
    </div>

    <!-- 画像サイズ -->
    <div class="setting-group">
      <h3 class="setting-title">表示する画像の大きさ</h3>
      <div class="preset-grid">
        <button
          v-for="preset in sizePresets"
          :key="preset.value"
          class="preset-button"
          :class="{ active: currentPreset === preset.value }"
          @click="handlePresetChange(preset.value)"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <!-- 検索入力欄の位置 -->
    <div class="setting-group">
      <h3 class="setting-title">検索入力欄の位置</h3>
      <div class="position-grid">
        <div class="grid-spacer"></div>
        <button
          class="position-button"
          :class="{ active: settingsStore.appSettings.searchInputPosition === 'right-top' }"
          @click="handlePositionChange('right-top')"
        >
          右上（デフォルト）
        </button>
        <button
          class="position-button"
          :class="{ active: settingsStore.appSettings.searchInputPosition === 'default' }"
          @click="handlePositionChange('default')"
        >
          左下
        </button>
        <button
          class="position-button"
          :class="{ active: settingsStore.appSettings.searchInputPosition === 'right-bottom' }"
          @click="handlePositionChange('right-bottom')"
        >
          右下
        </button>
      </div>
    </div>

    <!-- side/extraセクションの配置 -->
    <div class="setting-group">
      <h3 class="setting-title">Side/Extraセクションの配置</h3>
      <div class="layout-buttons">
        <button
          class="layout-button horizontal"
          :class="{ active: settingsStore.appSettings.middleDecksLayout === 'horizontal' }"
          @click="handleLayoutChange('horizontal')"
        >
          <span class="layout-label">横並び（デフォルト）</span>
          <div class="layout-preview-vertical">
            <div class="preview-box">Main</div>
            <div class="preview-row">
              <div class="preview-box highlight">Extra</div>
              <div class="preview-box highlight">Side</div>
            </div>
            <div class="preview-box">Trash</div>
          </div>
        </button>
        <button
          class="layout-button vertical"
          :class="{ active: settingsStore.appSettings.middleDecksLayout === 'vertical' }"
          @click="handleLayoutChange('vertical')"
        >
          <span class="layout-label">縦並び</span>
          <div class="layout-preview-vertical">
            <div class="preview-box">Main</div>
            <div class="preview-box highlight">Extra</div>
            <div class="preview-box highlight">Side</div>
            <div class="preview-box">Trash</div>
          </div>
        </button>
      </div>
    </div>

    <div v-if="saveMessage" class="save-message">
      {{ saveMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettingsStore } from '../../../stores/settings';
import type { SearchInputPosition, MiddleDecksLayout, Theme } from '../../../types/settings';

const settingsStore = useSettingsStore();
const saveMessage = ref('');

type SizePreset = 's' | 'm' | 'l' | 'xl';

const themeOptions = [
  { value: 'light' as Theme, label: 'Light' },
  { value: 'dark' as Theme, label: 'Dark' },
  { value: 'system' as Theme, label: 'System' }
];

const sizePresets = ref([
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
  { value: 'xl', label: 'XL' }
] as const);

const currentPreset = computed<SizePreset | null>(() => {
  return settingsStore.getCurrentPreset();
});

const handlePresetChange = (preset: SizePreset) => {
  settingsStore.setCardSizePreset(preset);
  showSaveMessage(`カードサイズを「${preset.toUpperCase()}」に変更しました`);
};

const handlePositionChange = (position: SearchInputPosition) => {
  settingsStore.appSettings.searchInputPosition = position;
  settingsStore.setSearchInputPosition(position);
  showSaveMessage('検索入力欄の位置を変更しました');
};

const handleLayoutChange = (layout: MiddleDecksLayout) => {
  settingsStore.appSettings.middleDecksLayout = layout;
  settingsStore.setMiddleDecksLayout(layout);
  showSaveMessage('デッキレイアウトを変更しました');
};

const handleThemeChange = (theme: Theme) => {
  settingsStore.setTheme(theme);
  showSaveMessage(`テーマを「${theme}」に変更しました`);
};

const showSaveMessage = (message: string) => {
  saveMessage.value = message;
  setTimeout(() => {
    saveMessage.value = '';
  }, 3000);
};
</script>

<style scoped lang="scss">
.ui-settings-section {
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
  margin: 0 0 16px 0;
}

.theme-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 500px;
}

.theme-button {
  padding: 16px 20px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    border-color: var(--color-info);
    background: var(--color-info-bg);
    color: var(--color-info);
  }
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.preset-button {
  padding: 12px 20px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    border-color: var(--color-info);
    background: var(--color-info-bg);
    color: var(--color-info);
  }
}

.position-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  max-width: 400px;
}

.grid-spacer {
  /* 左上は空ける */
}

.position-button {
  padding: 16px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    border-color: var(--color-info);
    background: var(--color-info-bg);
    color: var(--color-info);
    font-weight: 600;
  }
}

.layout-buttons {
  display: flex;
  gap: 16px;
}

.layout-button {
  flex: 1;
  padding: 16px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    border-color: var(--color-info);
    background: var(--color-info-bg);

    .layout-label {
      color: var(--color-info);
      font-weight: 600;
    }
  }
}

.layout-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.layout-preview-vertical {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-row {
  display: flex;
  gap: 6px;
}

.preview-box {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 3px;
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
  min-width: 40px;

  &.highlight {
    background: var(--color-info-bg);
    border: 2px solid var(--color-info);
    color: var(--color-info);
    font-weight: 600;
  }
}

.save-message {
  margin-top: 16px;
  padding: 12px 16px;
  background-color: var(--color-success-bg);
  color: var(--color-success);
  border-radius: 4px;
  font-size: 14px;
  animation: fadeIn 0.3s ease;
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
