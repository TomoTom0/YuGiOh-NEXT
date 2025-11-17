<template>
  <div
    class="card-item deck-card"
    :class="[`section-${sectionType}`, { 'error-state': showError }]"
    :data-card-id="card.cardId"
    :data-ciid="card.ciid"
    :data-uuid="uuid"
    :draggable="!card.empty"
    @dragstart="handleDragStart"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @click="$emit('click', card)"
  >
    <img :src="cardImageUrl" :alt="card.name" :key="uuid || `${card.cardId}-${card.ciid}`" class="card-image">
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
        <svg v-if="showErrorRight" width="12" height="12" viewBox="0 0 24 24">
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
import { getCardImageUrl } from '../types/card'
import { mdiCloseCircle, mdiNumeric1Circle, mdiNumeric2Circle } from '@mdi/js'

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
      required: false,
      default: ''
    }
  },
  setup() {
    const deckStore = useDeckEditStore()
    const showErrorLeft = ref(false)
    const showErrorRight = ref(false)
    return {
      deckStore,
      showErrorLeft,
      showErrorRight,
      mdiCloseCircle,
      mdiNumeric1Circle,
      mdiNumeric2Circle
    }
  },
  computed: {
    cardImageUrl() {
      const relativeUrl = getCardImageUrl(this.card)
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
      this.$emit('dragstart', event, this.sectionType, this.index, this.card)
    },
    handleDragOver(event) {
      this.$emit('dragover', event)
    },
    handleDrop(event) {
      event.preventDefault()
      event.stopPropagation()
      console.log('[DeckCard.handleDrop] Called for card:', this.card.name)

      try {
        const data = event.dataTransfer.getData('text/plain')
        if (!data) return

        const { sectionType: sourceSectionType, uuid: sourceUuid, card } = JSON.parse(data)
        console.log('[DeckCard.handleDrop] Parsed:', { sourceSectionType, sourceUuid, card: card?.name, targetSection: this.sectionType })

        if (sourceSectionType === this.sectionType && sourceUuid && this.uuid) {
          // 同じセクション内での並び替え: targetの位置に挿入（targetは後ろにずれる）
          console.log('[DeckCard.handleDrop] Reordering within same section')
          this.deckStore.reorderCard(sourceUuid, this.uuid, this.sectionType)
        } else if (card && sourceSectionType !== this.sectionType && this.uuid) {
          // 他のセクションからの移動: targetの位置に挿入（targetは後ろにずれる）
          console.log('[DeckCard.handleDrop] Moving from', sourceSectionType, 'to', this.sectionType)
          this.deckStore.moveCardWithPosition(card.cardId, sourceSectionType, this.sectionType, sourceUuid, this.uuid)
        }
      } catch (e) {
        console.error('Card drop error:', e)
      }
    },
    handleInfo() {
      // infoセクションの場合は新しいタブで公式ページを開く
      if (this.sectionType === 'info') {
        const url = `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${this.card.cardId}&request_locale=ja`
        window.open(url, '_blank')
        return
      }

      // 押下元のカードをselectedCardに設定（imgs配列もコピーして独立させる）
      this.deckStore.selectedCard = {
        ...this.card,
        imgs: [...this.card.imgs],
        ciid: this.card.ciid
      }
      this.deckStore.activeTab = 'card'
      this.deckStore.cardTab = 'info'
    },
    handleTopRight() {
      if (this.sectionType === 'side') {
        this.deckStore.moveCardFromSide(this.card, this.uuid)
      } else if (this.sectionType === 'main' || this.sectionType === 'extra') {
        this.deckStore.moveCardToSide(this.card, this.sectionType, this.uuid)
      }
    },
    handleBottomLeft() {
      // 移動元の位置を記録
      const sourceRect = this.$el?.getBoundingClientRect()

      if (this.sectionType === 'trash') {
        const result = this.deckStore.moveCardToMainOrExtra(this.card, 'trash', this.uuid)
        if (result && !result.success) {
          this.showErrorLeft = true
          console.error('[DeckCard] カード移動失敗:', result.error)
          setTimeout(() => {
            this.showErrorLeft = false
          }, 1500)
          return
        }
      } else if (this.sectionType === 'search' || this.sectionType === 'info') {
        // addToDisplayOrderでディープコピーされるため、ここでのコピーは不要
        const result = this.deckStore.addCopyToMainOrExtra(this.card)
        if (!result.success) {
          // 4枚制限エラー表示
          this.showErrorLeft = true
          console.error('[DeckCard] カード追加失敗:', result.error)
          setTimeout(() => {
            this.showErrorLeft = false
          }, 1500)
          return
        }

        // アニメーション実行（移動元から移動先へ）
        if (sourceRect && this.sectionType === 'search') {
          this.$nextTick(() => {
            this.animateFromSource(sourceRect)
          })
        }
      } else {
        this.deckStore.moveCardToTrash(this.card, this.sectionType, this.uuid)
      }
    },
    handleBottomRight() {
      // 移動元の位置を記録
      const sourceRect = this.$el?.getBoundingClientRect()

      if (this.sectionType === 'trash') {
        const result = this.deckStore.moveCardToSide(this.card, 'trash', this.uuid)
        if (result && !result.success) {
          this.showErrorRight = true
          console.error('[DeckCard] カード移動失敗:', result.error)
          setTimeout(() => {
            this.showErrorRight = false
          }, 1500)
          return
        }
      } else if (this.sectionType === 'search' || this.sectionType === 'info') {
        // propsから渡されたcardをそのまま使用（CardInfo.vueで既にciidが設定されている）
        this.deckStore.addCopyToSection(this.card, 'side')

        // アニメーション実行（移動元から移動先へ）
        if (sourceRect && this.sectionType === 'search') {
          this.$nextTick(() => {
            this.animateFromSource(sourceRect, 'side')
          })
        }
      } else if (this.sectionType === 'main') {
        // mainセクション内でコピー追加
        const result = this.deckStore.addCopyToSection(this.card, 'main')
        if (!result.success) {
          this.showErrorRight = true
          console.error('[DeckCard] カード追加失敗:', result.error)
          setTimeout(() => {
            this.showErrorRight = false
          }, 1500)
        }
      } else if (this.sectionType === 'extra') {
        // extraセクション内でコピー追加
        const result = this.deckStore.addCopyToSection(this.card, 'extra')
        if (!result.success) {
          this.showErrorRight = true
          console.error('[DeckCard] カード追加失敗:', result.error)
          setTimeout(() => {
            this.showErrorRight = false
          }, 1500)
        }
      } else if (this.sectionType === 'side') {
        // sideセクション内でコピー追加
        const result = this.deckStore.addCopyToSection(this.card, 'side')
        if (!result.success) {
          this.showErrorRight = true
          console.error('[DeckCard] カード追加失敗:', result.error)
          setTimeout(() => {
            this.showErrorRight = false
          }, 1500)
        }
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
    background: rgba(255, 0, 0, 0.2);
    border-color: #ff0000;
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
  bottom: 0;
  left: 0;
  width: 100%;
  height: 16.67%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;

  &.limit-forbidden {
    background: rgba(220, 20, 20, 0.9);
  }

  &.limit-limited {
    background: rgba(255, 140, 0, 0.9);
  }

  &.limit-semi-limited {
    background: rgba(255, 180, 0, 0.9);
  }

  svg {
    color: white;
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
  color: white;
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
      background: rgba(255, 165, 0, 0.8);
      border: none;
      transition: all 0.15s;
    }

    &:hover::before {
      background: rgba(255, 140, 0, 0.95);
      border: 1px solid rgba(255, 140, 0, 1);
    }
    
    &.is-link {
      &::before {
        background: rgba(100, 180, 255, 0.8);
      }
      
      &:hover::before {
        background: rgba(80, 160, 255, 0.95);
        border: 1px solid rgba(80, 160, 255, 1);
      }
    }
    
    .btn-text {
      font-size: 9px;
    }

    svg {
      width: 10px;
      height: 10px;
      fill: white;
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
      background: rgba(180, 180, 180, 0.3);
      border: none;
      transition: all 0.15s;
    }

    &:hover::before {
      background: rgba(180, 180, 180, 0.5);
      border: 1px solid rgba(180, 180, 180, 0.7);
    }

    &.card-btn-me {
      &::before {
        background: rgba(100, 150, 255, 0.6);
      }

      &:hover::before {
        background: rgba(100, 150, 255, 0.95);
        border: 1px solid rgba(100, 150, 255, 1);
      }
    }

    &.card-btn-s {
      &::before {
        background: rgba(150, 100, 255, 0.6);
      }

      &:hover::before {
        background: rgba(150, 100, 255, 0.95);
        border: 1px solid rgba(150, 100, 255, 1);
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
      background: rgba(255, 100, 100, 0.6);
      border: none;
      transition: all 0.15s;
    }

    &:hover::before {
      background: rgba(255, 100, 100, 0.95);
      border: 1px solid rgba(255, 100, 100, 1);
    }

    &.card-btn-me {
      &::before {
        background: rgba(100, 150, 255, 0.6);
      }

      &:hover::before {
        background: rgba(100, 150, 255, 0.95);
        border: 1px solid rgba(100, 150, 255, 1);
      }
    }

    &.error-btn {
      &::before {
        background: rgba(255, 0, 0, 0.9) !important;
        border: 1px solid rgba(255, 0, 0, 1) !important;
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
      background: rgba(100, 200, 100, 0.6);
      border: none;
      transition: all 0.15s;
    }

    &:hover::before {
      background: rgba(100, 200, 100, 0.95);
      border: 1px solid rgba(100, 200, 100, 1);
    }

    &.card-btn-side {
      &::before {
        background: rgba(150, 100, 255, 0.6);
      }

      &:hover::before {
        background: rgba(150, 100, 255, 0.95);
        border: 1px solid rgba(150, 100, 255, 1);
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
  color: white;
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
  color: white;
  font-size: 8px;
  font-weight: bold;
  transition: all 0.15s;

  &.bottom-left {
    grid-column: 1;
    grid-row: 1;
    background: rgba(100, 150, 255, 0.7);

    &:hover {
      background: rgba(100, 150, 255, 1);
    }
  }

  &.bottom-right {
    grid-column: 2;
    grid-row: 1;
    background: rgba(150, 100, 255, 0.7);

    &:hover {
      background: rgba(150, 100, 255, 1);
    }
  }
}
</style>
