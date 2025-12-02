<template>
  <div
    class="deck-section"
    :class="[`${sectionType}-deck`, { 'section-drag-over': isSectionDragOver }]"
    @dragover.prevent="handleSectionDragOver"
    @dragleave="handleSectionDragLeave"
    @drop="handleEndDrop"
    @dragend="handleDragEnd"
  >
    <h3>
      <span class="title-group">
        {{ title }}
        <span v-if="showCount" class="count">{{ displayCards.length }}</span>
      </span>
      <span v-if="sectionType !== 'trash'" class="section-buttons">
        <button
          class="btn-section"
          title="Shuffle"
          @click="handleShuffle"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" :d="mdiShuffle" />
          </svg>
        </button>
        <button
          class="btn-section"
          title="Sort"
          @click="handleSort"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" :d="mdiSort" />
          </svg>
        </button>
      </span>
    </h3>
    <div class="card-grid" ref="cardGridRef">
      <TransitionGroup name="card-list">
        <DeckCard
          v-for="displayCard in displayCards"
          :key="displayCard.uuid"
          :card="getCardInfo(displayCard.cid, displayCard.ciid)"
          :section-type="sectionType"
          :uuid="displayCard.uuid"
        />
      </TransitionGroup>
      <!-- 空スペース: 最後尾にドロップ可能 -->
      <div
        class="drop-zone-end"
        @dragover.prevent="handleEndZoneDragOver"
        @dragleave="handleEndZoneDragLeave"
        @drop="handleEndDrop"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import DeckCard from '../components/DeckCard.vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { mdiShuffle, mdiSort } from '@mdi/js'
import { getTempCardDB } from '../utils/temp-card-db'

export default {
  name: 'DeckSection',
  components: {
    DeckCard
  },
  props: {
    title: {
      type: String,
      required: true
    },
    sectionType: {
      type: String,
      required: true
    },
    cards: {
      type: Array,
      required: true
    },
    showCount: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const deckStore = useDeckEditStore()
    const cardGridRef = ref(null)
    const isSectionDragOver = ref(false)

    const handleMoveResult = (result) => {
      if (!result || result.success) return true
      console.error('[DeckSection] 移動失敗:', result.error)
      return false
    }

    // displayOrderから該当セクションのカードリストを取得
    const displayCards = computed(() => {
      return deckStore.displayOrder[props.sectionType] || []
    })
    
    // (cid, ciid)ペアでカード情報を取得
    const getCardInfo = (cid: string, ciid: number) => {
      const tempCardDB = getTempCardDB()
      const cardInfo = tempCardDB.get(cid)
      if (!cardInfo) return null
      // ciidを反映させて返す（TempCardDB は cid をキーにしているため、ciid を別途設定）
      return { ...cardInfo, ciid: String(ciid) }
    }

    const handleEndZoneDragOver = (event) => {
      // 移動可能な場合のみpreventDefaultを呼ぶ
      const canDrop = canDropToSection()
      if (canDrop) {
        event.preventDefault()
      }
    }

    const handleEndZoneDragLeave = (event) => {
      // 何もしない（視覚的フィードバックは不要）
    }

    const handleEndDrop = (event) => {
      event.preventDefault()
      event.stopPropagation()
      isSectionDragOver.value = false

      // 移動可能かチェック
      if (!canDropToSection()) {
        return
      }

      try {
        const data = event.dataTransfer.getData('text/plain')
        if (!data) {
          return
        }

        const { sectionType: sourceSectionType, uuid: sourceUuid, card } = JSON.parse(data)

        if (!card) {
          return
        }

        // searchセクションからのドロップ
        if (sourceSectionType === 'search') {
          if (props.sectionType === 'main' || props.sectionType === 'extra') {
            deckStore.addCopyToMainOrExtra(card)
          } else if (props.sectionType === 'side') {
            deckStore.addCopyToSection(card, 'side')
          }
          // trashへのドロップは無視
          return
        }

        if (sourceSectionType === props.sectionType && sourceUuid) {
          const result = deckStore.reorderWithinSection(props.sectionType, sourceUuid, null)
          handleMoveResult(result)
        }
        else if (sourceSectionType !== props.sectionType) {
          const result = deckStore.moveCard(card.cardId, sourceSectionType, props.sectionType, sourceUuid)
          handleMoveResult(result)
        }
      } catch (e) {
        console.error('End drop error:', e)
      }
    }

    const handleShuffle = () => {
      deckStore.shuffleSection(props.sectionType)
    }

    const handleSort = () => {
      deckStore.sortSection(props.sectionType)
    }

    // ドラッグ中のカードが移動可能なセクションか判定（ストアのcanMoveCardを使用）
    const canDropToSection = () => {
      const dragging = deckStore.draggingCard
      if (!dragging) {
        return true // draggingCardがない場合はtrueを返す（後方互換性）
      }

      const { card, sectionType: from } = dragging
      const to = props.sectionType

      const canMove = deckStore.canMoveCard(from, to, card)
      return canMove
    }

    const handleSectionDragOver = (event) => {
      // 移動可能かチェック
      const canDrop = canDropToSection()

      if (canDrop) {
        // 移動可能な場合のみpreventDefaultを呼んでドロップを有効化
        event.preventDefault()
        if (!isSectionDragOver.value) {
          isSectionDragOver.value = true
        }
      } else {
        // 移動不可の場合はpreventDefaultを呼ばない（ドロップ無効）
        if (isSectionDragOver.value) {
          isSectionDragOver.value = false
        }
      }
    }

    const handleSectionDragLeave = (event) => {
      // セクション境界を出た時のみdrag-overを解除
      if (event.currentTarget === event.target || !event.currentTarget.contains(event.relatedTarget)) {
        isSectionDragOver.value = false
      }
    }

    const handleDragEnd = () => {
      // ドラッグ終了時にセクションのハイライトを確実にリセット
      isSectionDragOver.value = false
    }

    // グローバルなdragendイベントをリスン
    onMounted(() => {
      window.addEventListener('dragend', handleDragEnd)
    })

    onUnmounted(() => {
      window.removeEventListener('dragend', handleDragEnd)
    })

    return {
      handleEndDrop,
      handleEndZoneDragOver,
      handleEndZoneDragLeave,
      handleShuffle,
      handleSort,
      handleSectionDragOver,
      handleSectionDragLeave,
      handleDragEnd,
      cardGridRef,
      displayCards,
      getCardInfo,
      isSectionDragOver,
      mdiShuffle,
      mdiSort
    }
  }
}
</script>

<style lang="scss" scoped>
.deck-section {
  background: var(--bg-primary, white);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%;
  height: auto;
  overflow: visible;
  box-sizing: border-box;
  transition: background 0.2s ease, outline 0.2s ease;

  &.section-drag-over {
    background: rgba(0, 150, 255, 0.15);
    outline: 2px dashed #0096ff;
    outline-offset: -2px;
  }

  h3 {
    margin: 0 0 6px 0;
    padding: 2px 0;
    font-size: 13px;
    font-weight: bold;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-primary);
    line-height: 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .title-group {
      font-weight: bold;
    }

    .count {
      margin-left: 8px;
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: normal;
    }

    .section-buttons {
      display: inline-flex;
      gap: 4px;
      align-items: center;
    }

    .btn-section {
      background: transparent;
      border: 1px solid var(--border-primary);
      color: var(--text-primary);
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: var(--bg-secondary);
        border-color: var(--border-secondary);
        color: var(--text-primary);
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }

  .card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    // 最後の1枚をドラッグ中でもドロップ可能にするため、カード1枚分の高さを確保
    min-height: var(--card-height-deck);
    height: auto;
    align-content: flex-start;
    justify-content: flex-start;
  }

  .drop-zone-end {
    min-width: 59px;
    // ドラッグ中のカードがposition:absoluteになるため、
    // drop-zone-endでグリッドの高さを維持する必要がある
    min-height: var(--card-height-deck);
    flex-shrink: 0;
    // 視覚的なフィードバックは不要（セクション全体の背景色で十分）
  }
}

// TransitionGroupのアニメーションを完全に無効化
// カスタムFLIPアニメーションのみを使用
.card-list-enter-active {
  transition: all 0.3s ease;
}
.card-list-leave-active {
  transition: all 0.3s ease;
  position: absolute;
}
.card-list-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.card-list-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
.card-list-move {
  transition: transform 0.3s ease;
}

.main-deck {
  flex: none;
  min-height: 160px;
  height: auto;
}

.extra-deck,
.side-deck {
  flex: 1 1 auto;
  // max-widthは親コンテナ（middle-decks）で制御
}

.trash-deck {
  flex: none;
  // カードの高さ + パディング + ヘッダー分を考慮
  // --card-height-deck は設定で変更される可能性があるため、calc()で計算
  height: calc(var(--card-height-deck) + 50px);
  min-height: calc(var(--card-height-deck) + 50px);
  max-height: calc(var(--card-height-deck) + 50px);

  .card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    min-height: var(--card-height-deck);
  }
}
</style>
