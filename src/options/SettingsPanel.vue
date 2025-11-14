<template>
  <div class="settings-panel">
    <div class="settings-section">
      <h3 class="section-title">カードサイズ設定</h3>

      <!-- デッキ編集用 -->
      <div class="size-subsection">
        <h4 class="subsection-title">デッキ編集</h4>
        <div class="radio-group">
          <label
            v-for="size in cardSizes"
            :key="`deck-${size.value}`"
            class="radio-label"
            :class="{ active: settingsStore.appSettings.deckEditCardSize === size.value }"
          >
            <input
              type="radio"
              :value="size.value"
              v-model="settingsStore.appSettings.deckEditCardSize"
              @change="handleDeckEditCardSizeChange"
            />
            <span class="radio-text">
              {{ size.label }}
              <span class="size-info">{{ size.width }}×{{ size.height }}px</span>
            </span>
          </label>
        </div>
      </div>

      <!-- カード詳細用 -->
      <div class="size-subsection">
        <h4 class="subsection-title">カード詳細パネル</h4>
        <div class="radio-group">
          <label
            v-for="size in cardSizes"
            :key="`info-${size.value}`"
            class="radio-label"
            :class="{ active: settingsStore.appSettings.infoCardSize === size.value }"
          >
            <input
              type="radio"
              :value="size.value"
              v-model="settingsStore.appSettings.infoCardSize"
              @change="handleInfoCardSizeChange"
            />
            <span class="radio-text">
              {{ size.label }}
              <span class="size-info">{{ size.width }}×{{ size.height }}px</span>
            </span>
          </label>
        </div>
      </div>

      <!-- グリッド表示用 -->
      <div class="size-subsection">
        <h4 class="subsection-title">グリッド表示</h4>
        <div class="radio-group">
          <label
            v-for="size in cardSizes"
            :key="`grid-${size.value}`"
            class="radio-label"
            :class="{ active: settingsStore.appSettings.gridCardSize === size.value }"
          >
            <input
              type="radio"
              :value="size.value"
              v-model="settingsStore.appSettings.gridCardSize"
              @change="handleGridCardSizeChange"
            />
            <span class="radio-text">
              {{ size.label }}
              <span class="size-info">{{ size.width }}×{{ size.height }}px</span>
            </span>
          </label>
        </div>
      </div>

      <!-- リスト表示用 -->
      <div class="size-subsection">
        <h4 class="subsection-title">リスト表示</h4>
        <div class="radio-group">
          <label
            v-for="size in cardSizes"
            :key="`list-${size.value}`"
            class="radio-label"
            :class="{ active: settingsStore.appSettings.listCardSize === size.value }"
          >
            <input
              type="radio"
              :value="size.value"
              v-model="settingsStore.appSettings.listCardSize"
              @change="handleListCardSizeChange"
            />
            <span class="radio-text">
              {{ size.label }}
              <span class="size-info">{{ size.width }}×{{ size.height }}px</span>
            </span>
          </label>
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

    <div class="settings-section">
      <h3 class="section-title">デッキ編集レイアウト</h3>
      <div class="radio-group">
        <label
          v-for="layout in layouts"
          :key="layout.value"
          class="radio-label"
          :class="{ active: settingsStore.appSettings.middleDecksLayout === layout.value }"
        >
          <input
            type="radio"
            :value="layout.value"
            v-model="settingsStore.appSettings.middleDecksLayout"
            @change="handleLayoutChange"
          />
          <span class="radio-text">
            {{ layout.label }}
          </span>
        </label>
      </div>
      <div class="language-note">
        ※ Extra/Sideデッキの配置方向を変更します
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
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '../stores/settings';
import type { CardSize, Theme, Language, MiddleDecksLayout } from '../types/settings';
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

interface LayoutOption {
  value: MiddleDecksLayout;
  label: string;
}

const cardSizes = ref<CardSizeOption[]>([
  { value: 'small', label: '小', ...CARD_SIZE_MAP.small },
  { value: 'medium', label: '中', ...CARD_SIZE_MAP.medium },
  { value: 'large', label: '大', ...CARD_SIZE_MAP.large },
  { value: 'xlarge', label: '特大', ...CARD_SIZE_MAP.xlarge },
]);

const themes = ref<ThemeOption[]>([
  { value: 'light', label: 'ライト', icon: '' },
  { value: 'dark', label: 'ダーク', icon: '' },
  { value: 'system', label: 'システム設定に従う', icon: '' },
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

const layouts = ref<LayoutOption[]>([
  { value: 'horizontal', label: '横並び（Extra | Side）' },
  { value: 'vertical', label: '縦並び（Extra / Side）' },
]);

// カードサイズ変更時のハンドラー（デッキ編集用）
const handleDeckEditCardSizeChange = () => {
  settingsStore.setDeckEditCardSize(settingsStore.appSettings.deckEditCardSize);
  showSaveStatus('デッキ編集のカードサイズを変更しました');
};

// カードサイズ変更時のハンドラー（カード詳細用）
const handleInfoCardSizeChange = () => {
  settingsStore.setInfoCardSize(settingsStore.appSettings.infoCardSize);
  showSaveStatus('カード詳細のカードサイズを変更しました');
};

// カードサイズ変更時のハンドラー（グリッド表示用）
const handleGridCardSizeChange = () => {
  settingsStore.setGridCardSize(settingsStore.appSettings.gridCardSize);
  showSaveStatus('グリッド表示のカードサイズを変更しました');
};

// カードサイズ変更時のハンドラー（リスト表示用）
const handleListCardSizeChange = () => {
  settingsStore.setListCardSize(settingsStore.appSettings.listCardSize);
  showSaveStatus('リスト表示のカードサイズを変更しました');
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

// レイアウト変更時のハンドラー
const handleLayoutChange = () => {
  settingsStore.setMiddleDecksLayout(settingsStore.appSettings.middleDecksLayout);
  showSaveStatus('デッキレイアウトを変更しました');
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
  max-width: 900px;
  margin: 0 auto;
}

.settings-section {
  padding: 20px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  font-weight: 500;
}

.size-subsection {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.subsection-title {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 10px 0;
  font-weight: 500;
}

.radio-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: var(--card-bg);

  &:hover {
    border-color: var(--button-bg);
    background-color: var(--card-hover-bg);
  }

  &.active {
    border-color: var(--button-bg);
    background-color: var(--card-hover-bg);
  }

  input[type="radio"] {
    margin-right: 10px;
    cursor: pointer;
  }

  .radio-text {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: var(--text-primary);
  }

  .size-info {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-left: 8px;
  }
}

.preview-container {
  margin-top: 16px;
  padding: 12px;
  background-color: var(--card-bg);
  border-radius: 4px;
  border: 1px solid var(--border-primary);
}

.preview-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.card-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 150px;
}

.preview-card {
  transition: all 0.3s ease;
  border-radius: 3px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
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
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background-color: var(--input-bg);
  color: var(--input-text);
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--button-bg);
  }

  &:focus {
    outline: none;
    border-color: var(--button-bg);
  }

  option {
    padding: 6px;
  }
}

.language-note {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.4;
}

.settings-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  margin-top: 10px;
}

.reset-button {
  padding: 10px 20px;
  font-size: 14px;
  color: var(--button-text);
  background-color: var(--color-error);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    opacity: 0.9;
  }
}

.save-status {
  font-size: 13px;
  color: var(--color-success);
  font-weight: normal;
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
