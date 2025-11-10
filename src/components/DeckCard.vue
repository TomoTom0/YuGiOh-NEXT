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
    <div v-if="!card.empty && !showSearchButtons" class="card-controls">
      <button 
        class="card-btn top-left" 
        @click.stop
      ></button>
      <button 
        v-if="topRightText"
        class="card-btn top-right"
        :class="topRightClass"
        @click.stop="handleTopRight"
      >
        <span v-if="topRightText === 'M/E'" class="btn-text btn-text-multiline">M<br>E</span>
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
        <span v-else-if="bottomLeftText === 'M/E'" class="btn-text btn-text-multiline">M<br>E</span>
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
    <div v-if="!card.empty && showSearchButtons" class="card-controls">
      <button 
        class="card-btn top-left" 
        @click.stop
      ></button>
      <button 
        class="card-btn top-right"
        @click.stop
      ></button>
      <button 
        class="card-btn bottom-left card-btn-me"
        @click.stop="handleBottomLeft"
      >
        <span class="btn-text btn-text-multiline">M<br>E</span>
      </button>
      <button 
        class="card-btn bottom-right card-btn-side"
        @click.stop="handleBottomRight"
      >
        <span class="btn-text">S</span>
      </button>
    </div>
  </div>
</template>

<script>
import { useDeckStore } from '../stores/deck'

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
    const deckStore = useDeckStore()
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
      this.$emit('dragstart', event, this.sectionType, this.index, this.card)
    },
    handleDragOver(event) {
      this.$emit('dragover', event)
    },
    handleDrop(event) {
      this.$emit('drop', event, this.sectionType, this.index)
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
  background: rgba(0, 0, 0, 0.4);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 8px;
  font-weight: bold;
  transition: all 0.15s;

  svg {
    display: block;
  }

  &.top-left {
    grid-column: 1;
    grid-row: 1;
    background: rgba(128, 128, 128, 0.3);

    &:hover {
      background: rgba(128, 128, 128, 0.5);
    }
  }

  &.top-right {
    grid-column: 2;
    grid-row: 1;
    background: rgba(180, 180, 180, 0.3);

    &:hover {
      background: rgba(180, 180, 180, 0.5);
    }

    &.card-btn-me {
      background: rgba(100, 150, 255, 0.6);

      &:hover {
        background: rgba(100, 150, 255, 0.95);
      }
    }

    &.card-btn-s {
      background: rgba(150, 100, 255, 0.6);

      &:hover {
        background: rgba(150, 100, 255, 0.95);
      }
    }
  }

  &.bottom-left {
    grid-column: 1;
    grid-row: 2;
    background: rgba(255, 100, 100, 0.6);

    &:hover {
      background: rgba(255, 100, 100, 0.95);
    }

    &.card-btn-me {
      background: rgba(100, 150, 255, 0.6);

      &:hover {
        background: rgba(100, 150, 255, 0.95);
      }
    }
  }

  &.bottom-right {
    grid-column: 2;
    grid-row: 2;
    background: rgba(100, 200, 100, 0.6);

    &:hover {
      background: rgba(100, 200, 100, 0.95);
    }

    &.card-btn-side {
      background: rgba(150, 100, 255, 0.6);

      &:hover {
        background: rgba(150, 100, 255, 0.95);
      }
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
