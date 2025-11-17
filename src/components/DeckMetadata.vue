<template>
  <div class="deck-metadata">
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
      <label class="metadata-label">カテゴリ（複数選択可）</label>
      <div class="category-selector">
        <input
          v-model="categorySearchQuery"
          type="text"
          class="metadata-input"
          placeholder="カテゴリを検索..."
          @focus="showCategoryDropdown = true"
        />
        <div v-if="showCategoryDropdown" class="category-dropdown">
          <div
            v-for="(label, id) in filteredCategories"
            :key="id"
            class="category-option"
            @click="toggleCategory(id)"
          >
            <input
              type="checkbox"
              :checked="localCategory.includes(id)"
              @click.stop="toggleCategory(id)"
            />
            <span>{{ label }}</span>
          </div>
        </div>
        <div class="selected-categories">
          <span
            v-for="catId in localCategory"
            :key="catId"
            class="tag"
          >
            {{ categories[catId] }}
            <button class="tag-remove" @click="removeCategory(catId)">×</button>
          </span>
        </div>
      </div>
    </div>

    <div class="metadata-section">
      <label class="metadata-label">タグ（複数選択可）</label>
      <div class="tag-selector">
        <input
          v-model="tagSearchQuery"
          type="text"
          class="metadata-input"
          placeholder="タグを検索..."
          @focus="showTagDropdown = true"
        />
        <div v-if="showTagDropdown" class="tag-dropdown">
          <div
            v-for="(label, id) in filteredTags"
            :key="id"
            class="tag-option"
            @click="toggleTag(id)"
          >
            <input
              type="checkbox"
              :checked="localTags.includes(id)"
              @click.stop="toggleTag(id)"
            />
            <span>{{ label }}</span>
          </div>
        </div>
        <div class="selected-tags">
          <span
            v-for="tagId in localTags"
            :key="tagId"
            class="tag"
          >
            {{ tags[tagId] }}
            <button class="tag-remove" @click="removeTag(tagId)">×</button>
          </span>
        </div>
      </div>
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

    <div class="metadata-actions">
      <button class="btn btn-save" @click="saveDeckMetadata">
        保存
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useDeckEditStore } from '../stores/deck-edit';
import type { DeckTypeValue, DeckStyleValue } from '../types/deck-metadata';
import { getDeckMetadata } from '../utils/deck-metadata-loader';

const deckStore = useDeckEditStore();

// メタデータ（カテゴリ・タグマスター）
const categories = ref<Record<string, string>>({});
const tags = ref<Record<string, string>>({});

// ローカル状態
const localIsPublic = ref(deckStore.deckInfo.isPublic ?? false);
const localDeckType = ref<DeckTypeValue>(deckStore.deckInfo.deckType ?? '0');
const localDeckStyle = ref<DeckStyleValue>(deckStore.deckInfo.deckStyle ?? '-1');
const localCategory = ref<string[]>([...(deckStore.deckInfo.category ?? [])]);
const localTags = ref<string[]>([...(deckStore.deckInfo.tags ?? [])]);
const localComment = ref(deckStore.deckInfo.comment ?? '');

// カテゴリ検索用
const categorySearchQuery = ref('');
const showCategoryDropdown = ref(false);

// タグ検索用
const tagSearchQuery = ref('');
const showTagDropdown = ref(false);

// カテゴリ検索フィルタ
const filteredCategories = computed(() => {
  if (!categorySearchQuery.value) {
    return categories.value;
  }
  const query = categorySearchQuery.value.toLowerCase();
  return Object.fromEntries(
    Object.entries(categories.value).filter(([_, label]) =>
      label.toLowerCase().includes(query)
    )
  );
});

// タグ検索フィルタ
const filteredTags = computed(() => {
  if (!tagSearchQuery.value) {
    return tags.value;
  }
  const query = tagSearchQuery.value.toLowerCase();
  return Object.fromEntries(
    Object.entries(tags.value).filter(([_, label]) =>
      label.toLowerCase().includes(query)
    )
  );
});

// マウント時にメタデータを読み込み
onMounted(async () => {
  const metadata = await getDeckMetadata();
  categories.value = metadata.categories;
  // タグは現時点ではメタデータに含まれていないため、空のままにする
  // TODO: updateDeckMetadata() でタグマスターも取得するように修正が必要
  tags.value = {};
});

// storeの変更を監視してローカル状態を更新
watch(() => deckStore.deckInfo, (newDeckInfo) => {
  localIsPublic.value = newDeckInfo.isPublic ?? false;
  localDeckType.value = newDeckInfo.deckType ?? '0';
  localDeckStyle.value = newDeckInfo.deckStyle ?? '-1';
  localCategory.value = [...(newDeckInfo.category ?? [])];
  localTags.value = [...(newDeckInfo.tags ?? [])];
  localComment.value = newDeckInfo.comment ?? '';
}, { deep: true });

// 更新関数
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

function toggleCategory(catId: string) {
  const index = localCategory.value.indexOf(catId);
  if (index >= 0) {
    localCategory.value.splice(index, 1);
  } else {
    localCategory.value.push(catId);
  }
  deckStore.deckInfo.category = [...localCategory.value];
}

function removeCategory(catId: string) {
  const index = localCategory.value.indexOf(catId);
  if (index >= 0) {
    localCategory.value.splice(index, 1);
    deckStore.deckInfo.category = [...localCategory.value];
  }
}

function toggleTag(tagId: string) {
  const index = localTags.value.indexOf(tagId);
  if (index >= 0) {
    localTags.value.splice(index, 1);
  } else {
    localTags.value.push(tagId);
  }
  deckStore.deckInfo.tags = [...localTags.value];
}

function removeTag(tagId: string) {
  const index = localTags.value.indexOf(tagId);
  if (index >= 0) {
    localTags.value.splice(index, 1);
    deckStore.deckInfo.tags = [...localTags.value];
  }
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

.category-selector {
  position: relative;
}

.category-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  margin-top: 4px;
  z-index: 100;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.category-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--bg-secondary);
  }

  input[type="checkbox"] {
    cursor: pointer;
  }

  span {
    font-size: 13px;
    color: var(--text-primary);
  }
}

.selected-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  min-height: 40px;
}

.tag-selector {
  position: relative;
}

.tag-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  margin-top: 4px;
  z-index: 100;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.tag-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--bg-secondary);
  }

  input[type="checkbox"] {
    cursor: pointer;
  }

  span {
    font-size: 13px;
    color: var(--text-primary);
  }
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
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
