<template>
  <div class="settings-panel">
    <div class="settings-section">
      <h3 class="section-title">カードサイズ</h3>
      <div class="radio-group">
        <label
          v-for="size in cardSizes"
          :key="size.value"
          class="radio-label"
          :class="{ active: settingsStore.appSettings.cardSize === size.value }"
        >
          <input
            type="radio"
            :value="size.value"
            v-model="settingsStore.appSettings.cardSize"
            @change="handleCardSizeChange"
          />
          <span class="radio-text">
            {{ size.label }}
            <span class="size-info">{{ size.width }}×{{ size.height }}px</span>
          </span>
        </label>
      </div>
      <div class="preview-container">
        <div class="preview-label">プレビュー:</div>
        <div class="card-preview">
          <div class="preview-card" :style="previewCardStyle">
            <img
              src="https://www.db.yugioh-card.com/yugiohdb/card_image/0000/0002/002.jpg"
              alt="Card preview"
              class="preview-image"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">テーマ</h3>
      <div class="radio-group">
        <label
          v-for="theme in themes"
          :key="theme.value"
          class="radio-label"
          :class="{ active: settingsStore.appSettings.theme === theme.value }"
        >
          <input
            type="radio"
            :value="theme.value"
            v-model="settingsStore.appSettings.theme"
            @change="handleThemeChange"
          />
          <span class="radio-text">
            {{ theme.label }}
            <span class="theme-icon">{{ theme.icon }}</span>
          </span>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">言語</h3>
      <div class="select-wrapper">
        <select
          v-model="settingsStore.appSettings.language"
          @change="handleLanguageChange"
          class="language-select"
        >
          <option v-for="lang in languages" :key="lang.value" :value="lang.value">
            {{ lang.label }}
          </option>
        </select>
      </div>
      <div class="language-note">
        ※ 「自動検出」は公式サイトのURLから言語を判定します
      </div>
    </div>

    <div class="settings-actions">
      <button class="reset-button" @click="handleReset">
        設定をリセット
      </button>
      <div class="save-status" v-if="saveStatus">
        {{ saveStatus }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSettingsStore } from '../stores/settings';
import type { CardSize, Theme, Language } from '../types/settings';
import { CARD_SIZE_MAP } from '../types/settings';

const settingsStore = useSettingsStore();
const saveStatus = ref<string>('');

interface CardSizeOption {
  value: CardSize;
  label: string;
  width: number;
  height: number;
}

interface ThemeOption {
  value: Theme;
  label: string;
  icon: string;
}

interface LanguageOption {
  value: Language;
  label: string;
}

const cardSizes = ref<CardSizeOption[]>([
  { value: 'small', label: '小', ...CARD_SIZE_MAP.small },
  { value: 'medium', label: '中', ...CARD_SIZE_MAP.medium },
  { value: 'large', label: '大', ...CARD_SIZE_MAP.large },
  { value: 'xlarge', label: '特大', ...CARD_SIZE_MAP.xlarge },
]);

const themes = ref<ThemeOption[]>([
  { value: 'light', label: 'ライト', icon: '☀️' },
  { value: 'dark', label: 'ダーク', icon: '🌙' },
  { value: 'system', label: 'システム設定に従う', icon: '🖥️' },
]);

const languages = ref<LanguageOption[]>([
  { value: 'auto', label: '自動検出' },
  { value: 'ja', label: '日本語 (ja)' },
  { value: 'en', label: 'English (en)' },
  { value: 'ko', label: '한국어 (ko)' },
  { value: 'ae', label: 'العربية (ae)' },
  { value: 'cn', label: '中文 (cn)' },
  { value: 'de', label: 'Deutsch (de)' },
  { value: 'fr', label: 'Français (fr)' },
  { value: 'it', label: 'Italiano (it)' },
  { value: 'es', label: 'Español (es)' },
  { value: 'pt', label: 'Português (pt)' },
]);

// プレビューカードのスタイルを計算
const previewCardStyle = computed(() => {
  const size = CARD_SIZE_MAP[settingsStore.appSettings.cardSize];
  return {
    width: `${size.width}px`,
    height: `${size.height}px`,
  };
});

// カードサイズ変更時のハンドラー
const handleCardSizeChange = () => {
  settingsStore.setCardSize(settingsStore.appSettings.cardSize);
  settingsStore.applyCardSize();
  showSaveStatus('カードサイズを変更しました');
};

// テーマ変更時のハンドラー
const handleThemeChange = () => {
  settingsStore.setTheme(settingsStore.appSettings.theme);
  settingsStore.applyTheme();
  showSaveStatus('テーマを変更しました');
};

// 言語変更時のハンドラー
const handleLanguageChange = () => {
  settingsStore.setLanguage(settingsStore.appSettings.language);
  showSaveStatus('言語を変更しました');
};

// リセットハンドラー
const handleReset = async () => {
  if (confirm('すべての設定を初期値に戻します。よろしいですか？')) {
    await settingsStore.resetSettings();
    showSaveStatus('設定をリセットしました');
  }
};

// 保存ステータスを表示
const showSaveStatus = (message: string) => {
  saveStatus.value = message;
  setTimeout(() => {
    saveStatus.value = '';
  }, 3000);
};

// コンポーネントマウント時
onMounted(async () => {
  await settingsStore.loadSettings();
  settingsStore.applyTheme();
  settingsStore.applyCardSize();
});
</script>

<style scoped lang="scss">
.settings-panel {
  max-width: 800px;
  margin: 0 auto;
}

.settings-section {
  background-color: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 18px;
  color: #333;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #008cff;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #fafafa;

  &:hover {
    border-color: #008cff;
    background-color: #f0f8ff;
  }

  &.active {
    border-color: #008cff;
    background-color: #e6f4ff;
  }

  input[type="radio"] {
    margin-right: 12px;
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .radio-text {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 15px;
    color: #333;
  }

  .size-info {
    font-size: 13px;
    color: #666;
    margin-left: 8px;
  }

  .theme-icon {
    font-size: 20px;
    margin-left: 8px;
  }
}

.preview-container {
  margin-top: 20px;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.preview-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.card-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 180px;
}

.preview-card {
  transition: all 0.3s ease;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.select-wrapper {
  position: relative;
}

.language-select {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: #008cff;
  }

  &:focus {
    outline: none;
    border-color: #008cff;
    box-shadow: 0 0 0 3px rgba(0, 140, 255, 0.1);
  }

  option {
    padding: 8px;
  }
}

.language-note {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.settings-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}

.reset-button {
  padding: 12px 24px;
  font-size: 15px;
  color: #fff;
  background-color: #dc3545;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #c82333;
    box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
  }

  &:active {
    transform: translateY(1px);
  }
}

.save-status {
  font-size: 14px;
  color: #28a745;
  font-weight: 500;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
