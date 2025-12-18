<template>
  <div v-if="isVisible" class="dialog-overlay" @click.self="close">
    <div class="dialog-content" @click.stop>
      <div class="dialog-header common">
        <div class="dialog-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'import' }"
            @click="activeTab = 'import'"
          >
            Import
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'export' }"
            @click="activeTab = 'export'"
          >
            Export
          </button>
        </div>
        <button class="close-btn" @click="close" title="Close">×</button>
      </div>

      <!-- Import タブ -->
      <div v-if="activeTab === 'import'" class="dialog-body">
        <!-- ファイル選択 -->
        <div class="form-group">
          <label>Select File:</label>
          <div class="file-input-wrapper">
            <input
              ref="fileInput"
              type="file"
              accept=".csv,.txt,.png"
              @change="handleFileSelect"
              class="file-input"
            />
            <button class="btn btn-select-file" @click="triggerFileSelect">
              Choose File
            </button>
            <span v-if="selectedFile" class="file-name">{{ selectedFile.name }}</span>
            <span v-else class="file-name placeholder">No file selected</span>
          </div>
        </div>

        <!-- プレビュー -->
        <div v-if="previewInfo" class="preview-section">
          <h4>Preview:</h4>
          <div class="preview-info">
            <span>Main: {{ previewInfo.mainCount }} cards</span>
            <span>Extra: {{ previewInfo.extraCount }} cards</span>
            <span>Side: {{ previewInfo.sideCount }} cards</span>
          </div>

          <!-- 警告メッセージ -->
          <div v-if="warnings.length > 0" class="warnings">
            <div class="warning-header">Warnings:</div>
            <ul>
              <li v-for="(warning, idx) in warnings" :key="idx">{{ warning }}</li>
            </ul>
          </div>
        </div>

        <!-- エラーメッセージ -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <!-- インポートオプション -->
        <div v-if="previewInfo" class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="replaceExisting" />
            <span>Replace existing deck (if unchecked, cards will be added)</span>
          </label>
        </div>
      </div>

      <!-- Export タブ -->
      <div v-if="activeTab === 'export'" class="dialog-body">
        <!-- フォーマット選択 -->
        <div class="form-group">
          <label>Format:</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" v-model="format" value="csv" />
              <span>CSV (Comma-Separated Values)</span>
            </label>
            <label class="radio-label">
              <input type="radio" v-model="format" value="txt" />
              <span>TXT (Human-Readable Text)</span>
            </label>
          </div>
        </div>

        <!-- オプション -->
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="includeSide" />
            <span>Include Side Deck</span>
          </label>
        </div>

        <!-- ファイル名入力 -->
        <div class="form-group">
          <label for="filename-input">Filename:</label>
          <div class="filename-input-wrapper">
            <input
              id="filename-input"
              type="text"
              v-model="filenameBase"
              placeholder="deck"
              @keyup.enter="handleExport"
            />
            <span class="file-extension">.{{ format }}</span>
          </div>
        </div>

        <!-- プレビュー（オプション） -->
        <div v-if="deckInfo" class="preview-info">
          <span>Main: {{ deckInfo.mainDeck.length }} cards</span>
          <span>Extra: {{ deckInfo.extraDeck.length }} cards</span>
          <span v-if="includeSide">Side: {{ deckInfo.sideDeck.length }} cards</span>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-cancel" @click="close">Cancel</button>
        <button
          v-if="activeTab === 'import'"
          class="btn btn-import"
          :disabled="!previewInfo"
          @click="handleImport"
        >
          Import
        </button>
        <button
          v-if="activeTab === 'export'"
          class="btn btn-export"
          @click="handleExport"
        >
          Export
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { importDeckFromFile } from '@/utils/deck-import';
import { downloadDeckAsCSV, downloadDeckAsTXT } from '@/utils/deck-export';
// @ts-ignore - Used in defineEmits type
import type { DeckInfo } from '@/types/deck';

const props = withDefaults(
  defineProps<{
    isVisible: boolean;
    deckInfo?: DeckInfo | null;
    dno?: string;
    initialTab?: 'import' | 'export';
  }>(),
  {
    deckInfo: null,
    dno: '',
    initialTab: 'import'
  }
);

const emit = defineEmits<{
  close: [];
  imported: [deckInfo: DeckInfo, replaceExisting: boolean];
  exported: [format: string];
}>();

// アクティブなタブ
const activeTab = ref<'import' | 'export'>(props.initialTab);

// Import用の状態
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const previewInfo = ref<{
  deckInfo: DeckInfo;
  mainCount: number;
  extraCount: number;
  sideCount: number;
} | null>(null);
const warnings = ref<string[]>([]);
const errorMessage = ref<string>('');
const replaceExisting = ref(true);

// Export用の状態
const format = ref<'csv' | 'txt'>('csv');
const includeSide = ref(true);
const filenameBase = ref('');

// dnoが変更されたらファイル名を更新
watch(() => props.dno, (newDno) => {
  if (newDno) {
    filenameBase.value = `deck-${newDno}`;
  } else {
    filenameBase.value = 'deck';
  }
}, { immediate: true });

// ダイアログが開閉されたときの処理
watch(() => props.isVisible, (visible) => {
  if (visible) {
    activeTab.value = props.initialTab;
  } else {
    resetDialog();
  }
});

// ダイアログをリセット
function resetDialog() {
  // Import状態をリセット
  selectedFile.value = null;
  previewInfo.value = null;
  warnings.value = [];
  errorMessage.value = '';
  replaceExisting.value = true;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

// ファイル選択ボタンをクリック
function triggerFileSelect() {
  fileInput.value?.click();
}

// ファイルが選択された
async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    return;
  }

  selectedFile.value = file;
  errorMessage.value = '';
  warnings.value = [];
  previewInfo.value = null;

  // ファイルをインポート
  const result = await importDeckFromFile(file);

  if (!result.success) {
    errorMessage.value = result.error || 'インポートに失敗しました';
    return;
  }

  if (result.warnings) {
    warnings.value = result.warnings;
  }

  if (result.deckInfo) {
    const mainCount = result.deckInfo.mainDeck.reduce((sum, entry) => sum + entry.quantity, 0);
    const extraCount = result.deckInfo.extraDeck.reduce((sum, entry) => sum + entry.quantity, 0);
    const sideCount = result.deckInfo.sideDeck.reduce((sum, entry) => sum + entry.quantity, 0);

    previewInfo.value = {
      deckInfo: result.deckInfo,
      mainCount,
      extraCount,
      sideCount
    };
  }
}

// 閉じる
function close() {
  emit('close');
}

// インポート実行
function handleImport() {
  if (!previewInfo.value) {
    return;
  }

  emit('imported', previewInfo.value.deckInfo, replaceExisting.value);
  close();
}

// エクスポート実行
function handleExport() {
  if (!props.deckInfo) {
    console.error('[ImportExportDialog] No deck info available');
    return;
  }

  const filename = `${filenameBase.value || 'deck'}.${format.value}`;
  const options = { includeSide: includeSide.value };

  if (format.value === 'csv') {
    downloadDeckAsCSV(props.deckInfo, filename, options);
  } else {
    downloadDeckAsTXT(props.deckInfo, filename, options);
  }

  emit('exported', format.value);
  close();
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--dialog-overlay-bg, rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog-content {
  background: var(--dialog-bg, #ffffff);
  border: 1px solid var(--dialog-border, #e0e0e0);
  border-radius: 8px;
  box-shadow: var(--shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.2));
  width: 90%;
  max-width: 520px;
  height: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-secondary, #eee);
  flex-shrink: 0;
}

.dialog-tabs {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--text-primary);
  border-bottom-color: var(--primary-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  line-height: 1;
  color: var(--text-secondary, var(--text-secondary));
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s, color 0.2s;
}

.close-btn:hover {
  background: var(--bg-secondary, var(--bg-secondary));
  color: var(--text-primary, #000);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label:not(.checkbox-label):not(.radio-label) {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #000);
  font-size: 14px;
}

.file-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-input {
  display: none;
}

.btn-select-file {
  padding: 8px 16px;
  background: var(--bg-secondary, var(--bg-secondary));
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #000);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-select-file:hover {
  background: var(--bg-tertiary, var(--border-primary));
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary, #000);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name.placeholder {
  color: var(--text-secondary, #999);
  font-style: italic;
}

.preview-section {
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-secondary, var(--bg-secondary));
  border-radius: 4px;
}

.preview-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #000);
}

.preview-info {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary, var(--text-secondary));
}

.preview-info span {
  font-weight: 500;
}

.warnings {
  margin-top: 12px;
  padding: 12px;
  background: var(--color-warning-bg);
  border: 1px solid var(--color-warning);
  border-radius: 4px;
}

.warning-header {
  font-weight: 600;
  color: var(--color-warning);
  margin-bottom: 8px;
  font-size: 13px;
}

.warnings ul {
  margin: 0;
  padding-left: 20px;
  color: var(--color-warning);
  font-size: 12px;
}

.warnings li {
  margin-bottom: 4px;
}

.error-message {
  padding: 12px;
  background: var(--color-error-bg);
  border: 1px solid var(--color-error-bg);
  border-radius: 4px;
  color: var(--color-error-text);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.radio-label:hover {
  background: var(--bg-secondary, var(--bg-secondary));
}

.radio-label input[type="radio"] {
  cursor: pointer;
}

.radio-label span {
  color: var(--text-primary, #000);
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;
  margin: 0;
}

.checkbox-label:hover {
  background: var(--bg-secondary, var(--bg-secondary));
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

.checkbox-label span {
  color: var(--text-primary, #000);
  font-size: 14px;
}

.filename-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 4px;
  padding: 8px 12px;
  background: var(--bg-primary, #fff);
}

.filename-input-wrapper input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary, #000);
  font-size: 14px;
}

.file-extension {
  color: var(--text-secondary, var(--text-secondary));
  font-size: 14px;
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-secondary, #eee);
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: var(--bg-secondary, var(--bg-secondary));
  color: var(--text-primary, #000);
}

.btn-cancel:hover {
  background: var(--bg-tertiary, var(--border-primary));
}

.btn-import,
.btn-export {
  background: var(--button-bg);
  color: var(--button-text);
}

.btn-import:hover:not(:disabled),
.btn-export:hover {
  background: var(--button-hover-bg);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(70, 120, 255, 0.3);
}

.btn-import:disabled {
  background: var(--bg-tertiary);
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
