<template>
  <div class="card-detail-view">
    <div class="card-detail-tabs">
      <button
        :class="{ active: cardDetailStore.cardTab === 'info' }"
        @click="cardDetailStore.setCardTab('info')"
      >Info</button>
      <button
        :class="{ active: cardDetailStore.cardTab === 'qa' }"
        @click="cardDetailStore.setCardTab('qa')"
      >Q&A</button>
      <button
        :class="{ active: cardDetailStore.cardTab === 'related' }"
        @click="cardDetailStore.setCardTab('related')"
      >Related</button>
      <button
        :class="{ active: cardDetailStore.cardTab === 'products' }"
        @click="cardDetailStore.setCardTab('products')"
      >Products</button>
      <div class="history-nav">
        <button
          class="history-btn"
          :disabled="!cardDetailStore.canGoBack"
          @click="cardDetailStore.goBack()"
          title="戻る"
        >
          <svg width="10" height="10" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
          </svg>
        </button>
        <button
          class="history-btn"
          :disabled="!cardDetailStore.canGoForward"
          @click="cardDetailStore.goForward()"
          title="進む"
        >
          <svg width="10" height="10" viewBox="0 0 24 24">
            <path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
          </svg>
        </button>
      </div>
    </div>

    <div class="ygo-next card-tab-content">
      <CardInfo
        v-show="cardDetailStore.cardTab === 'info'"
        v-if="detail && detail.card"
        :supplement-info="faqListData?.supplementInfo"
        :supplement-date="faqListData?.supplementDate"
        :pendulum-supplement-info="faqListData?.pendulumSupplementInfo"
        :pendulum-supplement-date="faqListData?.pendulumSupplementDate"
      />
      <div v-show="cardDetailStore.cardTab === 'info' && (!detail || !detail.card)">
        <p class="no-card-selected">カードを選択してください</p>
      </div>

      <CardQA
        v-show="cardDetailStore.cardTab === 'qa'"
        :faqListData="faqListData"
        :loading="loading"
      />

      <div v-show="cardDetailStore.cardTab === 'related'" class="ygo-next tab-content">
        <div v-if="loading" class="loading">読み込み中...</div>
        <div v-else-if="!detail || !detail.relatedCards || detail.relatedCards.length === 0" class="no-data">
          関連カード情報がありません
        </div>
        <CardList
          v-else
          :cards="displayedRelatedCards"
          :sortOrder="relatedSortOrder"
          :viewMode="relatedViewMode"
          sectionType="search"
          uniqueId="related"
          @sort-change="handleRelatedSortChange"
          @scroll="handleRelatedScroll"
          @update:sortOrder="relatedSortOrder = $event"
          @update:viewMode="relatedViewMode = $event"
        />
      </div>
      
      <CardProducts
        v-show="cardDetailStore.cardTab === 'products'"
        :detail="detail"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue'
import CardInfo from './CardInfo.vue'
import CardQA from './CardQA.vue'
import CardProducts from './CardProducts.vue'
import CardList from './CardList.vue'
import { getCardDetail, getCardDetailWithCache, saveCardDetailToCache } from '../api/card-search'
import { getCardFAQList } from '../api/card-faq'
import { useCardDetailStore } from '../stores/card-detail'
import { getUnifiedCacheDB } from '../utils/unified-cache-db'
import { detectLanguage } from '../utils/language-detector'

export default {
  name: 'CardDetail',
  components: {
    CardInfo,
    CardQA,
    CardProducts,
    CardList
  },
  props: {
    card: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const cardDetailStore = useCardDetailStore()
    const detail = ref(null)
    const loading = ref(false)
    const faqListData = ref(null)

    const relatedSortOrder = ref('release_desc')
    const relatedViewMode = ref('list')
    const relatedCurrentPage = ref(0)
    const relatedLoadingMore = ref(false)
    const relatedCardsPerPage = 100
    
    const displayedRelatedCards = computed(() => {
      if (!detail.value || !detail.value.relatedCards) return []
      const endIndex = (relatedCurrentPage.value + 1) * relatedCardsPerPage
      return detail.value.relatedCards.slice(0, endIndex)
    })
    
    const handleRelatedSortChange = () => {
      relatedCurrentPage.value = 0
    }
    
    const handleRelatedScroll = (event) => {
      const element = event.target
      const scrollThreshold = 100
      
      if (element.scrollHeight - element.scrollTop - element.clientHeight < scrollThreshold) {
        loadMoreRelatedCards()
      }
    }
    
    const loadMoreRelatedCards = () => {
      if (relatedLoadingMore.value) return

      const totalCards = detail.value?.relatedCards?.length || 0
      const currentDisplayed = displayedRelatedCards.value.length

      if (currentDisplayed >= totalCards) return

      relatedLoadingMore.value = true
      setTimeout(() => {
        relatedCurrentPage.value++
        relatedLoadingMore.value = false
      }, 300)
    }

    const fetchDetail = async () => {
      if (!props.card || !props.card.cardId) {
        detail.value = null
        faqListData.value = null
        return
      }
      loading.value = true

      try {
        // キャッシュ対応のカード詳細取得（関連カードのソートはクライアント側で実行）
        const currentLang = detectLanguage(document)
        const cacheResult = await getCardDetailWithCache(props.card.cardId, currentLang, true, 'release_desc')

        if (cacheResult.detail) {
          // キャッシュから取得した場合（または新規取得）
          // 詳細データを設定（一度だけ）
          detail.value = cacheResult.detail

          // selectedCardを更新
          // 仕様: card-info-cache.md line 52-53 - ciidはprops.cardを優先
          // detail.cardには既に基本情報（キャッシュから）+ 補足情報（詳細ページから）がマージ済み
          // UnifiedCacheDB から複数画像情報を含む完全なカード情報を取得（複数画像ボタン表示用）
          const unifiedDB = getUnifiedCacheDB()
          const fullCardInfo = unifiedDB.isInitialized()
            ? unifiedDB.reconstructCardInfo(props.card.cardId, currentLang)
            : null

          const selectedCardData = {
            ...(fullCardInfo || cacheResult.detail.card),
            ciid: props.card.ciid || cacheResult.detail.card.ciid
          }
          cardDetailStore.setSelectedCard(selectedCardData)

          // FAQデータを取得（常にAPIから取得 - キャッシュ済みデータは補足情報のみ）
          const faqResult = await getCardFAQList(props.card.cardId)
          faqListData.value = faqResult

          // バックグラウンドで関連カードの追加取得（100件以上ある場合）
          if (cacheResult.detail.fetchMorePromise) {
            cacheResult.detail.fetchMorePromise.then(async (allCards) => {
              // 現在表示中のカードと同じか確認
              if (detail.value && detail.value.card.cardId === props.card.cardId) {
                detail.value.relatedCards = allCards

                // キャッシュにも保存
                const unifiedDB = getUnifiedCacheDB()
                if (unifiedDB.isInitialized()) {
                  await saveCardDetailToCache(unifiedDB, detail.value, true)
                }
              }
            }).catch(error => {
              console.error('[CardDetail] Background fetch error:', error)
            })
          }

          // キャッシュが期限切れの場合は同期的に再取得
          if (cacheResult.fromCache && !cacheResult.isFresh) {
            // 同期的に再取得
            await revalidateInBackground(props.card.cardId)
          }
        } else {
          detail.value = null
          faqListData.value = null
        }
      } catch (error) {
        console.error('Failed to fetch card detail:', error)
        detail.value = null
        faqListData.value = null
      } finally {
        loading.value = false
      }
    }

    // バックグラウンドでキャッシュを再検証
    const revalidateInBackground = async (cardId) => {
      try {
        // APIから最新データを取得（関連カードのソートはクライアント側で実行）
        const freshDetail = await getCardDetail(cardId, undefined, 'release_desc')
        if (!freshDetail) return
        
        // 共通関数でキャッシュに保存（強制更新）
        const unifiedDB = getUnifiedCacheDB()
        if (unifiedDB.isInitialized()) {
          await saveCardDetailToCache(unifiedDB, freshDetail, true)
        }

        // 現在表示中のカードと同じか確認
        if (detail.value && detail.value.card.cardId === cardId) {
          // キー単位で差分を検出して更新
          const changedKeys = []
          
          for (const key of Object.keys(freshDetail)) {
            const currentVal = JSON.stringify(detail.value[key])
            const freshVal = JSON.stringify(freshDetail[key])
            
            if (currentVal !== freshVal) {
              changedKeys.push(key)
              detail.value[key] = freshDetail[key]
            }
          }

          if (changedKeys.length > 0) {
            // cardが更新された場合はselectedCardも更新（ただしciidは保持）
            if (changedKeys.includes('card')) {
              const currentCiid = cardDetailStore.selectedCard?.ciid
              cardDetailStore.setSelectedCard({
                ...freshDetail.card,
                ciid: currentCiid || freshDetail.card.ciid
              })
            }
          }
        }
      } catch (error) {
        console.error('[CardDetail] Revalidation error:', error)
      }
    }
    
    
    // Watch for card prop changes and refetch detail when cardId changes
    watch(() => props.card && props.card.cardId, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        cardDetailStore.setCardTab('info')
        fetchDetail()
      }
    }, { immediate: true })

    return {
      cardDetailStore,
      detail,
      loading,
      faqListData,
      relatedSortOrder,
      relatedViewMode,
      displayedRelatedCards,
      relatedLoadingMore,
      handleRelatedSortChange,
      handleRelatedScroll
    }
  }
}
</script>

<style lang="scss" scoped>
.card-detail-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-detail-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr) auto;
  border-bottom: 2px solid var(--tab-border, #008cff);
  width: 100%;

  & > button:not(.history-btn) {
    padding: 8px;
    border: none;
    border-right: 1px solid var(--border-primary, #e0e0e0);
    background: var(--bg-primary);
    cursor: pointer;
    font-size: calc(var(--right-area-font-size, 14px) * 0.86);
    color: var(--text-primary);
    flex: 1;
    transition: background 0.2s ease, color 0.2s ease;

    &:hover:not(.active) {
      background: var(--bg-hover, rgba(0, 140, 255, 0.1));
    }

    &:focus-visible {
      outline: 2px solid var(--color-success, #4caf50);
      outline-offset: -2px;
      z-index: 1;
    }

    &.active {
      background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
      color: var(--theme-text-on-gradient);
      border-right-color: transparent;
    }
  }
}

.history-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  background: var(--bg-primary);
}

.history-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--button-default-bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-color: var(--color-info, #008cff);
  }

  &:disabled {
    opacity: 0.5;
    background: var(--bg-tertiary);
    border-color: var(--border-secondary);
  }

  svg {
    display: block;
    width: 14px;
    height: 14px;
  }
}

.card-tab-content {
  padding: 5px;
  flex: 1;
  overflow-y: scroll;
  width: 100%;
  box-sizing: border-box;
}

.no-card-selected,
.no-data {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: calc(var(--right-area-font-size, 14px) * 0.86);
}

.loading {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: calc(var(--right-area-font-size, 14px) * 0.86);
}
</style>
