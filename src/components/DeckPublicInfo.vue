<template>
  <div class="deck-public-info" v-if="showInfo">
    <div class="info-row">
      <div class="info-item">
        <label class="info-label">お気に入り数:</label>
        <span class="info-value">{{ favoriteCount }}</span>
      </div>
      <div class="info-item">
        <label class="info-label">いいね数:</label>
        <span class="info-value">{{ likes }}</span>
        <button
          v-if="!likesLoading"
          @click="refreshLikes"
          class="refresh-btn"
          title="いいね数を更新"
        >
          更新
        </button>
        <span v-else class="loading-indicator">読込中...</span>
      </div>
    </div>

    <div class="info-row">
      <div class="info-item">
        <label class="info-label">デッキコード:</label>
        <div class="code-container">
          <input
            v-if="deckCode"
            type="text"
            :value="deckCode"
            readonly
            class="deck-code-input"
          />
          <span v-else class="code-status">未発行</span>
          <button
            v-if="!deckCode"
            @click="issueDeckCode"
            class="issue-btn"
            :disabled="issueLoading"
            title="デッキコードを発行"
          >
            {{ issueLoading ? '発行中...' : '発行' }}
          </button>
          <button
            v-else
            @click="copyDeckCode"
            class="copy-btn"
            title="デッキコードをコピー"
          >
            コピー
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useDeckEditStore } from '../stores/deck-edit';
import { handleError, handleSuccess } from '../utils/error-handler';

const deckStore = useDeckEditStore();

// 公開側情報
const favoriteCount = ref(0);
const likes = ref(0);
const deckCode = ref('');

// ローディング状態
const likesLoading = ref(false);
const issueLoading = ref(false);
const showInfo = ref(false);

// マウント時に情報を取得
onMounted(async () => {
  // dno が利用可能かチェック
  if (!deckStore.deckInfo.dno) {
    return;
  }

  showInfo.value = true;

  // 公開デッキの場合のみ情報を取得
  if (deckStore.deckInfo.isPublic) {
    await loadPublicInfo();
  }
});

// 公開側情報を読み込む
async function loadPublicInfo() {
  try {
    // いいね数を取得（ope=11）
    const likesCount = await deckStore.getDeckLikes(deckStore.deckInfo.dno);
    likes.value = likesCount;

    // 注: デッキコードの発行は自動では行わない
    // ユーザーが「発行」ボタンをクリックした時のみ発行する
  } catch (error) {
    handleError(
      '[DeckPublicInfo]',
      'いいね数の読み込みに失敗しました',
      error,
      { showToast: false }
    );
  }
}

// いいね数を更新
async function refreshLikes() {
  likesLoading.value = true;
  try {
    const likesCount = await deckStore.getDeckLikes(deckStore.deckInfo.dno);
    likes.value = likesCount;
    handleSuccess('[DeckPublicInfo]', 'いいね数を更新しました');
  } catch (error) {
    handleError(
      '[DeckPublicInfo]',
      'いいね数の更新に失敗しました',
      error,
      { showToast: true }
    );
  } finally {
    likesLoading.value = false;
  }
}

// デッキコードを発行
async function issueDeckCode() {
  issueLoading.value = true;
  try {
    const code = await deckStore.issueDeckCode(deckStore.deckInfo.dno);
    if (code) {
      deckCode.value = code;
      handleSuccess('[DeckPublicInfo]', `デッキコードを発行しました: ${code}`);
    } else {
      handleError(
        '[DeckPublicInfo]',
        'デッキコードの発行に失敗しました',
        new Error('Empty response'),
        { showToast: true }
      );
    }
  } catch (error) {
    handleError(
      '[DeckPublicInfo]',
      'デッキコードの発行に失敗しました',
      error,
      { showToast: true }
    );
  } finally {
    issueLoading.value = false;
  }
}

// デッキコードをコピー
async function copyDeckCode() {
  if (!deckCode.value) return;

  try {
    await navigator.clipboard.writeText(deckCode.value);
    handleSuccess('[DeckPublicInfo]', 'デッキコードをコピーしました');
  } catch (error) {
    handleError(
      '[DeckPublicInfo]',
      'コピーに失敗しました',
      error,
      { showToast: true }
    );
  }
}

// 公開/非公開の切り替えを監視
watch(() => deckStore.deckInfo.isPublic, async (newIsPublic) => {
  if (newIsPublic) {
    await loadPublicInfo();
  }
});
</script>

<style scoped lang="scss">
.ygo-next {
  .deck-public-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    margin-bottom: 12px;
  }

  .info-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .info-label {
    font-weight: 600;
    font-size: 13px;
    min-width: 100px;
    color: var(--text-secondary);
  }

  .info-value {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .refresh-btn,
  .issue-btn,
  .copy-btn {
    padding: 4px 12px;
    font-size: 12px;
    border: 1px solid var(--border-color);
    background: var(--btn-bg);
    color: var(--text-primary);
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: var(--btn-bg-hover);
      border-color: var(--border-color-hover);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .code-container {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .deck-code-input {
    flex: 1;
    padding: 6px 8px;
    font-size: 13px;
    border: 1px solid var(--border-color);
    background: var(--input-bg);
    color: var(--text-primary);
    border-radius: 3px;
    font-family: monospace;

    &:read-only {
      background: var(--input-bg-readonly);
    }
  }

  .code-status {
    font-size: 13px;
    color: var(--text-secondary);
    font-style: italic;
  }

  .loading-indicator {
    font-size: 12px;
    color: var(--text-secondary);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }
}
</style>
