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
        v-if="card" 
        :card="card"
        :supplement-info="faqListData?.supplementInfo"
        :supplement-date="faqListData?.supplementDate"
      />
      <div v-show="cardTab === 'info' && !card">
        <p class="no-card-selected">カードを選択してください</p>
      </div>
      
      <div v-show="cardTab === 'qa'" class="tab-content">
        <div v-if="loading" class="loading">読み込み中...</div>
        <div v-else-if="!faqListData || !faqListData.faqs || faqListData.faqs.length === 0" class="no-data">
          Q&A情報がありません
        </div>
        <div v-else>
          <div class="qa-header">
            <div class="qa-card-name">{{ faqListData.cardName }}</div>
            <div v-if="faqListData.cardText" class="qa-card-text">{{ faqListData.cardText }}</div>
          </div>
          <div class="qa-list">
            <div v-for="(qa, index) in faqListData.faqs" :key="qa.faqId || index" class="qa-item">
              <div class="qa-question">Q: {{ qa.question }}</div>
              <div v-if="qa.updatedAt" class="qa-date">更新日: {{ qa.updatedAt }}</div>
              <button 
                v-if="!expandedQA[index]" 
                class="qa-expand-btn"
                @click="expandQA(qa.faqId, index)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                </svg>
              </button>
              <button 
                v-else
                class="qa-collapse-btn"
                @click="collapseQA(index)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19,13H5V11H19V13Z" />
                </svg>
              </button>
              <div v-if="expandedQA[index]" class="qa-answer-container">
                <div v-if="loadingQA[index]" class="qa-loading">読み込み中...</div>
                <div v-else-if="qaAnswers[index]" class="qa-answer">A: {{ qaAnswers[index] }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
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
          @update:sortOrder="relatedSortOrder = $event"
          @update:viewMode="relatedViewMode = $event"
        />
      </div>
      
      <div v-show="cardTab === 'products'" class="tab-content">
        <div v-if="loading" class="loading">読み込み中...</div>
        <div v-else-if="!detail || !detail.packs || detail.packs.length === 0" class="no-data">
          収録パック情報がありません
        </div>
        <div v-else class="pack-list">
          <div v-for="pack in groupedPacks" :key="`${pack.code}_${pack.name}`" class="pack-item">
            <div class="pack-name">{{ pack.name }}</div>
            <div class="pack-details">
              <div class="pack-date">{{ pack.releaseDate || '-' }}</div>
              <div class="pack-code">{{ pack.code || '-' }}</div>
              <div class="pack-rarities">
                <span 
                  v-for="(rarity, idx) in pack.rarities" 
                  :key="idx" 
                  class="rarity-badge"
                  :style="{ backgroundColor: rarity.color, borderColor: rarity.color }"
                >
                  {{ rarity.text }}
                </span>
              </div>
            </div>
            <button 
              v-if="!expandedPacks[pack.packId] && pack.packId"
              class="pack-expand-btn"
              @click="expandPack(pack.packId)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
              </svg>
            </button>
            <button 
              v-else-if="pack.packId"
              class="pack-collapse-btn"
              @click="collapsePack(pack.packId)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19,13H5V11H19V13Z" />
              </svg>
            </button>
            <div v-if="expandedPacks[pack.packId]" class="pack-cards-container">
              <div v-if="loadingPacks[pack.packId]" class="pack-loading">読み込み中...</div>
              <CardList
                v-else-if="packCards[pack.packId]"
                :cards="packCards[pack.packId]"
                :sortOrder="packSortOrders[pack.packId] || 'release_desc'"
                :viewMode="packViewModes[pack.packId] || 'list'"
                sectionType="search"
                :uniqueId="`pack-${pack.packId}`"
                @update:sortOrder="(val) => { packSortOrders[pack.packId] = val }"
                @update:viewMode="(val) => { packViewModes[pack.packId] = val }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue'
import CardInfo from './CardInfo.vue'
import DeckCard from './DeckCard.vue'
import CardList from './CardList.vue'
import { getCardDetail } from '../api/card-search'
import { getCardFAQList, getFAQDetail } from '../api/card-faq'

export default {
  name: 'CardDetail',
  components: {
    CardInfo,
    DeckCard,
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
    const detail = ref(null)
    const loading = ref(false)
    const faqListData = ref(null)
    
    const relatedSortOrder = ref('release_desc')
    const relatedViewMode = ref('list')
    const relatedCurrentPage = ref(0)
    const relatedLoadingMore = ref(false)
    const relatedCardsPerPage = 100
    
    const expandedQA = ref({})
    const loadingQA = ref({})
    const qaAnswers = ref({})
    
    const expandedPacks = ref({})
    const loadingPacks = ref({})
    const packCards = ref({})
    const packViewModes = ref({})
    const packSortOrders = ref({})
    
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
    
    const groupedPacks = computed(() => {
      if (!detail.value || !detail.value.packs) return []
      
      // 品番ごとにレアリティを集約
      const packMap = new Map()
      
      detail.value.packs.forEach(pack => {
        const key = `${pack.code}_${pack.name}`
        if (!packMap.has(key)) {
          packMap.set(key, {
            name: pack.name,
            code: pack.code,
            releaseDate: pack.releaseDate,
            packId: pack.packId,
            rarities: []
          })
        } else if (pack.packId && !packMap.get(key).packId) {
          // 既存エントリにpackIdがない場合は更新
          packMap.get(key).packId = pack.packId
        }
        if (pack.rarity) {
          packMap.get(key).rarities.push({
            text: pack.rarity,
            color: pack.rarityColor || '#ccc'
          })
        }
      })
      
      return Array.from(packMap.values())
    })
    
    const expandPack = async (packId) => {
      if (expandedPacks.value[packId]) return
      
      loadingPacks.value[packId] = true
      expandedPacks.value[packId] = true
      
      // デフォルト値を設定（リアクティブに）
      if (!packViewModes.value[packId]) {
        packViewModes.value = { ...packViewModes.value, [packId]: 'list' }
      }
      if (!packSortOrders.value[packId]) {
        packSortOrders.value = { ...packSortOrders.value, [packId]: 'release_desc' }
      }
      
      try {
        const url = `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&pid=${packId}&rp=99999`
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch pack cards')
        }
        
        const html = await response.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        
        // searchCardsByNameと同じパース処理を使う
        const { parseSearchResults } = await import('../api/card-search')
        const cards = parseSearchResults(doc)
        
        packCards.value[packId] = cards
      } catch (error) {
        console.error('Failed to fetch pack cards:', error)
        packCards.value[packId] = []
      } finally {
        loadingPacks.value[packId] = false
      }
    }
    
    const collapsePack = (packId) => {
      expandedPacks.value[packId] = false
    }
    
    const collapseQA = (index) => {
      const qaItem = document.querySelectorAll('.qa-item')[index]
      if (qaItem) {
        const beforeHeight = qaItem.scrollHeight
        
        // アニメーション用のクラスを追加
        qaItem.classList.add('collapsing')
        
        expandedQA.value[index] = false
        
        // アニメーション後にスクロール調整
        setTimeout(() => {
          const afterHeight = qaItem.scrollHeight
          const heightDiff = beforeHeight - afterHeight
          
          const container = qaItem.closest('.card-detail-content')
          if (container && heightDiff > 0) {
            const qaItemTop = qaItem.getBoundingClientRect().top
            const containerTop = container.getBoundingClientRect().top
            
            if (qaItemTop < containerTop + container.clientHeight) {
              // スムーズにスクロール
              container.scrollTo({
                top: Math.max(0, container.scrollTop - heightDiff),
                behavior: 'smooth'
              })
            }
          }
          
          qaItem.classList.remove('collapsing')
        }, 300)
      }
    }
    
    const expandQA = async (faqId, index) => {
      if (expandedQA.value[index]) return
      
      loadingQA.value[index] = true
      expandedQA.value[index] = true
      
      try {
        const faqDetail = await getFAQDetail(faqId)
        if (faqDetail && faqDetail.answer) {
          qaAnswers.value[index] = faqDetail.answer
        }
      } catch (error) {
        console.error('Failed to fetch FAQ detail:', error)
      } finally {
        loadingQA.value[index] = false
      }
    }
    
    const fetchDetail = async () => {
      if (!props.card || !props.card.cardId) {
        detail.value = null
        faqListData.value = null
        return
      }
      
      // 既に同じカードの詳細を取得済みなら再取得しない
      if (detail.value && detail.value.card.cardId === props.card.cardId) {
        return
      }
      
      loading.value = true
      try {
        const detailResult = await getCardDetail(props.card)
        const faqResult = await getCardFAQList(props.card.cardId)
        console.log('Card detail fetched:', detailResult)
        console.log('FAQ fetched:', faqResult)
        detail.value = detailResult
        faqListData.value = faqResult
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
      // QA展開状態をリセット
      expandedQA.value = {}
      loadingQA.value = {}
      qaAnswers.value = {}
      fetchDetail()
    }, { immediate: true })
    
    return {
      detail,
      loading,
      groupedPacks,
      faqListData,
      relatedSortOrder,
      relatedViewMode,
      sortedRelatedCards,
      displayedRelatedCards,
      relatedLoadingMore,
      handleRelatedSortChange,
      handleRelatedScroll,
      expandedQA,
      loadingQA,
      qaAnswers,
      expandQA,
      collapseQA,
      expandedPacks,
      loadingPacks,
      packCards,
      packViewModes,
      expandPack,
      collapsePack
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
    color: #333;
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
  overflow-y: auto;
}

.no-card-selected,
.no-data {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 12px;
}

.loading {
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 12px;
}

.qa-header {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
}

.qa-card-name {
  font-size: 13px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.qa-card-text {
  font-size: 11px;
  color: #666;
  line-height: 1.6;
  white-space: pre-line;
  margin-bottom: 8px;
}

.qa-supplement {
  font-size: 11px;
  color: #e67e00;
  line-height: 1.6;
  padding: 6px 8px;
  background: #fff8e1;
  border-left: 3px solid #ff9800;
  border-radius: 2px;
}

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.qa-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  background: #fafafa;
  position: relative;
  transition: all 0.3s ease;
  
  &.collapsing {
    transition: all 0.3s ease;
  }
}

.qa-question {
  font-weight: bold;
  font-size: 12px;
  color: #333;
  margin-bottom: 30px;
  padding-right: 10px;
}

.qa-expand-btn,
.qa-collapse-btn {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  
  &:hover {
    background: #f0f0f0;
    border-color: #999;
  }
  
  svg {
    display: block;
    width: 12px;
    height: 12px;
  }
}

.qa-collapse-btn {
  background: #f5f5f5;
}

.qa-answer-container {
  margin-top: 8px;
  animation: expandAnswer 0.3s ease;
  overflow: hidden;
}

@keyframes expandAnswer {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 500px;
    opacity: 1;
  }
}

.qa-loading {
  font-size: 11px;
  color: #999;
  padding: 8px;
}

.qa-answer {
  font-size: 11px;
  color: #333;
  line-height: 1.6;
  margin-bottom: 5px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  white-space: pre-line;
}

.qa-date {
  font-size: 10px;
  color: #999;
  text-align: right;
}

.pack-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.pack-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 10px;
  background: #fafafa;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  padding-bottom: 32px;
}

.pack-name {
  font-size: 12px;
  font-weight: bold;
  color: #333;
  margin-bottom: 6px;
  width: 100%;
}

.pack-details {
  display: grid;
  grid-template-columns: 90px 110px 1fr;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.pack-date {
  font-size: 10px;
  color: #666;
  width: 90px;
}

.pack-code {
  font-size: 10px;
  color: #333;
  width: 110px;
}

.pack-rarities {
  font-size: 10px;
  color: #666;
  text-align: left;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rarity-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: bold;
  color: white;
  border: 1px solid;
  white-space: nowrap;
}

.pack-expand-btn,
.pack-collapse-btn {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  
  &:hover {
    background: #f0f0f0;
    border-color: #999;
  }
  
  svg {
    display: block;
    width: 12px;
    height: 12px;
  }
}

.pack-collapse-btn {
  background: #f5f5f5;
}

.pack-cards-container {
  margin-top: 8px;
  animation: expandAnswer 0.3s ease;
}

.pack-cards-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
  margin-bottom: 8px;
}

.pack-loading {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 12px;
}

.pack-cards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
  background: #fafafa;
  border-radius: 4px;
  
  &.grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, 60px);
    grid-auto-rows: max-content;
    gap: 2px;
    align-content: start;
  }
}

.pack-card-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  cursor: move;
  min-height: 90px;
  
  .grid-view & {
    flex-direction: column;
    min-height: auto;
    padding: 0;
    border: none;
    background: none;
    width: 60px;
  }
}

.search-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 0;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-icon {
  color: #333;
  flex-shrink: 0;
}

.sort-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 11px;
  background: white;
  cursor: pointer;
}

.view-switch {
  display: flex;
  gap: 0;
}

.view-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  
  input {
    display: none;
  }
  
  .icon {
    padding: 4px 8px;
    border: 1px solid #ddd;
    background: white;
    color: #666;
    font-size: 16px;
    transition: all 0.2s;
  }
  
  &:first-child .icon {
    border-radius: 4px 0 0 4px;
  }
  
  &:last-child .icon {
    border-radius: 0 4px 4px 0;
    border-left: none;
  }
  
  input:checked + .icon {
    background: #008cff;
    color: white;
    border-color: #008cff;
  }
}

.related-results {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  min-height: 0;
  
  &.grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, 60px);
    grid-auto-rows: max-content;
    gap: 2px;
    align-content: start;
    width: 100%;
  }
}

.related-result-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  cursor: move;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  min-height: 90px;
  
  .grid-view & {
    flex-direction: column;
    min-height: auto;
    padding: 0;
    border: none;
    background: none;
    width: 60px;
  }
}

.card-wrapper {
  flex-shrink: 0;
  position: relative;
  
  .grid-view & {
    width: 60px;
  }
}

.card-info {
  flex: 1;
  min-width: 0;
  
  .grid-view & {
    display: none;
  }
}

.card-name {
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 2px;
  word-break: break-word;
  color: #000;
}

.card-text {
  font-size: 10px;
  color: #666;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.loading-indicator {
  text-align: center;
  padding: 10px;
  color: #666;
  font-size: 13px;
  grid-column: 1 / -1;
}
</style>
