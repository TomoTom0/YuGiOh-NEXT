<template>
  <div class="card-detail-view">
    <div class="card-detail-tabs">
      <button 
        :class="{ active: cardTab === 'info' }"
        @click="$emit('tab-change', 'info')"
      >Info</button>
      <button 
        :class="{ active: cardTab === 'qa' }"
        @click="$emit('tab-change', 'qa')"
      >Q&A</button>
      <button 
        :class="{ active: cardTab === 'related' }"
        @click="$emit('tab-change', 'related')"
      >Related</button>
      <button 
        :class="{ active: cardTab === 'products' }"
        @click="$emit('tab-change', 'products')"
      >Products</button>
    </div>
    
    <div class="card-tab-content">
      <CardInfo
        v-show="cardTab === 'info'"
        v-if="detail && detail.card"
        :supplement-info="faqListData?.supplementInfo"
        :supplement-date="faqListData?.supplementDate"
        :pendulum-supplement-info="faqListData?.pendulumSupplementInfo"
        :pendulum-supplement-date="faqListData?.pendulumSupplementDate"
      />
      <div v-show="cardTab === 'info' && (!detail || !detail.card)">
        <p class="no-card-selected">カードを選択してください</p>
      </div>
      
      <CardQA
        v-show="cardTab === 'qa'"
        :faqListData="faqListData"
        :loading="loading"
      />
      
      <div v-show="cardTab === 'related'" class="tab-content">
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
          @scroll-to-top="handleScrollToTop"
          @update:sortOrder="relatedSortOrder = $event"
          @update:viewMode="relatedViewMode = $event"
        />
      </div>
      
      <CardProducts
        v-show="cardTab === 'products'"
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
import { getCardDetail } from '../api/card-search'
import { getCardFAQList } from '../api/card-faq'
import { useDeckEditStore } from '../stores/deck-edit'

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
    },
    cardTab: {
      type: String,
      default: 'info'
    }
  },
  emits: ['tab-change'],
  setup(props) {
    const deckStore = useDeckEditStore()
    const detail = ref(null)
    const loading = ref(false)
    const faqListData = ref(null)
    
    const relatedSortOrder = ref('release_desc')
    const relatedViewMode = ref('list')
    const relatedCurrentPage = ref(0)
    const relatedLoadingMore = ref(false)
    const relatedCardsPerPage = 100
    
    const sortedRelatedCards = computed(() => {
      if (!detail.value || !detail.value.relatedCards) return []
      
      const cards = [...detail.value.relatedCards]
      switch (relatedSortOrder.value) {
        case 'release_desc':
          return cards.sort((a, b) => (b.releaseDate || 0) - (a.releaseDate || 0))
        case 'release_asc':
          return cards.sort((a, b) => (a.releaseDate || 0) - (b.releaseDate || 0))
        case 'name_asc':
          return cards.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        case 'name_desc':
          return cards.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
        default:
          return cards
      }
    })
    
    const displayedRelatedCards = computed(() => {
      const endIndex = (relatedCurrentPage.value + 1) * relatedCardsPerPage
      return sortedRelatedCards.value.slice(0, endIndex)
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
    
    const handleScrollToTop = () => {
      const cardTabContent = document.querySelector('.card-tab-content')
      if (cardTabContent) {
        cardTabContent.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    
    const loadMoreRelatedCards = () => {
      if (relatedLoadingMore.value) return
      
      const totalCards = sortedRelatedCards.value.length
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
        console.log('[CardDetail] fetchDetail: no card')
        detail.value = null
        faqListData.value = null
        return
      }

      // 既に同じカードの詳細を取得済みなら再取得しない
      if (detail.value && detail.value.card.cardId === props.card.cardId) {
        console.log('[CardDetail] fetchDetail: skipping (already fetched)', detail.value.card.cardId)
        return
      }

      console.log('[CardDetail] fetchDetail: fetching for cardId', props.card.cardId)
      loading.value = true
      try {
        const detailResult = await getCardDetail(props.card)
        const faqResult = await getCardFAQList(props.card.cardId)
        console.log('[CardDetail] Card detail fetched:', JSON.stringify({
          cardId: detailResult.card.cardId,
          name: detailResult.card.name,
          ciid: detailResult.card.ciid,
          imgsLength: detailResult.card.imgs?.length || 0,
          imgs: detailResult.card.imgs?.map(img => ({ ciid: img.ciid })) || []
        }))
        console.log('FAQ fetched:', faqResult)
        detail.value = detailResult
        faqListData.value = faqResult
        // selectedCardの更新はwatchで行う
      } catch (error) {
        console.error('Failed to fetch card detail:', error)
        detail.value = null
        faqListData.value = null
      } finally {
        loading.value = false
      }
    }
    
    // カードが変わったら詳細を取得
    watch(() => props.card, () => {
      relatedCurrentPage.value = 0
      fetchDetail()
    }, { immediate: true })

    // detailが更新されたらselectedCardを同期
    watch(() => detail.value, (newDetail) => {
      if (newDetail && newDetail.card) {
        // 詳細情報で selectedCard を更新（imgs配列も新しい配列として設定）
        const oldCiid = deckStore.selectedCard?.ciid
        deckStore.selectedCard = {
          ...newDetail.card,
          imgs: [...newDetail.card.imgs],  // 配列も新しくコピー
          ciid: (deckStore.selectedCard?.cardId === newDetail.card.cardId && oldCiid) || newDetail.card.ciid
        }
        console.log('[CardDetail] selectedCard synced with detail')
      }
    }, { deep: false })

    return {
      detail,
      loading,
      faqListData,
      relatedSortOrder,
      relatedViewMode,
      sortedRelatedCards,
      displayedRelatedCards,
      relatedLoadingMore,
      handleRelatedSortChange,
      handleRelatedScroll,
      handleScrollToTop
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
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 2px solid #008cff;
  width: 100%;
  
  button {
    padding: 8px;
    border: none;
    background: white;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-primary);
    flex: 1;
    
    &.active {
      background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
      color: white;
    }
  }
}

.card-tab-content {
  padding: 15px;
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
  font-size: 12px;
}

.loading {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
