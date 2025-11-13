<template>
  <div class="deck-edit-settings">
    <h2>独自デッキ編集画面の設定</h2>
    <p class="desc">独自デッキ編集画面（#/ytomo/edit）の動作をカスタマイズできます。</p>

    <div class="settings-group">
      <h3>基本設定</h3>
      
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" v-model="settings.enabled" />
          <span>独自デッキ編集画面を有効にする</span>
        </label>
        <p class="setting-desc">無効にすると、独自デッキ編集画面（#/ytomo/edit）が使用できなくなります。</p>
      </div>
    </div>

    <div class="settings-group" :class="{ disabled: !settings.enabled }">
      <h3>表示設定</h3>

      <div class="setting-item">
        <label>デフォルト表示モード</label>
        <select v-model="settings.defaultDisplayMode" :disabled="!settings.enabled">
          <option value="list">リスト表示</option>
          <option value="grid">グリッド表示</option>
        </select>
        <p class="setting-desc">独自デッキ編集画面を開いたときの初期表示モードです。</p>
      </div>

      <div class="setting-item">
        <label>デフォルトソート順</label>
        <select v-model="settings.defaultSortOrder" :disabled="!settings.enabled">
          <option value="official">公式順</option>
          <option value="level">レベル順</option>
          <option value="atk">攻撃力順</option>
          <option value="def">守備力順</option>
        </select>
        <p class="setting-desc">カードリストのデフォルトのソート順です。</p>
      </div>

      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" v-model="settings.enableAnimation" :disabled="!settings.enabled" />
          <span>アニメーションを有効にする</span>
        </label>
        <p class="setting-desc">カードの追加・削除時のアニメーション効果を有効にします。</p>
      </div>
    </div>

    <div class="settings-group" :class="{ disabled: !settings.enabled }">
      <h3>言語設定</h3>

      <div class="setting-item">
        <label>言語</label>
        <select v-model="settings.language" :disabled="!settings.enabled">
          <option value="auto">自動検出</option>
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
        <p class="setting-desc">
          カード情報の取得言語です。「自動検出」では、ページのURLやmeta情報から判定します。
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
import { loadDeckEditSettings, saveDeckEditSettings } from '../utils/settings';
import { DEFAULT_DECK_EDIT_SETTINGS } from '../types/settings';
import type { DeckEditSettings } from '../types/settings';

const settings = reactive<DeckEditSettings>({ ...DEFAULT_DECK_EDIT_SETTINGS });
const originalSettings = ref<DeckEditSettings>({ ...DEFAULT_DECK_EDIT_SETTINGS });
const saveMessage = ref('');
const saveError = ref(false);

const hasChanges = computed(() => {
  return JSON.stringify(settings) !== JSON.stringify(originalSettings.value);
});

async function loadSettings() {
  const loaded = await loadDeckEditSettings();
  Object.assign(settings, loaded);
  originalSettings.value = { ...loaded };
}

async function save() {
  try {
    await saveDeckEditSettings(settings);
    originalSettings.value = { ...settings };
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
  saveMessage.value = '';
}

function restoreDefaults() {
  Object.assign(settings, DEFAULT_DECK_EDIT_SETTINGS);
  saveMessage.value = '';
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.deck-edit-settings {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 800px;
}

.desc {
  color: #666;
  margin-bottom: 24px;
}

.settings-group {
  margin-bottom: 32px;
  padding: 16px;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  background: #f6f8fa;
}

.settings-group.disabled {
  opacity: 0.6;
}

.settings-group h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #24292e;
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
  color: #24292e;
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
  border: 1px solid #d1d5da;
  border-radius: 6px;
  background: white;
  font-size: 14px;
}

.setting-item select:disabled {
  background: #f6f8fa;
  cursor: not-allowed;
}

.setting-desc {
  margin: 6px 0 0 0;
  font-size: 13px;
  color: #586069;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e1e4e8;
}

button {
  padding: 10px 20px;
  border: 1px solid #d1d5da;
  border-radius: 6px;
  background: white;
  color: #24292e;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: #f6f8fa;
  border-color: #959da5;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.primary {
  background: #2ea44f;
  color: white;
  border-color: #2ea44f;
}

button.primary:hover:not(:disabled) {
  background: #2c974b;
  border-color: #2c974b;
}

.message {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 6px;
  background: #d1f4e0;
  color: #0f5132;
  font-size: 14px;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
}
</style>
