<template>
  <div class="ygo-next practice-control-panel">
    <div class="panel-section">
      <div class="section-title">Actions</div>
      <div class="action-grid">
        <button class="action-btn" :title="'Draw 1'" @click="practiceStore.draw(fieldIndex)">
          <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiCardOutline" /></svg>
          <span class="btn-label">Draw</span>
        </button>
        <button class="action-btn" :title="'Draw 2'" @click="practiceStore.drawMultiple(2, fieldIndex)">
          <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiCardsOutline" /></svg>
          <span class="btn-label">Draw 2</span>
        </button>
        <button class="action-btn" :title="'Shuffle Hand'" @click="practiceStore.shuffleHand(fieldIndex)">
          <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiShuffleVariant" /></svg>
          <span class="btn-label">Shuf H</span>
        </button>
        <button class="action-btn" :title="'Shuffle Extra'" @click="practiceStore.shuffleExtra(fieldIndex)">
          <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiShuffle" /></svg>
          <span class="btn-label">Shuf EX</span>
        </button>
        <button
          v-if="fieldIndex === 0"
          class="action-btn two-player-btn"
          :class="{ active: practiceStore.twoDeckMode }"
          :title="practiceStore.twoDeckMode ? 'Close 2P mode' : 'Open 2P mode'"
          @click="$emit('toggle-two-deck')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiAccountMultiple" /></svg>
          <span class="btn-label">2P Mode</span>
        </button>
      </div>
    </div>
    <div class="panel-section">
      <div class="section-title">Deck Info</div>
      <div class="zone-counts">
        <div
          class="zone-count"
          :class="{ selected: practiceStore.selectedZone === 'deck' }"
          @click="practiceStore.selectZone('deck')"
        >
          <span class="zone-label">Deck</span>
          <span class="zone-value">{{ deckCount }}</span>
        </div>
        <div
          class="zone-count"
          :class="{ selected: practiceStore.selectedZone === 'hand' }"
          @click="practiceStore.selectZone('hand')"
        >
          <span class="zone-label">Hand</span>
          <span class="zone-value">{{ zones.hand.length }}</span>
        </div>
        <div
          class="zone-count"
          :class="{ selected: practiceStore.selectedZone === 'gy' }"
          @click="practiceStore.selectZone('gy')"
        >
          <span class="zone-label">GY</span>
          <span class="zone-value">{{ zones.gy.length }}</span>
        </div>
        <div
          class="zone-count"
          :class="{ selected: practiceStore.selectedZone === 'banish' }"
          @click="practiceStore.selectZone('banish')"
        >
          <span class="zone-label">Banish</span>
          <span class="zone-value">{{ zones.banish.length }}</span>
        </div>
        <div
          class="zone-count"
          :class="{ selected: practiceStore.selectedZone === 'extra' }"
          @click="practiceStore.selectZone('extra')"
        >
          <span class="zone-label">Extra</span>
          <span class="zone-value">{{ zones.extra.length }}</span>
        </div>
        <div
          class="zone-count"
          :class="{ selected: practiceStore.selectedZone === 'temp' }"
          @click="practiceStore.selectZone('temp')"
        >
          <span class="zone-label">Temp</span>
          <span class="zone-value">{{ zones.temp.length }}</span>
        </div>
        <div
          class="zone-count"
          :class="{ selected: practiceStore.selectedZone === 'extraMonster' }"
          @click="practiceStore.selectZone('extraMonster')"
        >
          <span class="zone-label">EM</span>
          <span class="zone-value">{{ zones.extraMonster.flat().length }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePracticeStore } from '../../stores/practice'
import {
  mdiCardOutline,
  mdiCardsOutline,
  mdiShuffleVariant,
  mdiShuffle,
  mdiAccountMultiple,
} from '@mdi/js'

const props = withDefaults(defineProps<{
  fieldIndex?: number
}>(), {
  fieldIndex: 0,
})

defineEmits<{
  'toggle-two-deck': []
}>()

const practiceStore = usePracticeStore()

const zones = computed(() =>
  props.fieldIndex === 1 ? practiceStore.zones2 : practiceStore.zones
)
const deckCount = computed(() =>
  props.fieldIndex === 1 ? practiceStore.deckCount2 : practiceStore.deckCount
)
</script>

<style scoped lang="scss">
.practice-control-panel {
  padding: 8px;
}

.panel-section {
  margin-bottom: 8px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
}

.action-btn {
  padding: 4px 2px;
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 3px;
  background: var(--bg-tertiary, rgba(255, 255, 255, 0.08));
  color: var(--text-primary, #e0e0e0);
  font-size: 9px;
  cursor: pointer;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  &:hover {
    background: rgba(25, 118, 210, 0.3);
    border-color: var(--color-primary, #1976d2);
  }

  &:active {
    background: rgba(25, 118, 210, 0.5);
  }

  &.active {
    background: rgba(25, 118, 210, 0.4);
    border-color: var(--color-primary, #1976d2);
  }

  svg {
    flex-shrink: 0;
  }
}

.btn-label {
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  font-size: 8px;
}

.two-player-btn {
  grid-column: 1 / -1;
  flex-direction: row;
  gap: 4px;
  padding: 4px 8px;

  .btn-label {
    font-size: 10px;
  }
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, rgba(255, 255, 255, 0.6));
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-primary, rgba(255, 255, 255, 0.1));
}

.zone-counts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
}

.zone-count {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3px 4px;
  border-radius: 3px;
  background: var(--bg-tertiary, rgba(255, 255, 255, 0.08));
  cursor: pointer;
  transition: background 0.15s ease;
  gap: 1px;

  &:hover {
    background: rgba(25, 118, 210, 0.2);
  }

  &.selected {
    background: rgba(25, 118, 210, 0.4);
    border: 1px solid var(--color-primary, #1976d2);
  }
}

.zone-label {
  font-size: 9px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  line-height: 1;
}

.zone-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
  line-height: 1;
}
</style>
