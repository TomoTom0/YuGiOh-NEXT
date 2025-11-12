<template>
  <div class="deck-edit-container">
    <div class="main-content" :class="{ 'hide-on-mobile': true }">
      <DeckEditTopBar />

      <div class="deck-areas">
        <DeckSection
          title="main"
          section-type="main"
          :cards="mainDeck"
        />

        <div class="middle-decks">
          <DeckSection
            title="extra"
            section-type="extra"
            :cards="extraDeck"
          />

          <DeckSection
            title="side"
            section-type="side"
            :cards="sideDeck"
          />
        </div>

        <DeckSection
          title="trash"
          section-type="trash"
          :cards="trashDeck"
          :show-count="false"
        />
      </div>
    </div>

    <RightArea>
      <template #deck-tab>
        <div class="mobile-deck-content">
          <DeckEditTopBar />

          <div class="deck-areas">
            <DeckSection
              title="main"
              section-type="main"
              :cards="mainDeck"
            />

            <div class="middle-decks">
              <DeckSection
                title="extra"
                section-type="extra"
                :cards="extraDeck"
              />

              <DeckSection
                title="side"
                section-type="side"
                :cards="sideDeck"
              />
            </div>

            <DeckSection
              title="trash"
              section-type="trash"
              :cards="trashDeck"
              :show-count="false"
            />
          </div>
        </div>
      </template>
    </RightArea>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useDeckEditStore } from '../../stores/deck-edit'
import DeckCard from '../../components/DeckCard.vue'
import DeckSection from '../../components/DeckSection.vue'
import DeckEditTopBar from '../../components/DeckEditTopBar.vue'
import RightArea from '../../components/RightArea.vue'
import { searchCardsByName } from '../../api/card-search'
import { getCardImageUrl } from '../../types/card'

export default {
  name: 'DeckEditLayout',
  components: {
    DeckCard,
    DeckSection,
    DeckEditTopBar,
    RightArea
  },
  setup() {
    const deckStore = useDeckEditStore()
    const activeTab = ref('search')
    const searchQuery = ref('')
    const selectedCard = ref(null)
    const showDetail = ref(true)
    const viewMode = ref('list')
    const cardTab = ref('info')
    
    // 画面幅変更時の処理
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768
      const wasDesktop = window.innerWidth > 768
      
      // 画面が広くなった時にdeck tabがactiveならsearch tabに変更
      if (wasDesktop && deckStore.activeTab === 'deck') {
        deckStore.activeTab = 'search'
      }
    }
    
    // ページ初期化時にデッキを自動ロード
    onMounted(async () => {
      await deckStore.initializeOnPageLoad()
      window.addEventListener('resize', handleResize)
    })
    
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })

    const createFilledCards = (count, prefix, isExtra = false) => {
      return Array.from({ length: count }, (_, i) => ({
        card: {
          name: `${prefix}カード${i + 1}`,
          cardId: `${prefix}-${i + 1}`,
          imageId: '1',
          cardType: isExtra ? 'monster' : 'monster',
          text: `${prefix}のカード${i + 1}`,
          isExtraDeck: isExtra,
          attribute: 'dark',
          levelType: 'level',
          levelValue: 4,
          race: 'warrior',
          types: ['effect']
        },
        quantity: 1
      }))
    }

    // 初期データ設定は行わない（load で読み込むため）
    
    const mainDeck = computed(() => {
      return deckStore.deckInfo.mainDeck.flatMap(dc => 
        Array(dc.quantity).fill(dc.card)
      )
    })
    const extraDeck = computed(() => {
      return deckStore.deckInfo.extraDeck.flatMap(dc => 
        Array(dc.quantity).fill(dc.card)
      )
    })
    const sideDeck = computed(() => {
      return deckStore.deckInfo.sideDeck.flatMap(dc => 
        Array(dc.quantity).fill(dc.card)
      )
    })
    const trashDeck = computed(() => {
      return deckStore.trashDeck.flatMap(dc => 
        Array(dc.quantity).fill(dc.card)
      )
    })

    const searchResults = reactive([])

    const showCardDetail = (card) => {
      selectedCard.value = card
      activeTab.value = 'card'
      cardTab.value = 'info'
    }

    const onSearchInput = async (query) => {
      if (!query || !query.trim()) {
        searchResults.length = 0
        return
      }
      
      try {
        const results = await searchCardsByName(query.trim())
        searchResults.length = 0
        searchResults.push(...results.map(card => {
          const relativeUrl = getCardImageUrl(card)
          const imageUrl = relativeUrl ? `https://www.db.yugioh-card.com${relativeUrl}` : undefined
          return {
            card: {
              ...card,
              imageUrl
            },
            quantity: 1
          }
        }))
      } catch (error) {
        console.error('Search error:', error)
      }
    }

    const toggleDetail = (card) => {
      console.log('Toggle detail:', card.name)
    }

    const dragData = ref(null)

    const onDragStart = (event, deckType, index, card) => {
      console.log('=== Drag start ===')
      console.log('deckType:', deckType, 'index:', index, 'card:', card)
      if (card.empty) {
        event.preventDefault()
        return false
      }
      
      dragData.value = { deckType, index, card }
      event.dataTransfer.effectAllowed = deckType === 'search' ? 'copy' : 'move'
      event.dataTransfer.setData('text/plain', JSON.stringify({ deckType, index }))
      console.log('dragData set:', dragData.value)
    }

    const handleDragOver = (event) => {
      event.preventDefault()
      console.log('Drag over event fired')
      return false
    }

    const onAreaDrop = (event, targetDeckType) => {
      console.log('=== Area drop ===')
      console.log('targetDeckType:', targetDeckType)
      console.log('dragData before check:', dragData.value)
      event.preventDefault()
      event.stopPropagation()
      if (!dragData.value) {
        console.log('ERROR: No drag data!')
        return
      }

      const { deckType: sourceDeckType, index: sourceIndex, card } = dragData.value
      console.log('sourceDeckType:', sourceDeckType, 'card:', card)
      
      if (sourceDeckType === 'search') {
        console.log('Adding from search to:', targetDeckType)
        if (targetDeckType === 'main' || targetDeckType === 'extra') {
          deckStore.addCopyToMainOrExtra(card)
        } else if (targetDeckType === 'side') {
          deckStore.addCopyToSection(card, 'side')
        }
      } else if (sourceDeckType !== targetDeckType) {
        console.log('Moving from', sourceDeckType, 'to', targetDeckType)
        deckStore.moveCard(card.cardId, sourceDeckType, targetDeckType)
      }
      
      dragData.value = null
    }

    const onDragOver = (event) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }

    const onDrop = (event, targetDeckType, targetIndex) => {
      event.preventDefault()
      event.stopPropagation()
      console.log('Drop:', targetDeckType, targetIndex, 'dragData:', dragData.value)
      if (!dragData.value) {
        console.log('No drag data!')
        return
      }

      const { deckType: sourceDeckType, index: sourceIndex, card } = dragData.value
      
      if (sourceDeckType === 'search') {
        console.log('Adding from search at index:', targetIndex)
        if (targetDeckType === 'main' || targetDeckType === 'extra') {
          deckStore.insertCard(card, card.isExtraDeck ? 'extra' : 'main', targetIndex)
        } else if (targetDeckType === 'side') {
          deckStore.insertCard(card, 'side', targetIndex)
        }
      } else {
        console.log('Moving card with position')
        deckStore.moveCardWithPosition(card.cardId, sourceDeckType, sourceIndex, targetDeckType, targetIndex)
      }
      
      dragData.value = null
    }

    const findSectionByCard = (card) => {
      if (mainDeck.value.some(c => c.cardId === card.cardId)) return 'main'
      if (extraDeck.value.some(c => c.cardId === card.cardId)) return 'extra'
      if (sideDeck.value.some(c => c.cardId === card.cardId)) return 'side'
      if (trashDeck.value.some(c => c.cardId === card.cardId)) return 'trash'
      return null
    }

    const moveToTrash = (card, index) => {
      const section = findSectionByCard(card)
      if (section && section !== 'trash') {
        deckStore.moveCardToTrash(card, section)
      }
    }

    const moveToSide = (card, index) => {
      const section = findSectionByCard(card)
      if (section === 'main' || section === 'extra' || section === 'trash') {
        deckStore.moveCardToSide(card, section)
      }
    }

    const moveFromSide = (card, index) => {
      deckStore.moveCardFromSide(card)
    }

    const moveFromTrash = (card, index, targetType) => {
      if (targetType === 'side') {
        deckStore.moveCardToSide(card, 'trash')
      } else {
        deckStore.moveCardToMainOrExtra(card, 'trash')
      }
    }

    const addCopy = (card, index) => {
      const section = findSectionByCard(card)
      if (section && section !== 'trash') {
        deckStore.addCopyToSection(card, section)
      }
    }

    const addToMain = (card) => {
      deckStore.addCopyToSection(card, 'main')
    }

    const addToExtra = (card) => {
      deckStore.addCopyToSection(card, 'extra')
    }

    const addToSide = (card) => {
      deckStore.addCopyToSection(card, 'side')
    }

    const addToMainOrExtra = (card, index) => {
      deckStore.addCopyToMainOrExtra(card)
    }

    return {
      activeTab,
      searchQuery,
      selectedCard,
      showDetail,
      viewMode,
      cardTab,
      mainDeck,
      extraDeck,
      sideDeck,
      trashDeck,
      searchResults,
      showCardDetail,
      onSearchInput,
      toggleDetail,
      addToMain,
      addToExtra,
      addToSide,
      onDragStart,
      onDrop,
      onAreaDrop,
      handleDragOver,
      moveToTrash,
      moveToSide,
      moveFromSide,
      moveFromTrash,
      addCopy,
      addToMainOrExtra
    }
  }
}
</script>

<style scoped lang="scss">
// Hide page top button
:global(.menu_btn_pagetop) {
  display: none !important;
}

.deck-edit-container {
  display: flex;
  height: calc(100vh - var(--header-height, 0px) - 20px);
  background-color: #f0f0f0;
  padding: 10px;
}

@media (max-width: 768px) {
  .deck-edit-container {
    padding: 5px;
  }

  .main-content.hide-on-mobile {
    display: none;
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 80px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.mobile-deck-content {
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
}

.deck-areas {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  margin-bottom: 65px;
}

.middle-decks {
  display: flex;
  gap: 10px;
  flex: none;
  min-height: 120px;
  width: 100%;
}

.search-input-bottom {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 340px;
  display: flex;
  gap: 10px;
  background: white;
  padding: 10px 15px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 100;

  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    padding: 5px;
    background: white !important;
    color: #000 !important;
    
    &::placeholder {
      color: #999 !important;
    }
  }
}

.search-btn {
  border: none;
  background: none;
  cursor: pointer;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;

  &:hover {
    color: #333;
  }
}

.right-area {
  width: 320px;
  background: white;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  margin: 0 0 0 10px;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 2px solid #008cff;
  margin: 0;

  button {
    padding: 8px;
    border: none;
    background: white;
    cursor: pointer;
    font-size: 13px;
    color: #333;

    &.active {
      background: #008cff;
      color: white;
    }
    
    &.tab-header {
      background: #f0f0f0;
      cursor: default;
    }
  }
}

.search-content,
.card-detail-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  margin: 0;
}

.search-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 10px;
}

.toolbar-item {
  display: flex;
  gap: 8px;
  align-items: center;
  
  label {
    display: flex;
    gap: 4px;
    align-items: center;
    cursor: pointer;
    color: #000;
    font-size: 13px;
  }
  
  .switch {
    cursor: pointer;
  }
  
  span {
    color: #000;
    font-size: 14px;
  }
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.search-result-item {
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
}

.card-thumb {
  width: 40px;
  height: 58px;
  object-fit: cover;
  border-radius: 2px;
  background: #f0f0f0;
  pointer-events: none;
  user-select: none;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 2px;
  word-break: break-word;
  color: #000;
}

.card-status {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
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

.detail-image {
  width: 100%;
  max-width: 250px;
  height: auto;
  margin: 15px 0;
  border-radius: 4px;
  background: #f0f0f0;
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 15px;

  button {
    padding: 8px;
    border: 1px solid #008cff;
    background: white;
    color: #008cff;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;

    &:hover {
      background: #008cff;
      color: white;
    }
  }
}

.switch-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  
  input[type="checkbox"] {
    display: none;
  }
  
  .slider {
    position: relative;
    width: 40px;
    height: 20px;
    background: #ccc;
    border-radius: 20px;
    transition: 0.3s;
    
    &::before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      left: 2px;
      top: 2px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
    }
  }
  
  input:checked + .slider {
    background: #008cff;
    
    &::before {
      transform: translateX(20px);
    }
  }
}

.view-switch {
  display: flex;
  gap: 4px;
  
  .view-option {
    display: flex;
    align-items: center;
    cursor: pointer;
    
    input[type="radio"] {
      display: none;
    }
    
    .icon {
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      color: #666;
      font-size: 16px;
    }
    
    input:checked + .icon {
      background: #008cff;
      color: white;
      border-color: #008cff;
    }
  }
}

.card-detail-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 2px solid #008cff;
  
  button {
    padding: 8px;
    border: none;
    background: white;
    cursor: pointer;
    font-size: 12px;
    color: #333;
    
    &.active {
      background: #008cff;
      color: white;
    }
  }
}

.card-tab-content {
  padding: 15px;
}

.no-card-selected {
  padding: 20px;
  text-align: center;
  color: #999;
}
</style>
