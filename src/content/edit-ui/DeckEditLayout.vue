<template>
  <div class="deck-edit-container">
    <div class="main-content" :class="{ 'hide-on-mobile': true }" :style="mainContentStyle">
      <DeckEditTopBar />

      <div class="deck-areas" :style="deckAreasStyle">
        <DeckSection
          title="main"
          section-type="main"
          :cards="mainDeck"
        />

        <div :class="middleDecksClass">
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

          <div class="deck-areas" :style="deckAreasStyle">
            <DeckSection
              title="main"
              section-type="main"
              :cards="mainDeck"
            />

            <div :class="middleDecksClass">
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
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useDeckEditStore } from '../../stores/deck-edit'
import { useSettingsStore } from '../../stores/settings'
import DeckCard from '../../components/DeckCard.vue'
import DeckSection from '../../components/DeckSection.vue'
import DeckEditTopBar from '../../components/DeckEditTopBar.vue'
import RightArea from '../../components/RightArea.vue'
import { searchCardsByName } from '../../api/card-search'
import { getCardImageUrl } from '../../types/card'
import { detectCardGameType } from '../../utils/page-detector'

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
    const settingsStore = useSettingsStore()
    const activeTab = ref('search')
    const searchQuery = ref('')
    const selectedCard = ref(null)
    const showDetail = ref(true)
    const viewMode = ref('list')
    const cardTab = ref('info')

    // グローバルキーボードイベント
    const handleGlobalKeydown = (event) => {
      // 入力要素にフォーカスがある場合は無視
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      )

      if (isInputFocused) return

      // '/' キーまたは Ctrl+J でグローバル検索モードを有効化
      if (event.key === '/' || (event.ctrlKey && event.key === 'j')) {
        event.preventDefault()
        // グローバル検索モードを有効化（タブは切り替えない）
        deckStore.isGlobalSearchMode = true
      }
    }
    
    // 画面幅変更時の処理
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768
      const wasDesktop = window.innerWidth > 768
      
      // 画面が広くなった時にdeck tabがactiveならsearch tabに変更
      if (wasDesktop && deckStore.activeTab === 'deck') {
        deckStore.activeTab = 'search'
      }
    }
    
    // dnoパラメータを取得する関数
    const getCurrentDno = () => {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '')
      return urlParams.get('dno') || ''
    }

    // 現在のdnoを追跡
    const currentDno = ref(getCurrentDno())

    // dnoパラメータの変更を監視
    const checkDnoChange = () => {
      const newDno = getCurrentDno()
      if (newDno !== currentDno.value) {
        console.log('[DeckEditLayout] dno changed from', currentDno.value, 'to', newDno)
        currentDno.value = newDno
        // デッキデータを再ロード
        deckStore.initializeOnPageLoad()
      }
    }

    // hashchangeイベントでdno変更を監視
    window.addEventListener('hashchange', checkDnoChange)

    // ページ初期化時にデッキを自動ロード
    onMounted(async () => {
      await deckStore.initializeOnPageLoad()
      window.addEventListener('resize', handleResize)
      window.addEventListener('keydown', handleGlobalKeydown)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('hashchange', checkDnoChange)
      window.removeEventListener('keydown', handleGlobalKeydown)
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
        Array.from({ length: dc.quantity }, () => dc.card)
      )
    })
    const extraDeck = computed(() => {
      return deckStore.deckInfo.extraDeck.flatMap(dc =>
        Array.from({ length: dc.quantity }, () => dc.card)
      )
    })
    const sideDeck = computed(() => {
      return deckStore.deckInfo.sideDeck.flatMap(dc =>
        Array.from({ length: dc.quantity }, () => dc.card)
      )
    })
    const trashDeck = computed(() => {
      return deckStore.trashDeck.flatMap(dc =>
        Array.from({ length: dc.quantity }, () => dc.card)
      )
    })

    // middle-decksの配置クラス
    const middleDecksClass = computed(() => ({
      'middle-decks': true,
      'vertical-layout': settingsStore.appSettings.middleDecksLayout === 'vertical'
    }))

    // カードサイズに応じた動的padding
    const deckAreasStyle = computed(() => {
      const cardHeight = settingsStore.deckEditCardSizePixels.height
      // TopBarとの間隔を確保（カードサイズが大きいほど間隔を広げる）
      // smallサイズでも最低32pxの間隔を確保
      const marginTop = Math.max(32, Math.ceil((cardHeight - 53) / 2))
      // カード高さに基づいてbottom paddingを計算
      // 検索入力欄との適切な間隔を確保（固定値150px: 入力欄47px + bottom位置20px + 余裕83px）
      const paddingBottom = 150
      return {
        marginTop: `${marginTop}px`,
        paddingBottom: `${paddingBottom}px`
      }
    })

    const mainContentStyle = computed(() => {
      // padding-bottomを.deck-areasに移動したため、ここでは何も設定しない
      return {}
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
        const gameType = detectCardGameType()
        searchResults.length = 0
        searchResults.push(...results.map(card => {
          const relativeUrl = getCardImageUrl(card, gameType)
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
      deckStore,
      settingsStore,
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
      middleDecksClass,
      deckAreasStyle,
      mainContentStyle,
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
  background-color: var(--bg-secondary);
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
  /* padding-bottomは動的に設定 */
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  max-height: 100%; /* 親コンテナの高さを超えないように制限 */
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
  flex: 1; /* .main-content内で残りスペースを使用 */
  min-height: fit-content; /* 子要素+paddingの全体を表示 */
  overflow: visible; /* 子要素がはみ出ることを許可 */
  /* marginTopとpaddingBottomは動的に設定 */
}

.middle-decks {
  display: flex;
  gap: 10px;
  flex: none;
  min-height: 120px;
  width: 100%;

  &.vertical-layout {
    flex-direction: column;
  }
}

.search-input-bottom {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 340px;
  display: flex;
  gap: 10px;
  background: var(--bg-primary);
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
    background: var(--input-bg) !important;
    color: var(--input-text) !important;

    &::placeholder {
      color: var(--text-tertiary) !important;
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
  color: var(--text-secondary);

  &:hover {
    color: var(--text-primary);
  }
}

.right-area {
  width: 320px;
  height: 100%;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-primary);
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
  border-bottom: 2px solid var(--button-bg);
  margin: 0;

  button {
    padding: 8px;
    border: none;
    background: var(--bg-primary);
    cursor: pointer;
    font-size: 13px;
    color: var(--text-primary);

    &.active {
      background: var(--button-bg);
      color: var(--button-text);
    }

    &.tab-header {
      background: var(--bg-tertiary);
      color: var(--text-tertiary);
      cursor: default;
      font-style: italic;
      opacity: 0.7;
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
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-secondary);
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
    color: var(--text-primary);
    font-size: 13px;
  }

  .switch {
    cursor: pointer;
  }

  span {
    color: var(--text-primary);
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
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  background: var(--card-bg);
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
  background: var(--bg-secondary);
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
  color: var(--text-primary);
}

.card-status {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.card-text {
  font-size: 10px;
  color: var(--text-secondary);
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
  background: var(--bg-secondary);
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 15px;

  button {
    padding: 8px;
    border: 1px solid var(--button-bg);
    background: var(--bg-primary);
    color: var(--button-bg);
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;

    &:hover {
      background: var(--button-bg);
      color: var(--button-text);
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
    background: var(--bg-tertiary);
    border-radius: 20px;
    transition: 0.3s;

    &::before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      left: 2px;
      top: 2px;
      background: var(--button-text);
      border-radius: 50%;
      transition: 0.3s;
    }
  }

  input:checked + .slider {
    background: var(--button-bg);

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
