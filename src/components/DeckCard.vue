<template>
  <div
    class="card-item deck-card"
    :class="[`section-${sectionType}`, { 'error-state': showError, 'drag-over': isDragOver }]"
    :data-card-id="card.cardId"
    :data-ciid="card.ciid"
    :data-uuid="uuid"
    :draggable="!card.empty"
    @dragstart="handleDragStart"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @dragend="handleDragEnd"
    @click="$emit('click', card)"
    @contextmenu="handleContextMenu"
    @mousedown.capture="handleMouseDown"
    @auxclick.capture="handleAuxClick"
  >
    <img :src="cardImageUrl" :alt="card.name" :key="uuid" class="card-image">
    <div v-if="card.limitRegulation" class="limit-regulation" :class="`limit-${card.limitRegulation}`">
      <svg v-if="card.limitRegulation === 'forbidden'" width="20" height="20" viewBox="0 0 24 24">
        <path fill="currentColor" :d="mdiCloseCircle" />
      </svg>
      <svg v-else-if="card.limitRegulation === 'limited'" width="20" height="20" viewBox="0 0 24 24">
        <path fill="currentColor" :d="mdiNumeric1Circle" />
      </svg>
      <svg v-else-if="card.limitRegulation === 'semi-limited'" width="20" height="20" viewBox="0 0 24 24">
        <path fill="currentColor" :d="mdiNumeric2Circle" />
      </svg>
    </div>
    <div v-if="!card.empty" class="card-controls">
      <button 
        class="card-btn top-left"
        :class="{ 'is-link': sectionType === 'info' }"
        @click.stop="handleInfo"
      >
        <svg v-if="sectionType === 'info'" width="10" height="10" viewBox="0 0 24 24">
          <path fill="currentColor" d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z" />
        </svg>
        <span v-else class="btn-text">ⓘ</span>
      </button>
      <button 
        v-if="topRightText"
        class="card-btn top-right"
        :class="topRightClass"
        @click.stop="handleTopRight"
      >
        <span v-if="topRightText === 'M/E'" class="btn-text">M</span>
        <span v-else-if="topRightText" class="btn-text">{{ topRightText }}</span>
      </button>
      <button 
        v-else
        class="card-btn top-right" 
        @click.stop
      ></button>
      <button
        class="card-btn bottom-left"
        :class="[bottomLeftClass, { 'error-btn': showErrorLeft }]"
        @click.stop="handleBottomLeft"
      >
        <svg v-if="showErrorLeft" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" :d="mdiCloseCircle" />
        </svg>
        <svg v-else-if="showTrashIcon" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
        </svg>
        <span v-else-if="bottomLeftText === 'M/E'" class="btn-text">M</span>
        <span v-else-if="bottomLeftText" class="btn-text">{{ bottomLeftText }}</span>
      </button>
      <button
        class="card-btn bottom-right"
        :class="[bottomRightClass, { 'error-btn': showErrorRight }]"
        @click.stop="handleBottomRight"
      >
        <svg v-if="showErrorRight || (showError && (sectionType === 'main' || sectionType === 'extra' || sectionType === 'side'))" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" :d="mdiCloseCircle" />
        </svg>
        <svg v-else-if="showPlusIcon" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
        </svg>
        <span v-else class="btn-text">{{ bottomRightText }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { useCardDetailStore } from '../stores/card-detail'
import { useSettingsStore } from '../stores/settings'
import { getCardImageUrl } from '../types/card'
import { detectCardGameType } from '../utils/page-detector'
import { mdiCloseCircle, mdiNumeric1Circle, mdiNumeric2Circle } from '@mdi/js'
import { getCardDetailWithCache } from '../api/card-search'

export default {
  name: 'DeckCard',
  props: {
    card: {
      type: Object,
      required: true
    },
    sectionType: {
      type: String,
      required: true
    },
    uuid: {
      type: String,
      required: true
    }
  },
  setup() {
    const deckStore = useDeckEditStore()
    const cardDetailStore = useCardDetailStore()
    const settingsStore = useSettingsStore()
    const showErrorLeft = ref(false)
    const showErrorRight = ref(false)
    const isDragOver = ref(false)
    
    const handleMoveResult = (result, button = null) => {
      if (!result || result.success) return true
      
      console.error('[DeckCard] 移動失敗:', result.error)
      
      if (button === 'left') {
        showErrorLeft.value = true
        setTimeout(() => { showErrorLeft.value = false }, 500)
      } else if (button === 'right') {
        showErrorRight.value = true
        setTimeout(() => { showErrorRight.value = false }, 500)
      }
      
      return false
    }
    
    return {
      deckStore,
      cardDetailStore,
      settingsStore,
      showErrorLeft,
      showErrorRight,
      isDragOver,
      handleMoveResult,
      mdiCloseCircle,
      mdiNumeric1Circle,
      mdiNumeric2Circle
    }
  },
  computed: {
    showError() {
      // 枚数制限エラー時、同じcardIdのカードを全て赤背景で表示
      return this.deckStore.limitErrorCardId === this.card.cardId
    },
    cardImageUrl() {
      const gameType = detectCardGameType()
      const relativeUrl = getCardImageUrl(this.card, gameType)
      if (relativeUrl) {
        return `https://www.db.yugioh-card.com${relativeUrl}`
      }
      return chrome.runtime.getURL('images/card_back.png')
    },
    topRightText() {
      if (this.sectionType === 'search' || this.sectionType === 'info') return ''
      if (this.sectionType === 'side') return 'M/E'
      if (this.sectionType === 'main' || this.sectionType === 'extra') return 'S'
      return ''
    },
    topRightClass() {
      if (this.sectionType === 'search' || this.sectionType === 'info') return ''
      if (this.sectionType === 'side') return 'card-btn-me'
      if (this.sectionType === 'main' || this.sectionType === 'extra') return 'card-btn-s'
      return ''
    },
    topLeftEmpty() {
      if (this.sectionType === 'search' || this.sectionType === 'info') return true
      return true
    },
    showTrashIcon() {
      return this.sectionType !== 'trash' && this.sectionType !== 'search' && this.sectionType !== 'info'
    },
    bottomLeftText() {
      if (this.sectionType === 'search' || this.sectionType === 'info') return 'M/E'
      if (this.sectionType === 'trash') return 'M/E'
      return ''
    },
    bottomLeftClass() {
      if (this.sectionType === 'search' || this.sectionType === 'info') return 'card-btn-me'
      if (this.sectionType === 'trash') return 'card-btn-me'
      return ''
    },
    showPlusIcon() {
      // 枚数制限超過時はプラスアイコンを表示しない（バツアイコンを表示）
      if (this.showError && (this.sectionType === 'main' || this.sectionType === 'extra' || this.sectionType === 'side')) {
        return false
      }
      return this.sectionType !== 'trash' && this.sectionType !== 'search' && this.sectionType !== 'info'
    },
    bottomRightText() {
      if (this.sectionType === 'search' || this.sectionType === 'info') return 'S'
      if (this.sectionType === 'trash') return 'S'
      return ''
    },
    bottomRightClass() {
      if (this.sectionType === 'search' || this.sectionType === 'info') return 'card-btn-side'
      if (this.sectionType === 'trash') return 'card-btn-side'
      // 枚数制限超過時はプラスボタンを赤色に（main/extra/sideセクション）
      if (this.showError && (this.sectionType === 'main' || this.sectionType === 'extra' || this.sectionType === 'side')) {
        return 'error-btn'
      }
      return ''
    },
    showSearchButtons() {
      return this.sectionType === 'search'
    }
  },
  methods: {
    handleDragStart(event) {
      if (this.card.empty) {
        event.preventDefault()
        return
      }
      event.dataTransfer.effectAllowed = this.sectionType === 'search' ? 'copy' : 'move'
      event.dataTransfer.setData('text/plain', JSON.stringify({
        sectionType: this.sectionType,
        index: this.index,
        card: this.card,
        uuid: this.uuid
      }))

      // ドラッグ中のカード情報をストアに設定（移動可否判定用）
      this.deckStore.draggingCard = {
        card: this.card,
        sectionType: this.sectionType
      }

      this.$emit('dragstart', event, this.sectionType, this.index, this.card)
    },
    handleDragOver(event) {
      const dragging = this.deckStore.draggingCard

      // 移動可能かチェック
      const canMove = dragging && this.deckStore.canMoveCard(dragging.sectionType, this.sectionType, dragging.card)

      if (canMove) {
        // 移動可能な場合のみpreventDefaultを呼んでドロップを有効化
        event.preventDefault()
        event.stopPropagation()

        // ドラッグ中のカードが自分自身でない場合のみハイライト
        if (dragging && dragging.card.cardId === this.card.cardId && dragging.sectionType === this.sectionType) {
          // 自分自身の上ではハイライトしない
          this.isDragOver = false
        } else {
          this.isDragOver = true
        }
      } else {
        // 移動不可の場合はpreventDefaultを呼ばない（ドロップ無効）
        this.isDragOver = false
      }

      this.$emit('dragover', event)
    },
    handleDragLeave(event) {
      // 子要素への移動ではなく、本当に離れた時のみクリア
      if (event.currentTarget === event.target || !event.currentTarget.contains(event.relatedTarget)) {
        this.isDragOver = false
      }
    },
    handleDragEnd() {
      // ドラッグ終了時にストアの情報をクリア
      this.deckStore.draggingCard = null
      this.isDragOver = false
    },
    handleDrop(event) {
      event.preventDefault()
      event.stopPropagation()
      this.isDragOver = false

      try {
        const data = event.dataTransfer.getData('text/plain')
        if (!data) return

        const { sectionType: sourceSectionType, uuid: sourceUuid, card } = JSON.parse(data)

        // 移動可否チェック
        if (card && !this.deckStore.canMoveCard(sourceSectionType, this.sectionType, card)) {
          return
        }

        if (sourceSectionType === this.sectionType && sourceUuid && this.uuid) {
          const result = this.deckStore.reorderCard(sourceUuid, this.uuid, this.sectionType)
          this.handleMoveResult(result)
        } else if (card && sourceSectionType !== this.sectionType && this.uuid) {
          const result = this.deckStore.moveCardWithPosition(card.cardId, sourceSectionType, this.sectionType, sourceUuid, this.uuid)
          this.handleMoveResult(result)
        }
      } catch (e) {
        console.error('Card drop error:', e)
      }
    },
    async handleInfo() {
      // 詳細データをキャッシュ対応で取得してからselectedCardに設定
      try {
        const result = await getCardDetailWithCache(this.card.cardId)
        const fullCard = result?.detail?.card || this.card

        const cardData = {
          ...fullCard,
          imgs: fullCard.imgs ? [...fullCard.imgs] : (this.card.imgs ? [...this.card.imgs] : []),
          ciid: this.card.ciid  // クリックしたカードのciidを必ず使う
        }

        // CardDetailストアに設定（両画面で使用）
        this.cardDetailStore.setSelectedCard(cardData)

        // デッキ編集画面の場合のみ、アクティブタブを切り替え
        if (this.sectionType !== 'info') {
          this.deckStore.activeTab = 'card'
        }
      } catch (e) {
        console.error('[DeckCard.handleInfo] Failed to fetch card detail:', e)
        const cardData = {
          ...this.card,
          imgs: [...this.card.imgs],
          ciid: this.card.ciid
        }

        // CardDetailストアに設定（両画面で使用）
        this.cardDetailStore.setSelectedCard(cardData)

        // デッキ編集画面の場合のみ、アクティブタブを切り替え
        if (this.sectionType !== 'info') {
          this.deckStore.activeTab = 'card'
        }
      }
    },
    handleTopRight() {
      if (this.sectionType === 'side') {
        const result = this.deckStore.moveCardFromSide(this.card, this.uuid)
        this.handleMoveResult(result)
      } else if (this.sectionType === 'main' || this.sectionType === 'extra') {
        const result = this.deckStore.moveCardToSide(this.card, this.sectionType, this.uuid)
        this.handleMoveResult(result)
      }
    },
    addCardFromSearchToMainOrExtra() {
      // 検索結果・カード詳細からMain/Extraへカードを追加（アニメーション付き）
      const sourceRect = this.$el?.getBoundingClientRect()
      const result = this.deckStore.addCopyToMainOrExtra(this.card)
      if (!this.handleMoveResult(result, 'left')) return

      if (sourceRect && this.sectionType === 'search') {
        this.$nextTick(() => {
          this.animateFromSource(sourceRect)
        })
      }
    },
    handleBottomLeft() {
      if (this.sectionType === 'trash') {
        const result = this.deckStore.moveCardToMainOrExtra(this.card, 'trash', this.uuid)
        if (!this.handleMoveResult(result, 'left')) return
      } else if (this.sectionType === 'search' || this.sectionType === 'info') {
        this.addCardFromSearchToMainOrExtra()
      } else {
        const result = this.deckStore.moveCardToTrash(this.card, this.sectionType, this.uuid)
        this.handleMoveResult(result)
      }
    },
    handleBottomRight() {
      // 移動元の位置を記録
      const sourceRect = this.$el?.getBoundingClientRect()

      if (this.sectionType === 'trash') {
        const result = this.deckStore.moveCardToSide(this.card, 'trash', this.uuid)
        if (!this.handleMoveResult(result, 'right')) return
      } else if (this.sectionType === 'search' || this.sectionType === 'info') {
        this.deckStore.addCopyToSection(this.card, 'side')

        if (sourceRect && this.sectionType === 'search') {
          this.$nextTick(() => {
            this.animateFromSource(sourceRect, 'side')
          })
        }
      } else if (this.sectionType === 'main') {
        const result = this.deckStore.addCopyToSection(this.card, 'main')
        this.handleMoveResult(result, 'right')
      } else if (this.sectionType === 'extra') {
        const result = this.deckStore.addCopyToSection(this.card, 'extra')
        this.handleMoveResult(result, 'right')
      } else if (this.sectionType === 'side') {
        const result = this.deckStore.addCopyToSection(this.card, 'side')
        if (!this.handleMoveResult(result, 'right')) return
      }
    },
    animateFromSource(sourceRect, targetSection) {
      // 追加されたカードを探す（最新のもの）
      const section = targetSection || ((this.card.cardType === 'monster' && this.card.isExtraDeck) ? 'extra' : 'main')
      const displayOrder = this.deckStore.displayOrder[section]
      const addedCards = displayOrder.filter(dc => dc.cid === this.card.cardId)

      if (addedCards.length === 0) return

      const lastAdded = addedCards[addedCards.length - 1]
      const targetEl = document.querySelector(`[data-uuid="${lastAdded.uuid}"]`)

      if (!targetEl) return

      const targetRect = targetEl.getBoundingClientRect()

      // FLIPアニメーション: 移動元から移動先へ
      const deltaX = sourceRect.left - targetRect.left
      const deltaY = sourceRect.top - targetRect.top

      targetEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      targetEl.style.transition = 'none'

      requestAnimationFrame(() => {
        targetEl.style.transform = ''
        targetEl.style.transition = 'transform 0.3s ease'
      })
    },
    handleContextMenu(event) {
      // 高度なマウス操作が無効の場合は通常の右クリックメニューを表示
      if (!this.settingsStore.appSettings.enableMouseOperations) {
        return
      }

      // 右クリックメニューを抑制
      event.preventDefault()

      // 空カードの場合は何もしない
      if (this.card.empty) {
        return
      }

      // カード移動ロジック:
      // - main, side, extraから → trash
      // - trashから → main/extra（移動）
      // - search/infoから → main/extra（コピー）- handleBottomLeftと同じ処理
      if (this.sectionType === 'main' || this.sectionType === 'side' || this.sectionType === 'extra') {
        // main/side/extra → trash
        const result = this.deckStore.moveCardToTrash(this.card, this.sectionType, this.uuid)
        this.handleMoveResult(result)
      } else if (this.sectionType === 'trash') {
        // trash → main/extra（移動）
        const result = this.deckStore.moveCardToMainOrExtra(this.card, this.sectionType, this.uuid)
        this.handleMoveResult(result)
      } else if (this.sectionType === 'search' || this.sectionType === 'info') {
        // search/info → main/extra（コピー）
        this.addCardFromSearchToMainOrExtra()
      }
    },
    handleMouseDown(event) {
      // 中クリック（button === 1）のデフォルト動作（スクロールモード）を防ぐ
      if (event.button === 1) {
        event.preventDefault()
      }
    },
    handleAuxClick(event) {
      // auxclickイベント: 中クリック（button === 1）または右クリック（button === 2）
      // 右クリックはcontextmenuで処理しているため、ここでは中クリックのみ処理
      if (event.button !== 1) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      // 高度なマウス操作が無効の場合は何もしない
      if (!this.settingsStore.appSettings.enableMouseOperations) {
        return
      }

      // 空カードの場合は何もしない
      if (this.card.empty) {
        return
      }

      // セクションに応じてコピーを追加
      if (this.sectionType === 'main') {
        // Mainデッキのカード → Mainに追加
        this.deckStore.addCopyToSection(this.card, 'main')
      } else if (this.sectionType === 'side') {
        // Sideデッキのカード → Sideに追加
        this.deckStore.addCopyToSection(this.card, 'side')
      } else if (this.sectionType === 'extra') {
        // Extraデッキのカード → Extraに追加
        this.deckStore.addCopyToSection(this.card, 'extra')
      } else if (this.sectionType === 'search' || this.sectionType === 'info') {
        // 検索結果/カード詳細 → Main/Extraに追加
        this.addCardFromSearchToMainOrExtra()
      }
      // trash, その他のセクションでは何もしない
    }
  }
}
</script>

<style scoped lang="scss">
.card-item {
  /* デフォルト: デッキ編集用のCSS変数 */
  width: var(--card-width-deck);
  height: var(--card-height-deck);
  border: 1px solid var(--border-primary);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
  background: var(--card-bg);
  cursor: move;
  flex-shrink: 0;
  flex-grow: 0;
  margin: 0;

  &.error-state {
    border-color: var(--color-error);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--error-overlay-bg);
      pointer-events: none;
      z-index: 1;
    }
    
    img {
      opacity: 0.85;
    }
  }

  /* カード詳細パネル用 */
  &.section-info {
    width: var(--card-width-info);
    height: var(--card-height-info);
  }

  /* 検索結果（リスト/グリッド）用は親要素（CardList）が幅を制御 */
  &.section-search {
    width: 100%;
    height: auto;
    aspect-ratio: 36 / 53; /* カード画像の縦横比を維持 */
  }

  &:hover {
    border-color: var(--border-secondary);
    background: var(--card-hover-bg);

    .card-controls {
      opacity: 1;
    }

    .card-controls-search {
      opacity: 1;
    }
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
    transition: opacity 0.2s ease;

    &.card-image {
      // keyを使って画像が変わるたびに再マウント
      // 再マウント時のアニメーション
      animation: fadeIn 0.25s ease;
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.limit-regulation {
  position: absolute;
  bottom: 5.56%; /* カードの下1/18（100% / 18 = 5.56%）を空ける */
  left: 0;
  width: 100%;
  height: 19.44%; /* 7/36（1/6 + 1/36 = 6/36 + 1/36 = 7/36 = 19.44%） */
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;

  &.limit-forbidden {
    background: var(--deck-card-limit-forbidden-bg);
  }

  &.limit-limited {
    background: var(--deck-card-limit-limited-bg);
  }

  &.limit-semi-limited {
    background: var(--deck-card-limit-semi-limited-bg);
  }

  svg {
    color: var(--button-text);
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
  }
}

.card-controls {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  opacity: 0;
  transition: opacity 0.2s;
}

.card-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  color: var(--button-text);
  font-size: 8px;
  font-weight: bold;
  transition: all 0.15s;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    transition: background 0.15s;
    pointer-events: none;
  }

  svg {
    display: block;
    position: relative;
    z-index: 1;
  }

  .btn-text {
    position: relative;
    z-index: 1;
  }

  &.top-left {
    grid-column: 1;
    grid-row: 1;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 2px 0 0 2px;

    &::before {
      top: 0;
      left: 0;
      width: 66.67%;
      height: 66.67%;
      background: var(--deck-card-btn-top-left-bg);
      border: none;
      transition: all 0.15s;
    }

    &:hover::before {
      background: var(--deck-card-btn-top-left-hover-bg);
      border: 1px solid var(--deck-card-btn-top-left-hover-border);
    }

    &.is-link {
      &::before {
        background: var(--deck-card-btn-top-left-link-bg);
      }

      &:hover::before {
        background: var(--deck-card-btn-top-left-link-hover-bg);
        border: 1px solid var(--deck-card-btn-top-left-link-hover-border);
      }
    }
    
    .btn-text {
      font-size: 9px;
    }

    svg {
      width: 10px;
      height: 10px;
      fill: var(--button-text);
    }
  }

  &.top-right {
    grid-column: 2;
    grid-row: 1;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 2px 2px 0 0;

    &::before {
      top: 0;
      right: 0;
      width: 66.67%;
      height: 66.67%;
      background: var(--deck-card-btn-top-right-bg);
      border: none;
      transition: all 0.15s;
    }

    &:hover::before {
      background: var(--deck-card-btn-top-right-hover-bg);
      border: 1px solid var(--deck-card-btn-top-right-hover-border);
    }

    &.card-btn-me {
      &::before {
        background: var(--deck-card-btn-top-right-me-bg);
      }

      &:hover::before {
        background: var(--deck-card-btn-top-right-me-hover-bg);
        border: 1px solid var(--deck-card-btn-top-right-me-hover-border);
      }
    }

    &.card-btn-s {
      &::before {
        background: var(--deck-card-btn-top-right-s-bg);
      }

      &:hover::before {
        background: var(--deck-card-btn-top-right-s-hover-bg);
        border: 1px solid var(--deck-card-btn-top-right-s-hover-border);
      }
    }

    .btn-text {
      font-size: 9px;
    }

    svg {
      width: 8px;
      height: 8px;
    }
  }

  &.bottom-left {
    grid-column: 1;
    grid-row: 2;
    align-items: flex-end;
    justify-content: flex-start;
    padding: 0 0 2px 2px;

    &::before {
      bottom: 0;
      left: 0;
      width: 66.67%;
      height: 66.67%;
      background: var(--deck-card-btn-bottom-left-bg);
      border: none;
      transition: all 0.15s;
    }

    &:hover::before {
      background: var(--deck-card-btn-bottom-left-hover-bg);
      border: 1px solid var(--deck-card-btn-bottom-left-hover-border);
    }

    &.card-btn-me {
      &::before {
        background: var(--deck-card-btn-bottom-left-me-bg);
      }

      &:hover::before {
        background: var(--deck-card-btn-bottom-left-me-hover-bg);
        border: 1px solid var(--deck-card-btn-bottom-left-me-hover-border);
      }
    }

    &.error-btn {
      &::before {
        background: var(--deck-card-btn-bottom-left-error-bg) !important;
        border: 1px solid var(--deck-card-btn-bottom-left-error-border) !important;
      }
    }

    .btn-text {
      font-size: 9px;
    }

    svg {
      width: 10px;
      height: 10px;
    }
  }

  &.bottom-right {
    grid-column: 2;
    grid-row: 2;
    align-items: flex-end;
    justify-content: flex-end;
    padding: 0 2px 2px 0;

    &::before {
      bottom: 0;
      right: 0;
      width: 66.67%;
      height: 66.67%;
      background: var(--deck-card-btn-bottom-right-bg);
      border: none;
      transition: all 0.15s;
    }

    &:hover::before {
      background: var(--deck-card-btn-bottom-right-hover-bg);
      border: 1px solid var(--deck-card-btn-bottom-right-hover-border);
    }

    &.card-btn-side {
      &::before {
        background: var(--deck-card-btn-bottom-right-side-bg);
      }

      &:hover::before {
        background: var(--deck-card-btn-bottom-right-side-hover-bg);
        border: 1px solid var(--deck-card-btn-bottom-right-side-hover-border);
      }
    }

    &.error-btn {
      &::before {
        background: var(--deck-card-btn-bottom-right-error-bg) !important;
        border: 1px solid var(--deck-card-btn-bottom-right-error-border) !important;
      }
    }

    .btn-text {
      font-size: 9px;
    }

    svg {
      width: 10px;
      height: 10px;
    }
  }

  &:hover {
    opacity: 1;
    transform: scale(1.02);
  }
}

.btn-text {
  font-size: 12px;
  font-weight: bold;
  color: var(--button-text);
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  line-height: 1;
}

.btn-text-multiline {
  line-height: 0.8;
  font-size: 12px;
}

.card-controls-search {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 27px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
  opacity: 0;
  transition: opacity 0.2s;
}

.card-btn-search {
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--button-text);
  font-size: 8px;
  font-weight: bold;
  transition: all 0.15s;

  &.bottom-left {
    grid-column: 1;
    grid-row: 1;
    background: var(--deck-card-btn-me-bg);

    &:hover {
      background: var(--deck-card-btn-me-hover-bg);
    }
  }

  &.bottom-right {
    grid-column: 2;
    grid-row: 1;
    background: var(--deck-card-btn-side-bg);

    &:hover {
      background: var(--deck-card-btn-side-hover-bg);
    }
  }
}

/* ドラッグオーバー時のスタイル */
.deck-card.drag-over {
  outline: 2px solid var(--deck-card-drag-over-outline);
  outline-offset: -2px;
  background: var(--deck-card-drag-over-bg);
}
</style>
