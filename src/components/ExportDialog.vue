<template>
  <div v-if="isVisible" class="export-dialog-overlay" @click.self="close">
    <div class="export-dialog">
      <div class="dialog-header common">
        <h3 class="dialog-title">Export Deck</h3>
        <button class="close-btn" @click="close" title="Close">×</button>
      </div>

      <div class="dialog-body">
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
        <button class="btn btn-export" @click="handleExport">Export</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { downloadDeckAsCSV, downloadDeckAsTXT } from '@/utils/deck-export';
// @ts-ignore - Used in defineProps type
import type { DeckInfo } from '@/types/deck';

const props = withDefaults(
  defineProps<{
    isVisible: boolean;
    deckInfo: DeckInfo | null;
    dno?: string;
  }>(),
  {
    dno: ''
  }
);

const emit = defineEmits<{
  close: [];
  exported: [format: string];
}>();

// フォーマット（CSV or TXT）
const format = ref<'csv' | 'txt'>('csv');

// サイドデッキを含めるか
const includeSide = ref(true);

// ファイル名（拡張子を除く）
const filenameBase = ref('');

// dnoが変更されたらファイル名を更新
computed(() => {
  if (props.dno) {
    filenameBase.value = `deck-${props.dno}`;
  } else {
    filenameBase.value = 'deck';
  }
});

// 閉じる
function close() {
  emit('close');
}

// エクスポート実行
function handleExport() {
  if (!props.deckInfo) {
    console.error('[ExportDialog] No deck info available');
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
.export-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--dialog-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.export-dialog {
  background: var(--bg-primary, #ffffff);
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 480px;
  max-height: 90vh;
  overflow: auto;
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-secondary, #eee);
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
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #000);
  font-size: 14px;
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

.preview-info {
  display: flex;
  gap: 16px;
  padding: 12px;
  background: var(--bg-secondary, var(--bg-secondary));
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-secondary, var(--text-secondary));
}

.preview-info span {
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

.btn-export {
  background: #4678ff;
  color: #fff;
}

.btn-export:hover {
  background: #3565e8;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(70, 120, 255, 0.3);
}
</style>
