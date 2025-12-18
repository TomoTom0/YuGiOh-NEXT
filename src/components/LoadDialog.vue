<template>
  <div v-if="isVisible" class="ygo-next">
    <div class="dialog-overlay" @click="close">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header common">
          <h2 class="dialog-title">Load Deck</h2>
          <button class="close-btn" @click="close">×</button>
        </div>
        <div class="dialog-body" ref="dialogBodyRef">
          <div v-if="!deckStore.deckList || deckStore.deckList.length === 0" class="no-decks">
            <svg width="48" height="48" viewBox="0 0 24 24" style="margin-bottom: 12px; opacity: 0.3;">
              <path fill="currentColor" d="M20,6H12L10,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8A2,2 0 0,0 20,6M20,18H4V6H9.17L11.17,8H20V18M11,13H13V17H11V13M11,9H13V11H11V9Z" />
            </svg>
            <p>デッキがありません</p>
          </div>
          <div v-else class="deck-grid">
            <div
              v-for="deck in paginatedDeckList"
              :key="deck.dno"
              class="deck-card"
              @click="loadDeck(deck.dno)"
            >
              <!-- デッキ名 -->
              <div
                class="deck-name"
                :class="[
                  getDeckNameClass(deck.name || '(名称未設定)'),
                  { 'current-deck': deck.dno === deckStore.deckInfo.dno }
                ]"
              >
                <span class="deck-name-text">{{ deck.name || '(名称未設定)' }}</span>
                <span v-if="getDeckCardCount(deck.dno)!" class="deck-count">
                  [{{ getDeckCardCount(deck.dno)!.main }}/{{ getDeckCardCount(deck.dno)!.extra }}/{{ getDeckCardCount(deck.dno)!.side }}]
                </span>
              </div>

              <!-- サムネイル画像 -->
              <div class="deck-thumbnail-container">
                <!-- dno chip -->
                <span class="dno-chip" :class="{ 'current-deck': deck.dno === deckStore.deckInfo.dno }">{{ deck.dno }}</span>
                <!-- サムネイルがある場合: カード画像を5枚横並び -->
                <img
                  v-if="deckStore.deckThumbnails.has(deck.dno)"
                  :src="deckStore.deckThumbnails.get(deck.dno)"
                  :alt="`${deck.name}のサムネイル`"
                  class="thumbnail-image"
                />
                <!-- サムネイルがない場合: グラデーション画像 -->
                <div v-else class="thumbnail-gradient"></div>
              </div>
            </div>
          </div>
          <!-- ページングコントロール -->
          <div v-if="totalPages > 1" class="pagination-controls">
            <button
              class="pagination-btn"
              :disabled="currentPage === 0"
              @click="goToPrevPage"
            >
              前のページ
            </button>
            <span class="pagination-info">
              {{ currentPage + 1 }} / {{ totalPages }}
            </span>
            <button
              class="pagination-btn"
              :disabled="currentPage >= totalPages - 1"
              @click="goToNextPage"
            >
              次のページ
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDeckEditStore } from '@/stores/deck-edit'
import { generateThumbnailsInBackground } from '@/utils/deck-cache'

defineProps<{
  isVisible: boolean
}>()

const emit = defineEmits<{
  close: []
  deckLoaded: []
}>()

const deckStore = useDeckEditStore()

// ダイアログボディのref
const dialogBodyRef = ref<HTMLElement | null>(null)

// ページング用の現在のページ
const currentPage = ref(0)
const ITEMS_PER_PAGE = 24


// ダイアログを閉じる
const close = () => {
  currentPage.value = 0
  emit('close')
}

// ページング用のcomputed
const paginatedDeckList = computed(() => {
  if (!deckStore.deckList || deckStore.deckList.length === 0) return []
  const start = currentPage.value * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return deckStore.deckList.slice(start, end)
})

// デッキのカード枚数を取得する関数
const getDeckCardCount = (dno: number) => {
  return deckStore.cachedDeckInfos.get(dno)?.cardCount
}

const totalPages = computed(() => {
  if (!deckStore.deckList || deckStore.deckList.length === 0) return 0
  return Math.ceil(deckStore.deckList.length / ITEMS_PER_PAGE)
})

// ダイアログボディをトップにスクロール（共通関数）
const scrollToDialogTop = () => {
  dialogBodyRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

const goToNextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++
    scrollToDialogTop()

    // ページ移動時：該当ページのサムネイルを背景で生成
    const startIndex = currentPage.value * ITEMS_PER_PAGE
    generateThumbnailsInBackground(
      startIndex,
      ITEMS_PER_PAGE,
      deckStore.deckList,
      (dno: number) => deckStore.getDeckDetail(dno),
      deckStore.headPlacementCardIds,
      deckStore.deckThumbnails,
      deckStore.cachedDeckInfos
    )
  }
}

const goToPrevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--
    scrollToDialogTop()
  }
}


const loadDeck = async (dno: number) => {
  try {
    deckStore.showLoadDialog = false
    deckStore.setDeckName('')

    await deckStore.loadDeck(dno)

    localStorage.setItem('ygo_last_deck_dno', String(dno))

    // 親コンポーネントに通知（親側でスクロール処理を実行）
    emit('deckLoaded')
  } catch (error) {
    console.error('Load error:', error)
  }
}

const getDeckNameClass = (name: string) => {
  const length = name.length
  if (length > 20) return 'deck-name-xs'
  if (length > 15) return 'deck-name-sm'
  if (length > 10) return 'deck-name-md'
  return 'deck-name-lg'
}
</script>

<style scoped lang="scss">
.ygo-next {
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
    max-width: 900px;
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

  .dialog-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 28px;
    line-height: 1;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s, color 0.2s;

    &:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }
  }

  .dialog-body {
    padding: 12px;
    flex: 1;
    overflow-y: auto;
    min-height: 200px;
    width: calc(100% - 30px);
  }

  .no-decks {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: var(--text-secondary);
    text-align: center;

    p {
      margin: 0;
      font-size: 14px;
    }
  }

  .deck-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, 320px);
    gap: 8px;
    justify-content: center;
  }

  .deck-card {
    width: 320px;
    height: 96px;
    border: 1px solid var(--border-primary, #e0e0e0);
    border-radius: 6px;
    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 50%, var(--bg-secondary) 100%);
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;

    &:has(.deck-name.current-deck) {
      background: linear-gradient(
        135deg,
        var(--button-bg) 0%,
        color-mix(in srgb, var(--button-bg) 70%, #ffffff) 50%,
        var(--button-hover-bg) 100%
      );
    }

    &:hover {
      border-color: var(--text-tertiary, #999);
      background: var(--bg-primary, white);
    }

    .deck-thumbnail-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: absolute;
      top: 0;
      left: 0;

      .dno-chip {
        position: absolute;
        left: 4px;
        top: 4px;
        background: var(--dno-chip-bg, var(--bg-tertiary));
        color: var(--text-secondary);
        padding: 3px 8px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 600;
        z-index: 2;
        opacity: 0.85;

        &.current-deck {
          background: linear-gradient(135deg, var(--theme-color-start) 0%, var(--color-info) 50%, var(--theme-color-end) 100%);
          color: var(--button-text);
          opacity: 1;
        }
      }
    }

    .thumbnail-image {
      max-height: 96px;
      width: auto;
      height: auto;
    }

    .thumbnail-gradient {
      width: 100%;
      height: 96px;
      background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 50%, var(--bg-secondary) 100%);
      opacity: 0.6;
    }

    .deck-name {
      padding: 8px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.4;
      word-break: break-word;
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 2;
      background: color-mix(in srgb, var(--dialog-bg) 85%, transparent);
      backdrop-filter: blur(6px);
      overflow: hidden;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;

      &.current-deck {
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--button-bg) 60%, transparent),
          color-mix(in srgb, var(--button-hover-bg) 60%, transparent)
        );
        color: var(--text-primary);
      }

      .deck-name-text {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .deck-count {
        flex-shrink: 0;
        font-size: calc(var(--dialog-font-size) * 0.9);
        opacity: 0.9;
      }

      &.deck-name-lg {
        font-size: var(--dialog-font-size);
      }

      &.deck-name-md {
        font-size: calc(var(--dialog-font-size) * 0.9);
      }

      &.deck-name-sm {
        font-size: calc(var(--dialog-font-size) * 0.8);
      }

      &.deck-name-xs {
        font-size: calc(var(--dialog-font-size) * 0.7);
      }
    }
  }

  .pagination-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 16px;
    padding: 12px 0;
  }

  .pagination-btn {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background-color: var(--bg-tertiary);
      border-color: var(--primary-color);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .pagination-info {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 600;
    min-width: 80px;
    text-align: center;
  }
}
</style>
