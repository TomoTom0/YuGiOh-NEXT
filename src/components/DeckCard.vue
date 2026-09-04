<template>
  <div
    v-if="card"
    class="card-item deck-card"
    :class="[`section-${sectionType}`, {
      'error-state': showError,
      'drag-over': isDragOver,
      'face-down': sectionType === 'practice' && card.face === 'down' && !forceReveal && (zone === 'deck' || zone === 'extra'),
      'face-down-field': sectionType === 'practice' && card.face === 'down' && !forceReveal && zone !== 'deck' && zone !== 'extra',
      'horizontal': sectionType === 'practice' && card.orientation === 'horizontal',
      'is-dragging': sectionType === 'practice' && isDragging,
    }]"
    :data-card-id="sectionType === 'practice' ? (card.instanceId ?? '') : card.cardId"
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
    @mouseenter="sectionType === 'practice' && (hovered = true)"
    @mouseleave="sectionType === 'practice' && (hovered = false)"
  >
    <div v-if="sectionType === 'practice'" class="card-image-wrapper">
      <img v-if="card.face === 'up' || forceReveal" :src="cardImageUrl" alt="card" class="card-image" draggable="false">
      <template v-else-if="zone === 'deck' || zone === 'extra'">
        <img :src="backImageUrl" alt="card back" class="card-image" draggable="false">
      </template>
      <template v-else>
        <img :src="cardImageUrl" alt="card" class="card-image" draggable="false">
        <img v-if="cardImageUrl !== backImageUrl" :src="backImageUrl" alt="card back" class="card-image card-facedown-top">
      </template>
    </div>
    <img v-else :src="cardImageUrl" :alt="card.name" :key="uuid" class="card-image">
    <div
      v-if="sectionType !== 'practice' && isGenesysForbidden"
      class="limit-regulation limit-forbidden"
    >
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="currentColor" :d="mdiCloseCircle" />
      </svg>
    </div>
    <div
      v-else-if="sectionType !== 'practice' && showGenesysPt"
      class="genesys-pt-badge"
      :class="`pt-tier-${genesysPtTier}`"
    >{{ genesysPt }}pt</div>
    <div v-else-if="sectionType !== 'practice' && card.limitRegulation" class="limit-regulation" :class="`limit-${card.limitRegulation}`">
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
    <!-- 手動先頭優先配置アイコン（最優先） -->
    <div v-if="sectionType !== 'practice' && isHeadPlaced" class="head-placement-icon" :title="`手動先頭優先配置 (${headPlacementNumber}番目)`">
      {{ headPlacementNumber }}
    </div>
    <!-- カテゴリ優先アイコン（手動先頭優先配置が無い場合のみ表示） -->
    <div v-else-if="sectionType !== 'practice' && isInCategory" class="category-placement-icon" title="カテゴリ優先">
      <svg width="8" height="8" viewBox="0 0 24 24">
        <path fill="currentColor" :d="mdiArrowLeftBold" />
      </svg>
    </div>
    <!-- 末尾配置アイコン（手動先頭優先配置、カテゴリ優先が無い場合のみ表示） -->
    <div v-else-if="sectionType !== 'practice' && isTailPlaced" class="tail-placement-icon" title="末尾配置">
      <svg width="8" height="8" viewBox="0 0 24 24">
        <path fill="currentColor" :d="mdiArrowRightBold" />
      </svg>
    </div>
    <div v-if="!card.empty && !isPracticeFaceDown" class="card-controls">
      <button
        class="card-btn top-left"
        :class="{ 'is-link': sectionType === 'info' }"
        @click.stop="handleTopLeft"
      >
        <svg v-if="sectionType === 'info'" width="10" height="10" viewBox="0 0 24 24">
          <path fill="currentColor" d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z" />
        </svg>
        <span v-else class="btn-text">ⓘ</span>
      </button>
      <button
        v-if="topRightText"
        class="card-btn top-right"
        :class="[topRightClass, { 'always-visible': showPracticeActions && showFaceIndicator && card.face === 'up' }]"
        @click.stop="handleTopRight"
      >
        <svg v-if="topRightIcon" width="10" height="10" viewBox="0 0 24 24">
          <path fill="currentColor" :d="topRightIcon" />
        </svg>
        <span v-else-if="topRightText === 'M/E'" class="btn-text">M</span>
        <span v-else-if="topRightText" class="btn-text">{{ topRightText }}</span>
      </button>
      <button
        v-if="showBottomLeft"
        class="card-btn bottom-left"
        :class="[bottomLeftClass, { 'error-btn': showErrorLeft }]"
        @click.stop="handleBottomLeft"
      >
        <svg v-if="bottomLeftIcon === 'trash'" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
        </svg>
        <svg v-else-if="bottomLeftIcon" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" :d="bottomLeftIcon" />
        </svg>
        <span v-else-if="bottomLeftLabel === 'M/E'" class="btn-text">M</span>
        <span v-else-if="bottomLeftLabel" class="btn-text">{{ bottomLeftLabel }}</span>
      </button>
      <button
        v-if="showBottomRight"
        class="card-btn bottom-right"
        :class="[bottomRightClass, { 'error-btn': showErrorRight }]"
        @click.stop="handleBottomRight"
      >
        <svg v-if="bottomRightIcon === 'plus'" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
        </svg>
        <svg v-else-if="bottomRightIcon" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" :d="bottomRightIcon" />
        </svg>
        <span v-else-if="bottomRightLabel" class="btn-text">{{ bottomRightLabel }}</span>
      </button>
    </div>

    <Toast
      :show="toast.show"
      :message="toast.message"
      :type="toast.type"
      @close="toast.show = false"
    />
    <template v-if="sectionType === 'practice'">
      <div v-if="isDragging && canRotate" class="drag-rotate-indicator" :class="{ 'is-rotated': draggingRotated }" />
      <div v-if="isDragging" class="drag-facedown-indicator" :class="{ 'is-facedown': draggingFaceDown }" />
    </template>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import Toast from './Toast.vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { useSettingsStore } from '../stores/settings'
import { getCardImageUrl } from '../types/card'
import { detectCardGameType } from '../utils/page-detector'
import { buildFullUrl } from '../utils/url-builder'
import { mdiCloseCircle, mdiNumeric1Circle, mdiNumeric2Circle, mdiArrowRightBold, mdiArrowLeftBold, mdiHandBackRight, mdiArrowCollapseDown, mdiEye, mdiEyeOff } from '@mdi/js'
import { isGenesysForbiddenCard, genesysPtTier as computeGenesysPtTier } from '../utils/regulation-card-badge'
import { useCardDetailDisplay } from '../composables/useCardDetailDisplay'
import { usePracticeDragState } from '../composables/practice/usePracticeDragState'
import { usePracticeStore } from '../stores/practice'
import { setDragData, parseDragData } from '../utils/drag-data'

export default {
  name: 'DeckCard',
  components: {
    Toast
  },
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
    },
    zone: {
      type: String,
      default: undefined
    },
    forceReveal: {
      type: Boolean,
      default: false
    },
    showActions: {
      type: Boolean,
      default: true
    },
    showFaceIndicator: {
      type: Boolean,
      default: true
    }
  },
  setup() {
    const deckStore = useDeckEditStore()
    const settingsStore = useSettingsStore()
    const practiceStore = usePracticeStore()
    const showErrorLeft = ref(false)
    const showErrorRight = ref(false)
    const isDragOver = ref(false)
    const toast = reactive({
      show: false,
      message: '',
      type: 'warning'
    })

    const showToast = (message, type = 'warning') => {
      toast.message = message
      toast.type = type
      toast.show = true
    }

    const handleMoveResult = (result, button = null) => {
      if (!result || result.success) return true

      console.error('[DeckCard] 移動失敗:', result.error)

      // ciid が無効な言語の場合、トースト通知を表示
      if (result.error === 'invalid_ciid_for_language') {
        showToast('この言語ではこのバリエーションは販売されていません', 'warning')
      }

      if (button === 'left') {
        showErrorLeft.value = true
        setTimeout(() => { showErrorLeft.value = false }, 500)
      } else if (button === 'right') {
        showErrorRight.value = true
        setTimeout(() => { showErrorRight.value = false }, 500)
      }

      return false
    }

    const { showCardDetail } = useCardDetailDisplay()
    const { startDrag, toggleDragRotation, endDrag, draggingRotated, draggingFaceDown, draggingCardId, postDragRotation } = usePracticeDragState()
    const hovered = ref(false)

    const backImageUrl = typeof chrome !== 'undefined' && chrome.runtime
      ? chrome.runtime.getURL('images/card_back.png')
      : '/images/card_back.png'

    return {
      deckStore,
      settingsStore,
      practiceStore,
      showErrorLeft,
      showErrorRight,
      isDragOver,
      toast,
      handleMoveResult,
      showCardDetail,
      mdiCloseCircle,
      mdiNumeric1Circle,
      mdiNumeric2Circle,
      mdiArrowRightBold,
      mdiArrowLeftBold,
      mdiHandBackRight,
      mdiArrowCollapseDown,
      mdiEye,
      mdiEyeOff,
      hovered,
      backImageUrl,
      startDrag,
      toggleDragRotation,
      endDrag,
      draggingRotated,
      draggingFaceDown,
      draggingCardId,
      postDragRotation,
    }
  },
  computed: {
    isPracticeMode() {
      return this.practiceStore.isActive
    },
    showPracticeActions() {
      return this.sectionType === 'practice' || this.isPracticeMode
    },
    showError() {
      // 枚数制限エラー時、同じcardIdのカードを全て赤背景で表示
      return this.card && this.deckStore.limitErrorCardId === this.card.cardId
    },
    cardImageUrl() {
      if (!this.card) {
        return chrome.runtime.getURL('images/card_back.png')
      }
      const gameType = detectCardGameType()
      const relativeUrl = getCardImageUrl(this.card, gameType)
      if (relativeUrl) {
        return buildFullUrl(relativeUrl)
      }
      return chrome.runtime.getURL('images/card_back.png')
    },
    topRightText() {
      if (this.showPracticeActions && this.showFaceIndicator) {
        return this.card.face === 'down' ? 'eye-off' : 'eye'
      }
      if (this.sectionType === 'search' || this.sectionType === 'info') return ''
      if (this.sectionType === 'side') return 'M/E'
      if (this.sectionType === 'main' || this.sectionType === 'extra') return 'S'
      return ''
    },
    topRightClass() {
      if (this.showPracticeActions) return ''
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
      return !this.showPracticeActions && this.sectionType !== 'trash' && this.sectionType !== 'search' && this.sectionType !== 'info'
    },
    bottomLeftText() {
      if (this.showPracticeActions) return ''
      if (this.sectionType === 'search' || this.sectionType === 'info') return 'M/E'
      if (this.sectionType === 'trash') return 'M/E'
      return ''
    },
    bottomLeftClass() {
      if (this.showPracticeActions) return ''
      if (this.sectionType === 'search' || this.sectionType === 'info') return 'card-btn-me'
      if (this.sectionType === 'trash') return 'card-btn-me'
      return ''
    },
    showPlusIcon() {
      if (this.showError && (this.sectionType === 'main' || this.sectionType === 'extra' || this.sectionType === 'side')) {
        return false
      }
      return !this.showPracticeActions && this.sectionType !== 'trash' && this.sectionType !== 'search' && this.sectionType !== 'info'
    },
    bottomRightText() {
      if (this.showPracticeActions) return ''
      if (this.sectionType === 'search' || this.sectionType === 'info') return 'S'
      if (this.sectionType === 'trash') return 'S'
      return ''
    },
    bottomRightClass() {
      if (this.showPracticeActions) return ''
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
    },
    topRightIcon() {
      if (this.topRightText === 'eye') return mdiEye
      if (this.topRightText === 'eye-off') return mdiEyeOff
      return null
    },
    bottomLeftIcon() {
      if (this.showErrorLeft) return mdiCloseCircle
      if (this.showTrashIcon) return 'trash'
      if (this.showPracticeActions) return mdiHandBackRight
      return null
    },
    bottomLeftLabel() {
      if (this.bottomLeftIcon) return null
      return this.bottomLeftText
    },
    bottomRightIcon() {
      if (this.showErrorRight || (this.showError && (this.sectionType === 'main' || this.sectionType === 'extra' || this.sectionType === 'side'))) return mdiCloseCircle
      if (this.showPlusIcon) return 'plus'
      if (this.showPracticeActions) return mdiArrowCollapseDown
      return null
    },
    bottomRightLabel() {
      if (this.bottomRightIcon) return null
      return this.bottomRightText
    },
    showBottomLeft() {
      return !!this.bottomLeftIcon || !!this.bottomLeftLabel
    },
    showBottomRight() {
      return !!this.bottomRightIcon || !!this.bottomRightLabel
    },
    isTailPlaced() {
      // 直接refを参照してVueのreactivityを機能させる
      return this.card && this.settingsStore.tailPlacementCardIds.includes(this.card.cardId)
    },
    isHeadPlaced() {
      // 手動先頭優先配置フラグを確認（dnoごと）
      if (!this.card) return false

      const headPlacementCardIds = this.deckStore.headPlacementCardIds
      if (!headPlacementCardIds || !Array.isArray(headPlacementCardIds)) {
        console.warn('[DeckCard] headPlacementCardIds is not an array:', headPlacementCardIds)
        return false
      }

      return headPlacementCardIds.includes(this.card.cardId)
    },
    headPlacementNumber() {
      // 手動先頭優先配置の順番（1始まり）
      if (!this.card) return 0

      const headPlacementCardIds = this.deckStore.headPlacementCardIds
      if (!headPlacementCardIds || !Array.isArray(headPlacementCardIds)) {
        return 0
      }

      const index = headPlacementCardIds.indexOf(this.card.cardId)
      return index >= 0 ? index + 1 : 0
    },
    isInCategory() {
      // 2段階検索の結果（cid単位でキャッシュ済み）を参照
      if (!this.card) return false
      return this.deckStore.categoryMatchedCardIds.has(this.card.cardId)
    },
    genesysPt() {
      // GENESYSモード時のカードpt。それ以外のモードでは undefined
      if (!this.card) return undefined
      return this.deckStore.getCardGenesysPoint(this.card.cardId)
    },
    showGenesysPt() {
      // pt > 0 のみ表示（0/undefined=規制対象外はバッジなし、OCG無制限カードと視覚整合）
      return this.genesysPt !== undefined && this.genesysPt > 0
    },
    genesysPtTier() {
      // pt値に応じた色ティア（スタイル用）。判定ロジックはregulation-card-badge.tsに一元化
      // （デッキ閲覧画面のregulation-ui.tsと共有。TASK-450）
      const pt = this.genesysPt
      return computeGenesysPtTier(pt === undefined ? 0 : pt)
    },
    isGenesysMode() {
      return this.deckStore.resolvedRegulation.mode === 'genesys'
    },
    isGenesysForbidden() {
      // GENESYSモード時、link/pendulumモンスターを禁止表示。判定ロジックは
      // regulation-card-badge.tsに一元化（デッキ閲覧画面のregulation-ui.tsと共有。TASK-450）
      if (!this.isGenesysMode) return false
      return isGenesysForbiddenCard(this.card)
    },
    isDragging() {
      if (this.sectionType !== 'practice') return false
      return this.draggingCardId === this.card.instanceId
    },
    canRotate() {
      if (this.sectionType !== 'practice') return false
      const noRotateZones = new Set(['gy', 'banish', 'deck', 'extra', 'hand'])
      return !!this.zone && !noRotateZones.has(this.zone)
    },
    isPracticeFaceDown() {
      return this.card.face === 'down' && !this.forceReveal && (this.zone === 'deck' || this.zone === 'extra')
    },
  },
  methods: {
    handleDragStart(event) {
      if (this.card.empty) {
        event.preventDefault()
        return
      }
      if (this.sectionType === 'practice') {
        const emptyImg = new Image()
        emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
        event.dataTransfer.setDragImage(emptyImg, 0, 0)
        const el = event.currentTarget
        const rect = el.getBoundingClientRect()
        const offset = { x: event.clientX - rect.left, y: event.clientY - rect.top }
        const cardSize = { width: rect.width, height: rect.height }
        event.dataTransfer.effectAllowed = 'move'
        setDragData(event, {
          cardId: this.card.instanceId,
          zone: this.zone,
          slotIndex: this.card.slotIndex,
        })
        this.dragStartedHorizontal = this.card.orientation === 'horizontal'
        const onRightClick = this.canRotate ? () => { this.toggleDragRotation() } : undefined
        this.startDrag(this.card.instanceId, this.card.orientation, this.cardImageUrl, offset, cardSize, onRightClick)
        this.$emit('practice-dragstart', event, this.uuid, offset)
        return
      }
      event.dataTransfer.effectAllowed = this.sectionType === 'search' ? 'copy' : 'move'
      setDragData(event, {
        sectionType: this.sectionType,
        index: this.index,
        card: this.card,
        uuid: this.uuid
      })

      // ドラッグ中のカード情報をストアに設定（移動可否判定用）
      this.deckStore.setDraggingCard({
        card: this.card,
        sectionType: this.sectionType
      })

      this.$emit('dragstart', event, this.sectionType, this.index, this.card)
    },
    handleDragOver(event) {
      if (this.sectionType === 'practice') return
      const dragging = this.deckStore.draggingCard

      // 移動可能かチェック
      const canMove = dragging && this.deckStore.canMoveCard(dragging.sectionType, this.sectionType, dragging.card)

      if (canMove) {
        // 移動可能な場合のみpreventDefaultを呼んでドロップを有効化
        event.preventDefault()
        event.stopPropagation()

        // ドラッグ中のカードが自分自身でない場合のみハイライト
        if (dragging && this.card && dragging.card.cardId === this.card.cardId && dragging.sectionType === this.sectionType) {
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
      if (this.sectionType === 'practice') {
        const wasRotated = this.draggingRotated
        this.endDrag()
        if (this.canRotate && wasRotated !== this.dragStartedHorizontal) {
          this.$emit('practice-action', 'toggleOrientation', this.uuid)
        }
        if (this.canRotate) {
          setTimeout(() => {
            if (this.postDragRotation) {
              this.postDragRotation = false
              this.$emit('practice-action', 'toggleOrientation', this.uuid)
            }
          }, 250)
        }
        this.isDragOver = false
        this.$emit('practice-dragend')
        return
      }
      // ドラッグ終了時にストアの情報をクリア
      this.deckStore.setDraggingCard(null)
      this.isDragOver = false
    },
    handleDrop(event) {
      if (this.sectionType === 'practice') return
      event.preventDefault()
      event.stopPropagation()
      this.isDragOver = false

      const data = parseDragData(event)
      if (!data) return

      const { sectionType: sourceSectionType, uuid: sourceUuid, card } = data

      // 移動可否チェック
      if (card && !this.deckStore.canMoveCard(sourceSectionType, this.sectionType, card)) {
        return
      }

      try {
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
    handleTopLeft() {
      // Info tab の場合：カードのリンクを新しいタブで開く
      if (this.sectionType === 'info') {
        const cardUrl = buildFullUrl(`/yugiohdb/card_search.action?ope=2&cid=${this.card.cardId}`)
        window.open(cardUrl, '_blank')
        return
      }

      // デッキ編集画面の場合：詳細情報を表示する
      this.getCardDetailAndDisplay()
    },
    async getCardDetailAndDisplay() {
      await this.showCardDetail(this.card.cardId, {
        fallbackCard: this.card,
        preserveCiid: true,
        resetCardTab: false,
      })
    },
    handleTopRight() {
      if (this.sectionType === 'practice') {
        this.$emit('practice-action', 'toggleFace', this.uuid)
      } else if (this.sectionType === 'side') {
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
      if (this.sectionType === 'practice') {
        this.$emit('practice-action', 'moveToHand', this.uuid)
      } else if (this.sectionType === 'trash') {
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

      if (this.sectionType === 'practice') {
        this.$emit('practice-action', 'moveToDeckBottom', this.uuid)
      } else if (this.sectionType === 'trash') {
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
      if (!this.card) return

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
      if (this.sectionType === 'practice') {
        event.preventDefault()
        if (this.isDragging && this.canRotate) {
          this.toggleDragRotation()
        } else if (!this.isDragging && this.canRotate) {
          this.$emit('practice-action', 'toggleOrientation', this.uuid)
        }
        return
      }
      // 高度なマウス操作が無効の場合は通常の右クリックメニューを表示
      if (!this.settingsStore.appSettings.ux.enableMouseOperations) {
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
      if (!this.settingsStore.appSettings.ux.enableMouseOperations) {
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

  /* 一人回しゾーン表示用 */
  &.section-practice {
    width: 100%;
    height: auto;
    aspect-ratio: 36 / 53;
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

.genesys-pt-badge {
  position: absolute;
  bottom: 5.56%; /* .limit-regulation と同位置 */
  left: 0;
  width: 100%;
  height: 19.44%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  font-size: 14px;
  font-weight: bold;
  color: var(--button-text);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);

  &.pt-tier-low {
    background: var(--genesys-pt-bg-low, #f9a825);
  }

  &.pt-tier-mid {
    background: var(--genesys-pt-bg-mid, #ef6c00);
  }

  &.pt-tier-high {
    background: var(--genesys-pt-bg-high, #c62828);
  }
}

.tail-placement-icon {
  position: absolute;
  bottom: 0;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 5;
  border-radius: 2px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);

  svg {
    color: var(--color-success, #4CAF50);
    width: 14px;
    height: 14px;
  }
}

.head-placement-icon {
  position: absolute;
  bottom: 0;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 5;
  border-radius: 2px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  color: var(--color-info, #2196F3);
  font-size: 11px;
  font-weight: bold;
}

.category-placement-icon {
  position: absolute;
  bottom: 0;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 5;
  border-radius: 2px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);

  svg {
    color: var(--color-info, #2196F3);
    width: 14px;
    height: 14px;
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
  direction: ltr;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 6; /* 優先配置矢印アイコン（z-index: 5）より前面に表示 */
}

.card-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  color: var(--button-text);
  font-size: calc(var(--right-area-font-size, 14px) * 0.57);
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
    /* 画像サイズに応じてアイコンサイズを調整 (デフォルト: カード幅の17%) */
    width: calc(var(--card-width-deck, 59px) * 0.17);
    height: calc(var(--card-width-deck, 59px) * 0.17);
  }

  /* section-infoでは--card-width-infoを使用 */
  .section-info & svg {
    width: calc(var(--card-width-info, 59px) * 0.17);
    height: calc(var(--card-width-info, 59px) * 0.17);
  }

  /* section-searchでは親要素の幅（100%）を基準に */
  .section-search & svg {
    width: 17%;
    height: auto;
    aspect-ratio: 1 / 1;
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
      font-size: calc(var(--right-area-font-size, 14px) * 0.64);
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
      font-size: calc(var(--right-area-font-size, 14px) * 0.64);
    }

    svg {
      width: 8px;
      height: 8px;
    }
  }

  &.always-visible {
    opacity: 1;
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
      font-size: calc(var(--right-area-font-size, 14px) * 0.64);
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
      font-size: calc(var(--right-area-font-size, 14px) * 0.64);
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

  &:active {
    opacity: 1;
    transform: scale(1.02);
  }
}

.btn-text {
  font-size: calc(var(--right-area-font-size, 14px) * 0.86);
  font-weight: bold;
  color: var(--button-text);
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  line-height: 1;
}

.btn-text-multiline {
  line-height: 0.8;
  font-size: calc(var(--right-area-font-size, 14px) * 0.86);
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
  font-size: calc(var(--right-area-font-size, 14px) * 0.57);
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

/* Practice mode: face-down */
.deck-card.face-down {
  opacity: 1;
}

.card-facedown-top {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.5;
}

.deck-card.horizontal {
  transform: rotate(-90deg);
  transform-origin: center center;

  &:hover {
    transform: rotate(-90deg) translateX(-2px);
  }
}

.deck-card.is-dragging {
  opacity: 0;
}

.card-actions-overlay {
  position: absolute;
  bottom: 1px;
  left: 1px;
  display: grid;
  grid-template-columns: repeat(2, 16px);
  gap: 1px;
  z-index: 5;
}

.card-action-btn {
  padding: 1px;
  width: 14px;
  height: 14px;
  border: none;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(25, 118, 210, 0.9);
  }

  svg {
    display: block;
  }
}

.card-action-empty {
  width: 14px;
  height: 14px;
}

.drag-rotate-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 200, 0, 0.85);
  pointer-events: none;
  z-index: 6;

  &.is-rotated {
    background: rgba(0, 200, 100, 0.85);
  }
}

.drag-facedown-indicator {
  position: absolute;
  top: 2px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(160, 160, 160, 0.5);
  pointer-events: none;
  z-index: 6;

  &.is-facedown {
    background: rgba(30, 30, 200, 0.85);
  }
}
</style>
