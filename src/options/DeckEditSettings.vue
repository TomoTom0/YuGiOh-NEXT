<template>
  <div class="deck-edit-settings">
    <h2>Deck Edit Settings</h2>
    <p class="desc">独自デッキ編集画面（#/ytomo/edit）の詳細設定を行います。</p>

    <div class="settings-group">
      <h3>基本設定</h3>
      
      <div class="setting-item">
        <p class="setting-note">
          独自デッキ編集画面のON/OFFは「Omit and Usage」タブで設定できます。
        </p>
      </div>
    </div>

    <div class="settings-group">
      <h3>表示設定</h3>

      <div class="setting-item">
        <label>デフォルト表示モード</label>
        <select v-model="settings.defaultDisplayMode">
          <option value="list">リスト表示</option>
          <option value="grid">グリッド表示</option>
        </select>
        <p class="setting-desc">独自デッキ編集画面を開いたときの初期表示モードです。</p>
      </div>

      <div class="setting-item">
        <label>デフォルトソート順</label>
        <select v-model="settings.defaultSortOrder">
          <option value="release_desc">新しい順</option>
          <option value="release_asc">古い順</option>
          <option value="name_asc">あいうえお順</option>
        </select>
        <p class="setting-desc">カードリストのデフォルトのソート順です。</p>
      </div>

      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" v-model="settings.enableAnimation" />
          <span>アニメーションを有効にする</span>
        </label>
        <p class="setting-desc">カードの追加・削除時のアニメーション効果を有効にします。</p>
      </div>
    </div>

    <div class="settings-group">
      <h3>言語設定</h3>

      <div class="setting-item">
        <label>言語</label>
        <select v-model="settings.language">
          <option value="auto">自動検出</option>
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
        <p class="setting-desc">
          カード情報の取得言語です。「自動検出」では、ページのURLやmeta情報から判定します。
        </p>
      </div>

      <div class="setting-item">
        <label>カード検索入力欄の位置</label>
        <select v-model="searchInputPosition">
          <option value="default">デフォルト（検索タブ上部）</option>
          <option value="section-title">Main Sectionタイトル内</option>
        </select>
        <p class="setting-desc">
          カード検索入力欄の表示位置を設定します。「Main Sectionタイトル内」では、枚数表示とシャッフルボタンの間に小さく表示されます。
        </p>
      </div>
    </div>

    <div class="actions">
      <button type="button" class="primary" @click="save" :disabled="!hasChanges">
        保存
      </button>
      <button type="button" @click="reset" :disabled="!hasChanges">
        リセット
      </button>
      <button type="button" @click="restoreDefaults">
        デフォルトに戻す
      </button>
    </div>

    <div v-if="saveMessage" class="message" :class="{ error: saveError }">
      {{ saveMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { loadDeckEditSettings, saveDeckEditSettings, loadAppSettings, saveAppSettings } from '../utils/settings';
import { DEFAULT_DECK_EDIT_SETTINGS, DEFAULT_APP_SETTINGS } from '../types/settings';
import type { DeckEditSettings, SearchInputPosition } from '../types/settings';

const settings = reactive<DeckEditSettings>({ ...DEFAULT_DECK_EDIT_SETTINGS });
const originalSettings = ref<DeckEditSettings>({ ...DEFAULT_DECK_EDIT_SETTINGS });
const searchInputPosition = ref<SearchInputPosition>('default');
const originalSearchInputPosition = ref<SearchInputPosition>('default');
const saveMessage = ref('');
const saveError = ref(false);

const hasChanges = computed(() => {
  return JSON.stringify(settings) !== JSON.stringify(originalSettings.value) ||
         searchInputPosition.value !== originalSearchInputPosition.value;
});

async function loadSettings() {
  const loaded = await loadDeckEditSettings();
  Object.assign(settings, loaded);
  originalSettings.value = { ...loaded };

  const appSettings = await loadAppSettings();
  searchInputPosition.value = appSettings.ux.searchInputPosition;
  originalSearchInputPosition.value = appSettings.ux.searchInputPosition;
}

async function save() {
  try {
    await saveDeckEditSettings(settings);
    originalSettings.value = { ...settings };

    const appSettings = await loadAppSettings();
    appSettings.ux.searchInputPosition = searchInputPosition.value;
    await saveAppSettings(appSettings);
    originalSearchInputPosition.value = searchInputPosition.value;
    
    saveMessage.value = '設定を保存しました';
    saveError.value = false;
    setTimeout(() => {
      saveMessage.value = '';
    }, 3000);
  } catch (error) {
    saveMessage.value = '設定の保存に失敗しました';
    saveError.value = true;
    console.error('Failed to save settings:', error);
  }
}

function reset() {
  Object.assign(settings, originalSettings.value);
  searchInputPosition.value = originalSearchInputPosition.value;
  saveMessage.value = '';
}

function restoreDefaults() {
  Object.assign(settings, DEFAULT_DECK_EDIT_SETTINGS);
  searchInputPosition.value = DEFAULT_APP_SETTINGS.searchInputPosition;
  saveMessage.value = '';
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.deck-edit-settings {
  background: var(--bg-primary);
  padding: 20px;
  border-radius: 8px;
  max-width: 800px;
}

.desc {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.settings-group {
  margin-bottom: 32px;
  padding: 16px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-secondary);
}

.settings-group.disabled {
  opacity: 0.6;
}

.settings-group h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: var(--text-primary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  font-weight: normal;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
  cursor: pointer;
}

.checkbox-label span {
  font-weight: 600;
}

.setting-item select {
  width: 100%;
  max-width: 300px;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  font-size: 14px;
}

.setting-item select:disabled {
  background: var(--bg-secondary);
  cursor: not-allowed;
}

.setting-desc {
  margin: 6px 0 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.setting-note {
  margin: 0;
  font-size: 13px;
  color: var(--color-info);
  font-style: italic;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-primary);
}

button {
  padding: 10px 20px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: var(--bg-secondary);
  border-color: var(--border-secondary);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.primary {
  background: var(--color-success);
  color: var(--button-text);
  border-color: var(--color-success);
}

button.primary:hover:not(:disabled) {
  background: var(--color-success-hover);
  border-color: var(--color-success-hover);
}

.message {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 6px;
  background: var(--color-success-bg);
  color: var(--color-success);
  font-size: 14px;
}

.message.error {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}
</style>
