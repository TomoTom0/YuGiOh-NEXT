<template>
  <div
    class="card-item"
    :draggable="!card.empty"
    @dragstart="handleDragStart"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @click="$emit('click', card)"
  >
    <img :src="cardImageUrl" :alt="card.name">
    <div v-if="!card.empty" class="card-controls">
      <button 
        class="card-btn top-left" 
        @click.stop="handleInfo"
      >
        <span class="btn-text">ⓘ</span>
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
        :class="bottomLeftClass"
        @click.stop="handleBottomLeft"
      >
        <svg v-if="showTrashIcon" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
        </svg>
        <span v-else-if="bottomLeftText === 'M/E'" class="btn-text">M</span>
        <span v-else-if="bottomLeftText" class="btn-text">{{ bottomLeftText }}</span>
      </button>
      <button 
        class="card-btn bottom-right"
        :class="bottomRightClass"
        @click.stop="handleBottomRight"
      >
        <svg v-if="showPlusIcon" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
        </svg>
        <span v-else class="btn-text">{{ bottomRightText }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import { useDeckEditStore } from '../stores/deck-edit'

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
    index: {
      type: Number,
      required: true
    }
  },
  setup() {
    const deckStore = useDeckEditStore()
    return { deckStore }
  },
  computed: {
    cardImageUrl() {
      if (this.card.imageUrl) {
        return this.card.imageUrl
      }
      return chrome.runtime.getURL('images/card_back.png')
    },
    topRightText() {
      if (this.sectionType === 'search') return ''
      if (this.sectionType === 'side') return 'M/E'
      if (this.sectionType === 'main' || this.sectionType === 'extra') return 'S'
      return ''
    },
    topRightClass() {
      if (this.sectionType === 'search') return ''
      if (this.sectionType === 'side') return 'card-btn-me'
      if (this.sectionType === 'main' || this.sectionType === 'extra') return 'card-btn-s'
      return ''
    },
    topLeftEmpty() {
      if (this.sectionType === 'search') return true
      return true
    },
    showTrashIcon() {
      return this.sectionType !== 'trash' && this.sectionType !== 'search'
    },
    bottomLeftText() {
      if (this.sectionType === 'search') return 'M/E'
      if (this.sectionType === 'trash') return 'M/E'
      return ''
    },
    bottomLeftClass() {
      if (this.sectionType === 'search') return 'card-btn-me'
      if (this.sectionType === 'trash') return 'card-btn-me'
      return ''
    },
    showPlusIcon() {
      return this.sectionType !== 'trash' && this.sectionType !== 'search'
    },
    bottomRightText() {
      if (this.sectionType === 'search') return 'S'
      if (this.sectionType === 'trash') return 'S'
      return ''
    },
    bottomRightClass() {
      if (this.sectionType === 'search') return 'card-btn-side'
      if (this.sectionType === 'trash') return 'card-btn-side'
      return ''
    },
    showSearchButtons() {
      return this.sectionType === 'search'
    }
  },
  methods: {
    handleDragStart(event) {
      console.log('DeckCard handleDragStart:', this.sectionType, this.card.name, 'empty:', this.card.empty)
      if (this.card.empty) {
        console.log('Card is empty, preventing drag')
        event.preventDefault()
        return
      }
      event.dataTransfer.effectAllowed = this.sectionType === 'search' ? 'copy' : 'move'
      event.dataTransfer.setData('text/plain', JSON.stringify({
        sectionType: this.sectionType,
        index: this.index,
        card: this.card
      }))
      console.log('Drag data set:', { sectionType: this.sectionType, card: this.card.name })
      this.$emit('dragstart', event, this.sectionType, this.index, this.card)
    },
    handleDragOver(event) {
      this.$emit('dragover', event)
    },
    handleDrop(event) {
      this.$emit('drop', event, this.sectionType, this.index)
    },
    handleInfo() {
      console.log('Info clicked, card:', this.card)
      this.deckStore.selectedCard = this.card
      this.deckStore.activeTab = 'card'
      this.deckStore.cardTab = 'info'
      console.log('Store updated - activeTab:', this.deckStore.activeTab, 'selectedCard:', this.deckStore.selectedCard)
    },
    handleTopRight() {
      if (this.sectionType === 'side') {
        this.deckStore.moveCardFromSide(this.card)
      } else if (this.sectionType === 'main' || this.sectionType === 'extra') {
        this.deckStore.moveCardToSide(this.card, this.sectionType)
      }
    },
    handleBottomLeft() {
      if (this.sectionType === 'trash') {
        this.deckStore.moveCardToMainOrExtra(this.card, 'trash')
      } else if (this.sectionType === 'search') {
        this.deckStore.addCopyToMainOrExtra(this.card)
      } else {
        this.deckStore.moveCardToTrash(this.card, this.sectionType)
      }
    },
    handleBottomRight() {
      if (this.sectionType === 'trash') {
        this.deckStore.moveCardToSide(this.card, 'trash')
      } else if (this.sectionType === 'search') {
        this.deckStore.addCopyToSection(this.card, 'side')
      } else {
        this.deckStore.addCopyToSection(this.card, this.sectionType)
      }
    }
  }
}
</script>

<style scoped lang="scss">
.card-item {
  width: 36px;
  height: 53px;
  border: 1px solid #ddd;
  border-radius: 2px;
  position: relative;
  overflow: hidden;
  background: #f9f9f9;
  cursor: move;
  flex-shrink: 0;
  flex-grow: 0;
  margin: 0;

  &:hover {
    border-color: #aaa;

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
    
    .btn-text {
      font-size: 9px;
    }

    svg {
      width: 8px;
      height: 8px;
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
