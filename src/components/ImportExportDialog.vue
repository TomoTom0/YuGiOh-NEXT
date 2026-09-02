<template>
  <BaseDialog :is-visible="isVisible" :theme="theme" @close="close">
    <div class="dialog-content">
      <div class="dialog-header">
        <h2>Import / Export</h2>
        <button class="close-btn" @click="close" title="Close">×</button>
      </div>

      <div class="dialog-tabs">
        <button
          class="dialog-tab"
          :class="{ active: activeTab === 'import' }"
          @click="activeTab = 'import'"
        >
          Import
        </button>
        <button
          class="dialog-tab"
          :class="{ active: activeTab === 'export' }"
          @click="activeTab = 'export'"
        >
          Export
        </button>
      </div>

      <div class="dialog-tabs-body">
        <!-- Import タブ -->
        <div class="dialog-body" v-show="activeTab === 'import'">
          <!-- ファイル選択: アイコン+ファイル名を一体のボタンにする -->
          <div class="form-group">
            <input
              ref="fileInput"
              type="file"
              accept=".csv,.txt,.png"
              @change="handleFileSelect"
              class="file-input"
            />
            <button class="file-select-btn" @click="triggerFileSelect" title="Choose File">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" :d="mdiFolderOpen" />
              </svg>
              <span v-if="selectedFile" class="file-name">{{ selectedFile.name }}</span>
              <span v-else class="file-name placeholder">No file selected</span>
            </button>
          </div>

          <!-- エラーメッセージ -->
          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <!-- プレビュー画像エリア（既存のデッキレシピ画像生成機能を使用） -->
          <div class="preview-image-area" :class="{ 'preview-image-area-idle': !selectedFile }">
            <!-- 表示切替タブ（画像/テキスト、左）+ 枚数（右） -->
            <div v-if="selectedFile" class="preview-view-tabs-row">
              <div class="preview-view-tabs">
                <button
                  class="sub-tab-btn"
                  :class="{ active: previewViewMode === 'image' }"
                  @click="previewViewMode = 'image'"
                >
                  Image
                </button>
                <button
                  class="sub-tab-btn"
                  :class="{ active: previewViewMode === 'text' }"
                  @click="previewViewMode = 'text'"
                >
                  Text
                </button>
              </div>

              <div v-if="previewInfo" class="preview-counts">
                <div class="text-field">
                  <span class="field-label">main</span>
                  <span class="field-input count-value">{{ previewInfo.mainCount }}</span>
                </div>
                <div class="text-field">
                  <span class="field-label">extra</span>
                  <span class="field-input count-value">{{ previewInfo.extraCount }}</span>
                </div>
                <div class="text-field">
                  <span class="field-label">side</span>
                  <span class="field-input count-value">{{ previewInfo.sideCount }}</span>
                </div>
              </div>
            </div>

            <Transition name="fade" mode="out-in">
              <span v-if="!selectedFile" key="idle" class="preview-image-placeholder-text">Preview will appear here</span>
              <span v-else-if="previewViewMode === 'image' && previewImageLoading" key="loading" class="preview-image-placeholder-text">Generating preview…</span>
              <span v-else-if="previewViewMode === 'image' && previewImageError" key="error" class="preview-image-placeholder-text error">{{ previewImageError }}</span>
              <div v-else-if="previewViewMode === 'image' && previewImageUrl" key="image" class="preview-image-wrapper">
                <img :src="previewImageUrl" class="preview-image" alt="Deck preview" />
                <span class="imported-badge">Imported</span>
              </div>
              <pre v-else-if="previewViewMode === 'text'" key="text" class="preview-text-view">{{ importPreviewText }}</pre>
            </Transition>
          </div>

          <!-- 警告メッセージ -->
          <div v-if="warnings.length > 0" class="warnings">
            <div class="warning-header">Warnings:</div>
            <ul>
              <li v-for="(warning, idx) in warnings" :key="idx">{{ warning }}</li>
            </ul>
          </div>
        </div>

        <!-- Export タブ -->
        <div class="dialog-body dialog-body-export" v-show="activeTab === 'export'">
          <!-- フォーマット切替（内部サブタブ）+ プレビューに影響するオプションを同じ行に -->
          <div class="export-tabs-row">
            <div class="sub-tabs">
              <button
                class="sub-tab-btn"
                :class="{ active: format === 'csv' }"
                @click="format = 'csv'"
              >
                CSV
              </button>
              <button
                class="sub-tab-btn"
                :class="{ active: format === 'txt' }"
                @click="format = 'txt'"
              >
                TXT
              </button>
            </div>

            <button
              class="toggle-pill toggle-pill-success"
              :class="{ active: includeSide }"
              @click="includeSide = !includeSide"
            >
              Side Deck
            </button>
          </div>

          <!-- プレビュー（実際の出力内容） -->
          <textarea class="export-preview" readonly :value="exportPreviewText"></textarea>

          <!-- CSVカラムのtoggle/drag並び替え（CSV形式のみ） -->
          <div v-if="format === 'csv'" class="column-toggle-row">
            <button
              v-for="(col, idx) in csvColumns"
              :key="col.key"
              class="toggle-pill toggle-pill-warning column-pill"
              :class="{ active: col.enabled, dragging: dragColumnIndex === idx }"
              draggable="true"
              title="クリックでON/OFF、ドラッグで並び替え"
              @click="col.enabled = !col.enabled"
              @dragstart="onColumnDragStart(idx)"
              @dragover.prevent
              @drop="onColumnDrop(idx)"
            >
              <svg class="drag-handle" width="12" height="12" viewBox="0 0 24 24">
                <path fill="currentColor" :d="mdiDragVertical" />
              </svg>
              {{ col.label }}
            </button>
            <button class="icon-btn column-reset-btn" @click="resetCsvColumns" title="Reset columns">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="currentColor" :d="mdiRefresh" />
              </svg>
            </button>
          </div>

          <!-- ファイル名入力 + ダウンロードボタン -->
          <div class="export-filename-row">
            <label class="text-field title-field">
              <span class="field-label">filename</span>
              <input
                id="filename-input"
                type="text"
                class="field-input"
                v-model="filenameBase"
                placeholder="deck"
                @keyup.enter="handleExport"
              />
            </label>
            <span class="file-extension">.{{ format }}</span>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <div v-if="activeTab === 'import' && previewInfo" class="import-mode-group">
          <label class="radio-pill" :class="{ active: importMode === 'replace' }">
            <input type="radio" v-model="importMode" value="replace" />
            <span>Replace</span>
          </label>
          <label class="radio-pill" :class="{ active: importMode === 'add' }">
            <input type="radio" v-model="importMode" value="add" />
            <span>Add</span>
          </label>
          <label class="radio-pill" :class="{ active: importMode === 'new' }">
            <input type="radio" v-model="importMode" value="new" />
            <span>New</span>
          </label>
        </div>
        <button
          v-if="activeTab === 'import'"
          class="btn btn-import"
          :disabled="!previewInfo"
          @click="handleImport"
        >
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiTrayArrowDown" /></svg>
          Import
        </button>
        <button
          v-if="activeTab === 'export'"
          class="btn btn-export"
          @click="handleExport"
        >
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiDownload" /></svg>
          Download
        </button>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import BaseDialog from './BaseDialog.vue';
import { importDeckFromFile } from '@/utils/deck-import';
import { downloadDeckAsTXT, downloadFile, exportToTXT, generateExportRows, type ExportRow } from '@/utils/deck-export';
import { createDeckRecipeImage } from '../content/deck-recipe/createDeckRecipeImage';
import { mdiFolderOpen, mdiTrayArrowDown, mdiDownload, mdiRefresh, mdiDragVertical } from '@mdi/js';
// @ts-ignore - Used in defineEmits type
import type { DeckInfo } from '@/types/deck';

const props = withDefaults(
  defineProps<{
    isVisible: boolean;
    deckInfo?: DeckInfo | null;
    dno?: string;
    deckName?: string;
    initialTab?: 'import' | 'export';
    theme?: 'light' | 'dark';
    includeTimestamp?: boolean;
  }>(),
  {
    deckInfo: null,
    dno: '',
    deckName: '',
    initialTab: 'import',
    theme: () => (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light',
    includeTimestamp: true
  }
);

const emit = defineEmits<{
  close: [];
  imported: [deckInfo: DeckInfo, importMode: 'replace' | 'add' | 'new'];
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
const importMode = ref<'replace' | 'add' | 'new'>('replace');

// プレビュー表示切替（画像/テキスト）
const previewViewMode = ref<'image' | 'text'>('image');

// テキスト表示用（実際にインポートされる内容をそのままテキストで確認できるようにする）
// インポート内容確認用のため、Export用TXT形式(exportToTXT)とは異なりenc(画像ハッシュ)は表示しない
const importPreviewText = computed(() => {
  if (!previewInfo.value) return '';
  const rows = generateExportRows(previewInfo.value.deckInfo);

  const formatSection = (label: string, section: 'main' | 'extra' | 'side'): string[] => {
    const sectionRows = rows.filter(r => r.section === section);
    if (sectionRows.length === 0) return [];
    const total = sectionRows.reduce((sum, r) => sum + r.quantity, 0);
    return [
      `=== ${label} (${total} cards) ===`,
      ...sectionRows.map(row => `${row.quantity}x ${row.name}`),
      ''
    ];
  };

  return [
    ...formatSection('Main Deck', 'main'),
    ...formatSection('Extra Deck', 'extra'),
    ...formatSection('Side Deck', 'side')
  ].join('\n').trim();
});

// インポートプレビュー画像（既存のデッキレシピ画像生成機能をそのまま利用）
const previewImageUrl = ref<string | null>(null);
const previewImageLoading = ref(false);
const previewImageError = ref<string | null>(null);

async function generatePreviewImage(deckInfo: DeckInfo) {
  previewImageLoading.value = true;
  previewImageError.value = null;
  previewImageUrl.value = null;

  try {
    const blob = await createDeckRecipeImage({
      cgid: '',
      dno: '0',
      color: 'red',
      includeQR: false,
      scale: 1,
      deckData: { ...deckInfo, name: '' }
    });

    previewImageUrl.value = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob as Blob);
    });
  } catch (error) {
    console.error('[ImportExportDialog] Failed to generate preview image:', error);
    previewImageError.value = 'プレビュー画像の生成に失敗しました';
  } finally {
    previewImageLoading.value = false;
  }
}

// Export用の状態
const format = ref<'csv' | 'txt'>('csv');
const includeSide = ref(true);
const filenameBase = ref('');

// CSV出力カラムのtoggle/並び替え
interface ExportColumn {
  key: keyof ExportRow;
  label: string;
  enabled: boolean;
}

const DEFAULT_CSV_COLUMNS: ExportColumn[] = [
  { key: 'section', label: 'Section', enabled: true },
  { key: 'name', label: 'Name', enabled: true },
  { key: 'cid', label: 'CID', enabled: true },
  { key: 'ciid', label: 'CIID', enabled: true },
  { key: 'enc', label: 'ENC', enabled: true },
  { key: 'quantity', label: 'Qty', enabled: true }
];

const csvColumns = ref<ExportColumn[]>(DEFAULT_CSV_COLUMNS.map(c => ({ ...c })));
const dragColumnIndex = ref<number | null>(null);

function resetCsvColumns() {
  csvColumns.value = DEFAULT_CSV_COLUMNS.map(c => ({ ...c }));
}

function onColumnDragStart(index: number) {
  dragColumnIndex.value = index;
}

function onColumnDrop(index: number) {
  if (dragColumnIndex.value === null || dragColumnIndex.value === index) return;
  const cols = [...csvColumns.value];
  const [moved] = cols.splice(dragColumnIndex.value, 1);
  cols.splice(index, 0, moved);
  csvColumns.value = cols;
  dragColumnIndex.value = null;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// 選択・並び替え済みのカラムでCSVを組み立てる（TXT形式はカラムの概念がないため対象外）
function buildCustomCsv(deckInfo: DeckInfo, options: { includeSide: boolean }): string {
  const rows = generateExportRows(deckInfo, options);
  const activeColumns = csvColumns.value.filter(c => c.enabled);

  const header = activeColumns.map(c => c.key).join(',');
  const dataRows = rows.map(row =>
    activeColumns.map(c => {
      const value = String(row[c.key]);
      return c.key === 'name' ? escapeCsvField(value) : value;
    }).join(',')
  );

  return [header, ...dataRows].join('\n');
}

// エクスポートプレビュー（実際に出力される内容をそのままテキストで表示）
const exportPreviewText = computed(() => {
  if (!props.deckInfo) return '';
  const options = { includeSide: includeSide.value };
  return format.value === 'csv'
    ? buildCustomCsv(props.deckInfo, options)
    : exportToTXT(props.deckInfo, options);
});

// タイムスタンプ生成（YYYYMMDD-HHmm形式）
function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}`;
}

// ファイル名を生成
function generateFilename(): void {
  // デッキ名がある場合はそれを使用、なければdeck-{dno}
  let base = 'deck';
  if (props.deckName) {
    // ファイル名に使用できない文字を置換
    base = props.deckName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'deck';
  } else if (props.dno) {
    base = `deck-${props.dno}`;
  }

  // タイムスタンプを付与
  if (props.includeTimestamp) {
    filenameBase.value = `${base}-${generateTimestamp()}`;
  } else {
    filenameBase.value = base;
  }
}

// propsの変更を監視してファイル名を更新
watch([() => props.dno, () => props.deckName, () => props.includeTimestamp], () => {
  generateFilename();
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
  importMode.value = 'replace';
  previewViewMode.value = 'image';
  previewImageUrl.value = null;
  previewImageLoading.value = false;
  previewImageError.value = null;
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
  previewImageUrl.value = null;
  previewImageError.value = null;
  // 読み込み元が画像(PNG)ならプレビューは逆のtext、テキスト(CSV/TXT)ならimageを初期表示にする
  previewViewMode.value = file.name.toLowerCase().endsWith('.png') ? 'text' : 'image';

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

    generatePreviewImage(result.deckInfo);
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

  emit('imported', previewInfo.value.deckInfo, importMode.value);
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
    downloadFile(buildCustomCsv(props.deckInfo, options), filename, 'text/csv');
  } else {
    downloadDeckAsTXT(props.deckInfo, filename, options);
  }

  emit('exported', format.value);
  close();
}
</script>

<style scoped lang="scss">
@use '../styles/common.scss' as *;

.dialog-content {
  background: var(--dialog-bg, #ffffff);
  border: 1px solid var(--dialog-border, #e0e0e0);
  border-radius: 8px;
  box-shadow: var(--shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.2));
  width: 90%;
  max-width: 720px;
  height: min(75vh, 700px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;

  .dialog-tabs-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;

    .dialog-body {
      padding: 20px;
      box-sizing: border-box;
    }

    .dialog-body-export {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--border-secondary, #eee);
    width: 100%;
    box-sizing: border-box;

    .btn-import,
    .btn-export {
      background: var(--button-bg, #4a9eff);
      color: var(--button-text, #ffffff);

      &:hover:not(:disabled) {
        background: var(--button-hover-bg, #3a8eef);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(70, 120, 255, 0.3);
      }

      &:disabled {
        background: var(--bg-tertiary, #e0e0e0);
        cursor: not-allowed;
        opacity: 0.6;
      }
    }
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary, var(--border-secondary));
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.dialog-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-primary, var(--border-secondary));
  flex-shrink: 0;
}

.dialog-tab {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;

  &:hover:not(.active) {
    color: var(--text-primary);
    background: var(--bg-secondary);
  }

  &.active {
    color: var(--color-info);
    border-bottom-color: var(--color-info);
  }
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

.file-input {
  display: none;
}

.file-select-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-info);
    background: var(--bg-tertiary, var(--bg-secondary));
  }

  svg {
    flex-shrink: 0;
  }
}

.icon-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-info);
    color: var(--text-primary);
  }
}

.file-name {
  flex: 1;
  text-align: left;
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

// ファイル名入力欄(.text-field)と同じ「枠線にラベルが乗る」見た目を数量表示にも流用。
// .text-fieldのflex:1/min-widthをここでの用途向けに上書きするため、
// .preview-counts配下へのネストで自然にスコープする（詳細度ハックは使わない）
.preview-counts {
  display: flex;
  gap: 14px;

  .text-field {
    flex: none;
    min-width: 72px;
  }
}

.count-value {
  padding: 8px 12px 6px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.import-mode-group {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
}

.radio-pill {
  position: relative;
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
    color: var(--text-primary);
  }

  &.active {
    background: linear-gradient(135deg, #0089ff 0%, #0068d9 100%);
    color: #fff;
    border-color: #0068d9;

    &:hover {
      filter: brightness(1.1);
      box-shadow: 0 2px 6px rgba(0, 104, 217, 0.4);
    }
  }
}

.preview-image-area {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.preview-image-area-idle {
  align-items: center;
  justify-content: center;
  min-height: 60px;
}

.preview-view-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.preview-view-tabs {
  display: flex;
  gap: 4px;
}

.preview-image-placeholder-text {
  align-self: center;
  color: var(--text-tertiary, var(--text-secondary));
  font-size: 12px;

  &.error {
    color: var(--color-error-text, var(--color-error));
  }
}

.preview-image-wrapper {
  position: relative;
  align-self: center;
  width: 82%;
}

// プレビュー内容(画像/テキスト/プレースホルダー)切替時のフェード
// (v-if/v-else-ifによる排他表示のため、常に片方のみ存在しmode="out-in"で二重表示は起きない)
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.preview-image {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 4px;
  border: 1px solid var(--border-primary);
}

.imported-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  pointer-events: none;
}

.preview-text-view {
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  box-sizing: border-box;
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

.export-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-primary, var(--border-secondary));
}

.sub-tabs {
  display: flex;
  gap: 4px;
}

.sub-tab-btn {
  padding: 6px 14px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;

  &:hover:not(.active) {
    color: var(--text-primary);
  }

  &.active {
    color: var(--color-info);
    border-bottom-color: var(--color-info);
  }
}

.export-preview {
  display: block;
  width: 100%;
  flex: 1;
  min-height: 100px;
  margin-bottom: 16px;
  padding: 10px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  resize: none;
  box-sizing: border-box;
}

.column-toggle-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-bottom: 12px;
}

.column-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  &.dragging {
    opacity: 0.4;
  }

  // 無効時は一目で「オフ」と分かるよう取り消し線を付ける
  &:not(.active) {
    text-decoration: line-through;
  }
}

.drag-handle {
  flex-shrink: 0;
  opacity: 0.6;
}

.column-reset-btn {
  margin-left: auto;
  width: 28px;
  height: 28px;
}

.export-filename-row {
  display: flex;
  align-items: flex-end;
  flex-shrink: 0;
  gap: 8px;
}

/* 枠線にラベルがかかるテキスト入力欄（ImageDialog.vueのtitle-fieldと共通デザイン） */
.text-field {
  position: relative;
  display: block;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  border: 2px solid var(--input-border);
  border-radius: 6px;
  background: var(--input-bg);
  transition: border-color 0.2s;
}

.text-field:focus-within {
  border-color: var(--button-bg);
}

.field-label {
  position: absolute;
  top: -9px;
  left: 10px;
  padding: 0 4px;
  background: var(--dialog-bg, #fff);
  color: var(--text-secondary, #666);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
  pointer-events: none;
}

.field-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  background: transparent;
  color: var(--input-text);
  font-size: 14px;
  padding: 11px 12px 9px;
}

.toggle-pill {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
    color: var(--text-primary);
  }

  &.active {
    background: linear-gradient(135deg, #0089ff 0%, #0068d9 100%);
    color: #fff;
    border-color: #0068d9;

    &:hover {
      filter: brightness(1.1);
      box-shadow: 0 2px 6px rgba(0, 104, 217, 0.4);
    }
  }
}

// Side Deck・カラムピル等「出力に含めるか」の包含トグルは、
// Import Modeの「選択」やタブ/主要アクションの青と区別するため緑系にする
.toggle-pill-success {
  &:hover {
    border-color: var(--color-success);
    background: var(--color-success-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--color-success-gradient, var(--color-success));
    color: #fff;
    border-color: var(--color-success);

    &:hover {
      filter: brightness(1.1);
      box-shadow: 0 2px 6px rgba(76, 175, 80, 0.4);
    }
  }
}

// カラムピルはSide Deckとは別機能のため、緑ではなくオレンジ系で区別する
.toggle-pill-warning {
  &:hover {
    border-color: var(--color-warning);
    background: var(--color-warning-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--color-warning-gradient, var(--color-warning));
    color: #fff;
    border-color: var(--color-warning);

    &:hover {
      filter: brightness(1.1);
      box-shadow: 0 2px 6px rgba(255, 152, 0, 0.4);
    }
  }
}

.file-extension {
  flex-shrink: 0;
  align-self: center;
  color: var(--text-secondary, var(--text-secondary));
  font-size: 14px;
  font-weight: 500;
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
</style>
