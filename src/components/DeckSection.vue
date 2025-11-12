<template>
  <div 
    class="deck-section"
    :class="`${sectionType}-deck`"
    @dragover.prevent
    @drop="handleDrop"
  >
    <h3>
      {{ title }}
      <span v-if="showCount" class="count">{{ cards.length }}</span>
    </h3>
    <div class="card-grid" ref="cardGridRef" @dragover.prevent @drop="handleDrop">
      <DeckCard
        v-for="(card, idx) in cards"
        :key="`${sectionType}-${idx}`"
        :card="card"
        :section-type="sectionType"
        :index="idx"
      />
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
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

    const handleDrop = (event) => {
      event.preventDefault()
      event.stopPropagation()
      console.log('DeckSection drop:', props.sectionType)
      
      try {
        const data = event.dataTransfer.getData('text/plain')
        console.log('Drop data received:', data)
        if (!data) return
        
        const { sectionType: sourceSectionType, card } = JSON.parse(data)
        console.log('Parsed:', { sourceSectionType, card: card?.name, targetSection: props.sectionType })
        
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
        } else if (sourceSectionType !== props.sectionType) {
          console.log('Moving from', sourceSectionType, 'to', props.sectionType)
          deckStore.moveCard(card.cardId, sourceSectionType, props.sectionType)
        }
      } catch (e) {
        console.error('Drop error:', e)
      }
    }

    return {
      handleDrop,
      cardGridRef
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
