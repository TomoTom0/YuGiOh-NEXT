<template>
  <div class="deck-metadata">
    <div class="metadata-section">
      <label class="metadata-label">デッキ名</label>
      <input
        v-model="localDeckName"
        type="text"
        class="metadata-input"
        placeholder="デッキ名を入力"
        @blur="updateDeckName"
      />
    </div>

    <div class="metadata-section">
      <label class="metadata-label">公開設定</label>
      <div class="toggle-switch">
        <input
          id="public-toggle"
          v-model="localIsPublic"
          type="checkbox"
          @change="updatePublicStatus"
        />
        <label for="public-toggle" class="toggle-label">
          <span class="toggle-text">{{ localIsPublic ? '公開' : '非公開' }}</span>
        </label>
      </div>
    </div>

    <div class="metadata-section">
      <label class="metadata-label">デッキタイプ</label>
      <select
        v-model="localDeckType"
        class="metadata-select"
        @change="updateDeckType"
      >
        <option value="0">OCG（マスタールール）</option>
        <option value="1">OCG（スピードルール）</option>
        <option value="2">デュエルリンクス</option>
        <option value="3">マスターデュエル</option>
      </select>
    </div>

    <div class="metadata-section">
      <label class="metadata-label">デッキスタイル</label>
      <select
        v-model="localDeckStyle"
        class="metadata-select"
        @change="updateDeckStyle"
      >
        <option value="-1">未選択</option>
        <option value="0">キャラクター</option>
        <option value="1">トーナメント</option>
        <option value="2">コンセプト</option>
      </select>
    </div>

    <div class="metadata-section">
      <label class="metadata-label">コメント</label>
      <textarea
        v-model="localComment"
        class="metadata-textarea"
        placeholder="デッキのコメントを入力"
        rows="4"
        @blur="updateComment"
      ></textarea>
    </div>

    <div class="metadata-section">
      <label class="metadata-label">タグ</label>
      <div class="tags-container">
        <span
          v-for="(tag, index) in localTags"
          :key="index"
          class="tag"
        >
          {{ tag }}
          <button class="tag-remove" @click="removeTag(index)">×</button>
        </span>
        <input
          v-model="newTag"
          type="text"
          class="tag-input"
          placeholder="タグを追加"
          @keyup.enter="addTag"
        />
      </div>
    </div>

    <div class="metadata-actions">
      <button class="btn btn-save" @click="saveDeckMetadata">
        保存
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDeckEditStore } from '../stores/deck-edit';
import type { DeckTypeValue, DeckStyleValue } from '../types/deck-metadata';

const deckStore = useDeckEditStore();

// ローカル状態
const localDeckName = ref(deckStore.deckInfo.name);
const localIsPublic = ref(deckStore.deckInfo.isPublic ?? false);
const localDeckType = ref<DeckTypeValue>(deckStore.deckInfo.deckType ?? '0');
const localDeckStyle = ref<DeckStyleValue>(deckStore.deckInfo.deckStyle ?? '-1');
const localComment = ref(deckStore.deckInfo.comment ?? '');
const localTags = ref<string[]>([...(deckStore.deckInfo.tags ?? [])]);
const newTag = ref('');

// storeの変更を監視してローカル状態を更新
watch(() => deckStore.deckInfo, (newDeckInfo) => {
  localDeckName.value = newDeckInfo.name;
  localIsPublic.value = newDeckInfo.isPublic ?? false;
  localDeckType.value = newDeckInfo.deckType ?? '0';
  localDeckStyle.value = newDeckInfo.deckStyle ?? '-1';
  localComment.value = newDeckInfo.comment ?? '';
  localTags.value = [...(newDeckInfo.tags ?? [])];
}, { deep: true });

// 更新関数
function updateDeckName() {
  deckStore.deckInfo.name = localDeckName.value;
}

function updatePublicStatus() {
  deckStore.deckInfo.isPublic = localIsPublic.value;
}

function updateDeckType() {
  deckStore.deckInfo.deckType = localDeckType.value;
}

function updateDeckStyle() {
  deckStore.deckInfo.deckStyle = localDeckStyle.value;
}

function updateComment() {
  deckStore.deckInfo.comment = localComment.value;
}

function addTag() {
  if (newTag.value.trim() && !localTags.value.includes(newTag.value.trim())) {
    localTags.value.push(newTag.value.trim());
    deckStore.deckInfo.tags = [...localTags.value];
    newTag.value = '';
  }
}

function removeTag(index: number) {
  localTags.value.splice(index, 1);
  deckStore.deckInfo.tags = [...localTags.value];
}

async function saveDeckMetadata() {
  try {
    // deckInfoのdnoが存在する場合のみ保存可能
    if (!deckStore.deckInfo.dno) {
      alert('デッキが読み込まれていません。デッキを開いてから保存してください。');
      return;
    }

    // saveDeck関数を呼び出してサーバーに保存
    const result = await deckStore.saveDeck(deckStore.deckInfo.dno);

    if (result.success) {
      alert('メタデータを保存しました');
    } else {
      const errorMessage = Array.isArray(result.error)
        ? result.error.join('\n')
        : result.error || '保存に失敗しました';
      alert(`保存に失敗しました:\n${errorMessage}`);
    }
  } catch (error) {
    console.error('Save deck metadata error:', error);
    alert('保存中にエラーが発生しました');
  }
}
</script>

<style scoped lang="scss">
.deck-metadata {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
}

.metadata-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.metadata-input,
.metadata-select,
.metadata-textarea {
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--button-bg);
  }
}

.metadata-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  line-height: 1.5;
}

.toggle-switch {
  display: flex;
  align-items: center;
}

#public-toggle {
  display: none;
}

.toggle-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 120px;
  height: 32px;
  background: var(--bg-tertiary);
  border-radius: 16px;
  cursor: pointer;
  transition: background 0.3s;
  padding: 0 12px;

  &::before {
    content: '';
    position: absolute;
    width: 24px;
    height: 24px;
    background: white;
    border-radius: 50%;
    left: 4px;
    transition: transform 0.3s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

#public-toggle:checked + .toggle-label {
  background: var(--button-bg);

  &::before {
    transform: translateX(88px);
  }
}

.toggle-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-left: 32px;
}

#public-toggle:checked + .toggle-label .toggle-text {
  color: white;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  min-height: 40px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--button-bg);
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.tag-input {
  flex: 1;
  min-width: 120px;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
  color: var(--text-primary);

  &::placeholder {
    color: var(--text-tertiary);
  }
}

.metadata-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save {
  background: var(--button-bg);
  color: white;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
