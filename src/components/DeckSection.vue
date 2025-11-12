<template>
  <div 
    class="deck-section"
    :class="`${sectionType}-deck`"
    @dragover.prevent
    @drop="handleDrop"
  >
    <h3>
      {{ title }}
      <span v-if="showCount" class="count">{{ displayCards.length }}</span>
    </h3>
    <div class="card-grid" ref="cardGridRef" @dragover.prevent @drop="handleSectionDrop">
      <TransitionGroup name="card-list">
        <DeckCard
          v-for="displayCard in displayCards"
          :key="displayCard.uuid"
          :card="getCardInfo(displayCard.cid)"
          :section-type="sectionType"
          :uuid="displayCard.uuid"
        />
      </TransitionGroup>
      <!-- 空スペース: 最後尾にドロップ可能 -->
      <div 
        class="drop-zone-end" 
        @dragover.prevent 
        @drop="handleEndDrop"
      ></div>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick } from 'vue'
import DeckCard from '../components/DeckCard.vue'
import { useDeckEditStore } from '../stores/deck-edit'

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
    
    // displayOrderから該当セクションのカードリストを取得
    const displayCards = computed(() => {
      return deckStore.displayOrder[props.sectionType] || []
    })
    
    // cidからカード情報を取得
    const getCardInfo = (cid) => {
      const allDecks = [
        ...deckStore.deckInfo.mainDeck,
        ...deckStore.deckInfo.extraDeck,
        ...deckStore.deckInfo.sideDeck,
        ...deckStore.trashDeck
      ]
      
      const deckCard = allDecks.find(dc => dc.card.cardId === cid)
      return deckCard ? deckCard.card : null
    }

    const handleSectionDrop = (event) => {
      // カードグリッド全体へのドロップは無視（個別カードまたは末尾へ）
      event.stopPropagation()
    }
    
    const handleEndDrop = (event) => {
      event.preventDefault()
      event.stopPropagation()
      
      try {
        const data = event.dataTransfer.getData('text/plain')
        if (!data) return
        
        const { sectionType: sourceSectionType, uuid: sourceUuid } = JSON.parse(data)
        
        // 同じセクション内で最後尾に移動
        if (sourceSectionType === props.sectionType && sourceUuid) {
          const lastCard = displayCards.value[displayCards.value.length - 1]
          if (lastCard && lastCard.uuid !== sourceUuid) {
            // 最後のカードの次に移動（つまり最後尾）
            deckStore.reorderCard(sourceUuid, lastCard.uuid, props.sectionType)
            // 追加で1つ後ろにずらす
            nextTick(() => {
              const sectionOrder = deckStore.displayOrder[props.sectionType]
              const movedIndex = sectionOrder.findIndex(dc => dc.uuid === sourceUuid)
              const lastIndex = sectionOrder.length - 1
              if (movedIndex !== -1 && movedIndex < lastIndex) {
                const [card] = sectionOrder.splice(movedIndex, 1)
                sectionOrder.push(card)
              }
            })
          }
        }
      } catch (e) {
        console.error('End drop error:', e)
      }
    }

    const handleDrop = (event) => {
      event.preventDefault()
      event.stopPropagation()
      console.log('DeckSection drop:', props.sectionType)
      
      try {
        const data = event.dataTransfer.getData('text/plain')
        console.log('Drop data received:', data)
        if (!data) return
        
        const { sectionType: sourceSectionType, card, uuid } = JSON.parse(data)
        console.log('Parsed:', { sourceSectionType, card: card?.name, uuid, targetSection: props.sectionType })
        
        if (!card) return
        
        if (sourceSectionType === 'search') {
          console.log('Adding from search to:', props.sectionType)
          if (props.sectionType === 'main' || props.sectionType === 'extra') {
            deckStore.addCopyToMainOrExtra(card)
          } else if (props.sectionType === 'side') {
            deckStore.addCopyToSection(card, 'side')
          } else if (props.sectionType === 'trash') {
            // Ignore drop to trash from search
          }
        } else if (sourceSectionType === props.sectionType) {
          // 同じセクション内での並び替え
          console.log('Reordering within', props.sectionType, 'uuid:', uuid)
          // TODO: ドロップ位置を判定して並び替え
          // 現在は未実装のため何もしない
        } else {
          // 異なるセクション間での移動
          console.log('Moving from', sourceSectionType, 'to', props.sectionType, 'uuid:', uuid)
          deckStore.moveCard(card.cardId, sourceSectionType, props.sectionType, uuid)
        }
      } catch (e) {
        console.error('Drop error:', e)
      }
    }

    return {
      handleDrop,
      handleSectionDrop,
      handleEndDrop,
      cardGridRef,
      displayCards,
      getCardInfo
    }
  }
}
</script>

<style lang="scss" scoped>
.deck-section {
  background: white;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%;
  box-sizing: border-box;
  
  h3 {
    margin: 0 0 6px 0;
    padding: 2px 0;
    font-size: 13px;
    font-weight: bold;
    color: #333;
    border-bottom: 1px solid #ddd;
    line-height: 18px;
    
    .count {
      margin-left: 8px;
      color: #666;
      font-size: 12px;
      font-weight: normal;
    }
  }
  
  .card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    min-height: 60px;
    align-content: flex-start;
    justify-content: flex-start;
  }
  
  .drop-zone-end {
    min-width: 59px;
    min-height: 86px;
    border: 2px dashed transparent;
    border-radius: 4px;
    transition: border-color 0.2s;
    flex-shrink: 0;
  }
}

// カード追加/削除のトランジション
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
  flex: 1;
  min-height: 160px;
  max-width: 50%;
}

.trash-deck {
  flex: none;
  height: 100px;
  min-height: 100px;
  max-height: 100px;
  
  .card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    min-height: 70px;
  }
}
</style>
