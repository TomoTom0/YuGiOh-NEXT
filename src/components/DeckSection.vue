<template>
  <div 
    class="deck-section"
    :class="`${sectionType}-deck`"
    @dragover="handleDragOver"
    @drop="onAreaDrop"
  >
    <h3>
      {{ title }}
      <span v-if="showCount" class="count">{{ cards.length }}</span>
    </h3>
    <div class="card-grid" @dragover="handleDragOver">
      <DeckCard
        v-for="(card, idx) in cards"
        :key="`${sectionType}-${idx}`"
        :card="card"
        :section-type="sectionType"
        :index="idx"
        @dragstart="$emit('dragstart', $event, sectionType, idx, card)"
        @dragover="handleDragOver"
        @drop="$emit('drop', $event, sectionType, idx)"
        @click="$emit('card-click', card)"
        @move-to-side="$emit('move-to-side', card, idx)"
        @move-from-side="$emit('move-from-side', card, idx)"
        @move-to-trash="$emit('move-to-trash', card, idx)"
        @move-from-trash="$emit('move-from-trash', card, idx)"
        @add-copy="$emit('add-copy', card, idx)"
      />
    </div>
  </div>
</template>

<script>
import DeckCard from '../components/DeckCard.vue'

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
  emits: ['dragstart', 'drop', 'area-drop', 'card-click', 'move-to-side', 'move-from-side', 'move-to-trash', 'move-from-trash', 'add-copy'],
  setup(props, { emit }) {
    const handleDragOver = (event) => {
      event.preventDefault()
      return false
    }

    const onAreaDrop = (event) => {
      emit('area-drop', event, props.sectionType)
    }

    return {
      handleDragOver,
      onAreaDrop
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
  height: 90px;
  min-height: 90px;
  max-height: 90px;
  
  .card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    min-height: 60px;
  }
}
</style>
