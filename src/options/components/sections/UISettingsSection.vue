<template>
  <div class="ui-settings-section">
    <h2 class="main-title">UI設定</h2>
    <p class="description">デッキ編集画面の表示設定</p>

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
import type { SearchInputPosition, MiddleDecksLayout } from '../../../types/settings';

const settingsStore = useSettingsStore();
const saveMessage = ref('');

type SizePreset = 's' | 'm' | 'l' | 'xl';

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
  margin: 0 0 16px 0;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.preset-button {
  padding: 12px 20px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 600;
  color: #333;

  &:hover {
    border-color: #1a73e8;
    background: #f8fbff;
  }

  &.active {
    border-color: #1a73e8;
    background: #e8f0fe;
    color: #1a73e8;
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
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: #333;

  &:hover {
    border-color: #1a73e8;
    background: #f8fbff;
  }

  &.active {
    border-color: #1a73e8;
    background: #e8f0fe;
    color: #1a73e8;
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
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;

  &:hover {
    border-color: #1a73e8;
    background: #f8fbff;
  }

  &.active {
    border-color: #1a73e8;
    background: #e8f0fe;

    .layout-label {
      color: #1a73e8;
      font-weight: 600;
    }
  }
}

.layout-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
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
  background: #f0f0f0;
  border: 1px solid #d0d0d0;
  border-radius: 3px;
  font-size: 11px;
  color: #666;
  text-align: center;
  min-width: 40px;

  &.highlight {
    background: #e8f0fe;
    border: 2px solid #1a73e8;
    color: #1a73e8;
    font-weight: 600;
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

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
