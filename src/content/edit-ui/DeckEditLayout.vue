<template>
  <div class="deck-edit-container" :data-theme="settingsStore.effectiveTheme">
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

    <!-- 統一オーバーレイ -->
    <div v-if="deckStore.overlayVisible" class="unified-overlay" :style="{ zIndex: deckStore.overlayZIndex }"></div>

    <!-- ダイアログ -->
    <ExportDialog
      :isVisible="deckStore.showExportDialog"
      :deckInfo="deckStore.deckInfo"
      :dno="String(deckStore.dno)"
      @close="deckStore.showExportDialog = false"
      @exported="handleExported"
    />

    <ImportDialog
      :isVisible="deckStore.showImportDialog"
      @close="deckStore.showImportDialog = false"
      @imported="handleImported"
    />

    <OptionsDialog
      :isVisible="deckStore.showOptionsDialog"
      @close="deckStore.showOptionsDialog = false"
    />

    <!-- Load Dialog -->
    <div v-if="deckStore.showLoadDialog" class="dialog-overlay" @click="toggleLoadDialog">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header common">
          <h2 class="dialog-title">Load Deck</h2>
          <button class="close-btn" @click="toggleLoadDialog">×</button>
        </div>
        <div class="dialog-body">
          <div v-if="deckStore.deckList.length === 0" class="no-decks">
            <svg width="48" height="48" viewBox="0 0 24 24" style="margin-bottom: 12px; opacity: 0.3;">
              <path fill="currentColor" d="M20,6H12L10,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8A2,2 0 0,0 20,6M20,18H4V6H9.17L11.17,8H20V18M11,13H13V17H11V13M11,9H13V11H11V9Z" />
            </svg>
            <p>デッキがありません</p>
          </div>
          <div v-else class="deck-grid">
            <div
              v-for="deck in deckStore.deckList"
              :key="deck.dno"
              class="deck-card"
              @click="loadDeck(deck.dno)"
            >
              <div class="deck-name">{{ deck.name || '(名称未設定)' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="deckStore.showDeleteConfirm" class="dialog-overlay" @click="cancelDelete">
      <div class="delete-confirm-dialog" @click.stop>
        <div class="delete-confirm-header">
          <h3>デッキを削除</h3>
        </div>
        <div class="delete-confirm-body">
          <p>本当に「{{ deckStore.getDeckName() || '(名称未設定)' }}」を削除しますか？</p>
          <p class="warning">この操作は取り消せません。</p>
        </div>
        <div class="delete-confirm-footer">
          <button @click="cancelDelete" class="btn-cancel">キャンセル</button>
          <button @click="confirmDelete" class="btn-delete">削除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick, defineAsyncComponent } from 'vue'
import { useDeckEditStore } from '../../stores/deck-edit'
import { useSettingsStore } from '../../stores/settings'
import DeckCard from '../../components/DeckCard.vue'
import DeckSection from '../../components/DeckSection.vue'
import DeckEditTopBar from '../../components/DeckEditTopBar.vue'
import RightArea from '../../components/RightArea.vue'
// ダイアログコンポーネントを動的importに変更（初期表示時は不要、メニュー選択時のみロード）
const ExportDialog = defineAsyncComponent(() => import('../../components/ExportDialog.vue'))
const ImportDialog = defineAsyncComponent(() => import('../../components/ImportDialog.vue'))
const OptionsDialog = defineAsyncComponent(() => import('../../components/OptionsDialog.vue'))
import { getCardImageUrl } from '../../types/card'
import { detectCardGameType } from '../../utils/page-detector'

export default {
  name: 'DeckEditLayout',
  components: {
    DeckCard,
    DeckSection,
    DeckEditTopBar,
    RightArea,
    ExportDialog,
    ImportDialog,
    OptionsDialog
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

    // ダイアログイベントハンドラ
    const handleExported = (message) => {
      deckStore.showExportDialog = false
      console.log(message)
    }

    const handleImported = (message) => {
      deckStore.showImportDialog = false
      console.log(message)
    }

    const toggleLoadDialog = async () => {
      if (!deckStore.showLoadDialog) {
        await deckStore.fetchDeckList()
      }
      deckStore.showLoadDialog = !deckStore.showLoadDialog
    }

    const loadDeck = async (dno) => {
      try {
        await deckStore.loadDeck(dno)
        deckStore.setDeckName('')
        deckStore.showLoadDialog = false
        console.log('デッキを読み込みました')
      } catch (error) {
        console.error('Load error:', error)
      }
    }

    const confirmDelete = async () => {
      deckStore.showDeleteConfirm = false
      try {
        await deckStore.deleteCurrentDeck()
        console.log('デッキを削除しました')
      } catch (error) {
        console.error('Delete deck error:', error)
      }
    }

    const cancelDelete = () => {
      deckStore.showDeleteConfirm = false
    }

    // キーボードショートカットのマッチング関数（単一のショートカット）
    const matchesShortcut = (event, shortcut) => {
      if (!shortcut) return false

      return (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        event.ctrlKey === shortcut.ctrl &&
        event.shiftKey === shortcut.shift &&
        event.altKey === shortcut.alt
      )
    }

    // キーボードショートカット配列のいずれかにマッチするかチェック
    const matchesAnyShortcut = (event, shortcuts) => {
      if (!shortcuts) return false
      if (!Array.isArray(shortcuts)) return false
      if (shortcuts.length === 0) return false
      return shortcuts.some(shortcut => matchesShortcut(event, shortcut))
    }

    // グローバルキーボードイベント
    const handleGlobalKeydown = (event) => {
      // グローバル検索モードが有効な場合は無視（入力欄で処理される）
      if (deckStore.isGlobalSearchMode) return

      // 入力要素にフォーカスがある場合は無視
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      )

      if (isInputFocused) return

      const shortcuts = settingsStore.appSettings.keyboardShortcuts

      console.log('[handleGlobalKeydown]', {
        key: event.key,
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        globalSearchShortcuts: shortcuts.globalSearch
      })

      // グローバル検索モードを有効化
      if (matchesAnyShortcut(event, shortcuts.globalSearch)) {
        console.log('[handleGlobalKeydown] Global search triggered!')
        event.preventDefault()
        event.stopPropagation()
        deckStore.isGlobalSearchMode = true
        return
      }

      // Undo
      if (matchesAnyShortcut(event, shortcuts.undo)) {
        event.preventDefault()
        deckStore.undo()
        return
      }

      // Redo
      if (matchesAnyShortcut(event, shortcuts.redo)) {
        event.preventDefault()
        deckStore.redo()
        return
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
    
    // URLパラメータを取得する関数
    const getCurrentDno = () => {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '')
      return urlParams.get('dno') || ''
    }

    const getCopyFromDno = () => {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '')
      return urlParams.get('copy-from-dno') || ''
    }

    const getCopyFromCgid = () => {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '')
      return urlParams.get('copy-from-cgid') || ''
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
      const copyFromDno = getCopyFromDno()
      const copyFromCgid = getCopyFromCgid()

      if (copyFromDno && copyFromCgid) {
        // copy-from-dnoとcopy-from-cgidパラメータがある場合：他人のデッキをコピーして新規作成
        try {
          console.log('[DeckEditLayout] Copying deck from cgid:', copyFromCgid, 'dno:', copyFromDno)

          // getDeckDetailをインポート
          const { getDeckDetail } = await import('../../api/deck-operations')

          // 指定されたcgidとdnoでデッキ情報を取得
          const deckToCopy = await getDeckDetail(parseInt(copyFromDno), copyFromCgid)

          if (!deckToCopy) {
            throw new Error('Failed to fetch deck details')
          }

          console.log('[DeckEditLayout] Deck details fetched:', deckToCopy.dno)

          // deckStoreにデータを設定（pseudoCopyDeckに渡すため）
          deckStore.deckInfo.mainDeck = deckToCopy.mainDeck
          deckStore.deckInfo.extraDeck = deckToCopy.extraDeck
          deckStore.deckInfo.sideDeck = deckToCopy.sideDeck
          deckStore.deckInfo.category = deckToCopy.category
          deckStore.deckInfo.tags = deckToCopy.tags
          deckStore.deckInfo.comment = deckToCopy.comment
          deckStore.deckInfo.deckCode = deckToCopy.deckCode
          deckStore.deckInfo.name = deckToCopy.name
          deckStore.deckInfo.originalName = deckToCopy.originalName

          // デッキをコピーして新規作成
          // pseudoCopyDeck 内で loadDeck() も呼ばれるため、返り値の newDno を使用して URL を更新するだけ
          const newDno = await deckStore.pseudoCopyDeck(deckStore.deckInfo)

          console.log('[DeckEditLayout] Deck copied successfully, new dno:', newDno)

          // URLを更新して copy-from-cgid と copy-from-dno を削除
          window.location.hash = `/ytomo/edit?dno=${newDno}`
        } catch (error) {
          console.error('[DeckEditLayout] Failed to copy deck:', error)
          // エラーの場合は通常のページ初期化を実行
          await deckStore.initializeOnPageLoad()
        }
      } else {
        // 通常のページ初期化
        await deckStore.initializeOnPageLoad()
      }

      window.addEventListener('resize', handleResize)
      window.addEventListener('keydown', handleGlobalKeydown)

      // 設定に応じてファビコンを変更
      if (settingsStore.appSettings.changeFavicon) {
        changeFavicon()
      }
    })

    /**
     * ファビコンを拡張機能のアイコンに変更
     */
    function changeFavicon() {
      try {
        // 既存のファビコンを削除
        const existingLinks = document.querySelectorAll("link[rel*='icon']")
        existingLinks.forEach(link => link.remove())

        // 新しいファビコンを追加
        const iconSizes = [
          { size: '16x16', path: chrome.runtime.getURL('icons/icon16.png') },
          { size: '48x48', path: chrome.runtime.getURL('icons/icon48.png') },
          { size: '128x128', path: chrome.runtime.getURL('icons/icon128.png') }
        ]

        iconSizes.forEach(({ size, path }) => {
          const link = document.createElement('link')
          link.rel = 'icon'
          link.type = 'image/png'
          link.sizes = size
          link.href = path
          document.head.appendChild(link)
        })

        console.log('Favicon changed successfully')
      } catch (error) {
        console.error('Failed to change favicon:', error)
      }
    }

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
      // 検索入力欄との適切な間隔を確保（固定値150px: 入力欄47px + bottom位置20px + 余裕83px）
      const paddingBottom = 150
      return {
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
        // Load Dialog検索時に動的import
        const { searchCardsByName } = await import('../../api/card-search')
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
      handleExported,
      handleImported,
      toggleLoadDialog,
      loadDeck,
      confirmDelete,
      cancelDelete,
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
@import '../../styles/themes.scss';
@import '../../styles/common.scss';

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
  overflow: hidden;
  min-height: 0;
  max-height: 100%;
  
  // DeckEditTopBarは固定、スクロールしない
  > :first-child {
    flex-shrink: 0;
    z-index: 10;
    margin: 0;
  }
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
  padding: 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.middle-decks {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
  width: 100%;
  align-items: flex-start;

  // デフォルト（横並び）時はextra/sideを50%幅に制限
  :deep(.extra-deck),
  :deep(.side-deck) {
    max-width: 50%;
  }

  &.vertical-layout {
    flex-direction: column;

    // 縦並び時はextra/sideセクションを全幅に拡張
    :deep(.extra-deck),
    :deep(.side-deck) {
      max-width: 100%;
    }
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
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      background: var(--bg-primary);
      color: var(--text-secondary);
      font-size: 16px;
    }
    
    input:checked + .icon {
      background: linear-gradient(135deg, #0089ff 0%, #0068d9 100%);
      color: white;
      border-color: #0068d9;
      box-shadow: 0 2px 8px rgba(0, 137, 255, 0.3);
    }
  }
}

.card-detail-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 2px solid var(--color-info);
  
  button {
    padding: 8px;
    border: none;
    background: var(--bg-primary);
    cursor: pointer;
    font-size: 12px;
    color: var(--text-primary);
    
    &.active {
      background: var(--color-info);
      color: var(--button-text);
    }
  }
}

.card-tab-content {
  padding: 15px;
}

.no-card-selected {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary);
}

.unified-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  animation: fadeIn 0.2s ease;
  pointer-events: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.dialog-content {
  background: var(--dialog-bg, white);
  border: 1px solid var(--dialog-border, #e0e0e0);
  border-radius: 8px;
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.2));
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary, #e0e0e0);
  flex-shrink: 0;

  .dialog-title {
    font-size: 14px;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 18px;
    color: var(--text-tertiary, #999);
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background: var(--bg-secondary, #f5f5f5);
      color: var(--text-primary, #333);
    }
  }
}

.dialog-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  min-height: 200px;

  .no-decks {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 40px 20px;
    color: var(--text-tertiary, #999);

    p {
      margin: 0;
      font-size: 14px;
    }
  }
}

.deck-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.deck-card {
  padding: 10px 12px;
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 6px;
  background: var(--bg-secondary, #f5f5f5);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--text-tertiary, #999);
    background: var(--bg-primary, white);
  }

  .deck-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary, #333);
    line-height: 1.3;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.delete-confirm-dialog {
  background: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  width: 400px;
  max-width: 90vw;
}

.delete-confirm-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-primary);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }
}

.delete-confirm-body {
  padding: 24px;

  p {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--text-primary, #333);
  }

  .warning {
    color: #f44336;
    font-weight: 500;
  }
}

.delete-confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;

  button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;

    &.btn-cancel {
      background: var(--bg-secondary, #f5f5f5);
      color: var(--text-primary, #333);

      &:hover {
        background: var(--bg-tertiary, #e0e0e0);
      }
    }

    &.btn-delete {
      background: var(--color-error);
      color: var(--button-text);

      &:hover {
        background: var(--color-error-hover);
      }
    }
  }
}
</style>
