<template>
  <div class="settings-panel">
    <div class="settings-section">
      <h3 class="section-title">カードサイズ</h3>
      <div class="preset-grid">
        <button
          v-for="preset in sizePresets"
          :key="preset.value"
          class="preset-button"
          :class="{ active: currentPreset === preset.value }"
          @click="handlePresetChange(preset.value)"
        >
          <span class="preset-name">{{ preset.label }}</span>
          <span class="preset-desc">{{ preset.description }}</span>
        </button>
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

    <div class="settings-section danger-section">
      <h3 class="section-title">キャッシュ管理</h3>
      <p class="section-description">
        カード情報やデッキデータのキャッシュを削除します。動作が不安定な場合にお試しください。
      </p>
      <div class="cache-actions">
        <button class="danger-button" @click="handleClearCache">
          キャッシュを削除
        </button>
        <span class="cache-info" v-if="cacheInfo">{{ cacheInfo }}</span>
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
import type { Theme, Language, MiddleDecksLayout } from '../types/settings';

const settingsStore = useSettingsStore();
const saveStatus = ref<string>('');
const cacheInfo = ref<string>('');

type SizePreset = 's' | 'm' | 'l' | 'xl';

interface PresetOption {
  value: SizePreset;
  label: string;
  description: string;
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

const sizePresets = ref<PresetOption[]>([
  { value: 's', label: 'S', description: '小さめ' },
  { value: 'm', label: 'M', description: '標準' },
  { value: 'l', label: 'L', description: '大きめ' },
  { value: 'xl', label: 'XL', description: '特大' }
]);

// 現在のプリセットを取得
const currentPreset = computed<SizePreset | null>(() => {
  return settingsStore.getCurrentPreset();
});

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

// プリセット変更時のハンドラー
const handlePresetChange = (presetValue: SizePreset) => {
  const preset = sizePresets.value.find(p => p.value === presetValue);
  if (!preset) return;

  settingsStore.setCardSizePreset(presetValue);
  showSaveStatus(`カードサイズを「${preset.label}」に変更しました`);
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
  await settingsStore.resetSettings();
  showSaveStatus('設定をリセットしました');
};

// キャッシュ削除ハンドラー
const handleClearCache = async () => {
  try {
    // UnifiedCacheDBとTempCardDBのキーを削除
    const keysToRemove = [
      'unifiedCacheDB_cardTiers',
      'unifiedCacheDB_deckHistory',
      'unifiedCacheDB_cardsTableA',
      'unifiedCacheDB_cardsTableB',
      'unifiedCacheDB_cardsTableC',
      'unifiedCacheDB_productsTableA',
      'unifiedCacheDB_faqsTableA',
      'tempCardDB'
    ];

    await chrome.storage.local.remove(keysToRemove);

    cacheInfo.value = 'キャッシュを削除しました';
    setTimeout(() => {
      cacheInfo.value = '';
    }, 3000);
  } catch (error) {
    console.error('Failed to clear cache:', error);
    cacheInfo.value = 'キャッシュの削除に失敗しました';
    setTimeout(() => {
      cacheInfo.value = '';
    }, 3000);
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

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.preset-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  border: 2px solid var(--border-primary);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #00d9b8;
    background: linear-gradient(135deg, rgba(0, 217, 184, 0.05) 0%, rgba(0, 140, 255, 0.05) 100%);
  }

  &.active {
    border-color: #00d9b8;
    background: linear-gradient(135deg, rgba(0, 217, 184, 0.1) 0%, rgba(0, 140, 255, 0.1) 100%);
    box-shadow: 0 2px 8px rgba(0, 217, 184, 0.2);
  }
}

.preset-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.preset-desc {
  font-size: 12px;
  color: var(--text-tertiary);
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

.danger-section {
  border-color: #ffcdd2;
  background-color: #fff8f8;
}

.section-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.cache-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.danger-button {
  padding: 10px 20px;
  font-size: 14px;
  color: white;
  background-color: #d32f2f;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #b71c1c;
  }
}

.cache-info {
  font-size: 13px;
  color: var(--color-success);
  animation: fadeIn 0.3s ease;
}
</style>
