<template>
  <div class="ygo-next practice-player-panel">
    <div class="players-row">
      <!-- P1 -->
      <div class="player-section p1-section">
        <div class="deck-identity">
          <div class="deck-preview-wrap">
            <template v-if="p1DeckPreviewImages.length > 0">
              <img
                v-for="(url, i) in p1DeckPreviewImages.slice(0, 2)"
                :key="i"
                :src="url"
                class="deck-preview-card"
                :style="{ left: `${i * 20}px`, zIndex: p1DeckPreviewImages.length - i }"
                alt=""
              />
            </template>
            <div v-else class="deck-preview-empty" />
          </div>
          <div class="deck-meta">
            <span class="player-badge p1-badge">P1</span>
            <span class="deck-name">{{ p1DeckName }}</span>
          </div>
        </div>
        <div class="action-row">
          <button class="action-btn action-btn--primary" :title="'Open Deck'" @click="$emit('open-deck')">
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiFolderOpen" /></svg>
          </button>
          <button class="action-btn" :title="'Save Deck'" @click="$emit('save-deck', 0)">
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiContentSave" /></svg>
          </button>
          <button class="action-btn" :title="'Reset'" @click="practiceStore.resetPractice(0)">
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiShuffle" /></svg>
          </button>
          <button class="action-btn action-btn--danger action-btn--compact" :title="'Hard Reset'" @click="$emit('hard-reset')">
            <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiRefresh" /></svg>
          </button>
        </div>
      </div>

      <!-- P2 -->
      <div class="player-section p2-section">
        <template v-if="practiceStore.initialized2">
          <div class="deck-identity">
            <div class="deck-preview-wrap">
              <template v-if="p2DeckPreviewImages.length > 0">
                <img
                  v-for="(url, i) in p2DeckPreviewImages.slice(0, 2)"
                  :key="i"
                  :src="url"
                  class="deck-preview-card"
                  :style="{ left: `${i * 20}px`, zIndex: p2DeckPreviewImages.length - i }"
                  alt=""
                />
              </template>
              <div v-else class="deck-preview-empty" />
            </div>
            <div class="deck-meta">
              <span class="player-badge p2-badge">P2</span>
              <span class="deck-name">{{ practiceStore.p2DeckName || '(No Name)' }}</span>
              <button v-if="practiceStore.p2DeckName" class="clear-deck-name-btn" title="Clear" @click="clearP2DeckName">
                <svg width="10" height="10" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiClose" /></svg>
              </button>
            </div>
          </div>
          <div class="action-row">
            <button class="action-btn action-btn--primary" :title="'Open Deck'" @click="$emit('open-deck-p2')">
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiFolderOpen" /></svg>
            </button>
            <button class="action-btn" :title="'Save Deck'" @click="$emit('save-deck', 1)">
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiContentSave" /></svg>
            </button>
            <button class="action-btn" :title="'Reset'" @click="practiceStore.resetPractice(1)">
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiShuffle" /></svg>
            </button>
            <button class="action-btn action-btn--danger action-btn--compact" :title="'Hard Reset'" @click="practiceStore.resetPractice(1)">
              <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiRefresh" /></svg>
            </button>
          </div>
        </template>
        <template v-else>
          <div class="deck-identity">
            <div class="deck-preview-wrap">
              <div class="deck-preview-empty" />
            </div>
            <div class="deck-meta">
              <span class="player-badge p2-badge">P2</span>
              <span class="deck-name">(No Deck)</span>
            </div>
          </div>
          <div class="action-row">
            <button class="action-btn action-btn--primary" :title="'Open Deck'" @click="$emit('open-deck-p2')">
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiFolderOpen" /></svg>
            </button>
            <button class="action-btn" :title="'Save Deck'" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiContentSave" /></svg>
            </button>
            <button class="action-btn" :title="'Reset'" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiShuffle" /></svg>
            </button>
            <button class="action-btn action-btn--danger action-btn--compact" :title="'Hard Reset'" disabled>
              <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" :d="mdiRefresh" /></svg>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePracticeStore } from '../../stores/practice'
import { useDeckEditStore } from '../../stores/deck-edit'
import {
  mdiRefresh,
  mdiFolderOpen,
  mdiContentSave,
  mdiShuffle,
  mdiClose,
} from '@mdi/js'

const emit = defineEmits<{
  'hard-reset': []
  'open-deck': []
  'open-deck-p2': []
  'save-deck': [playerIndex: number]
}>()

const practiceStore = usePracticeStore()
const deckStore = useDeckEditStore()

const p1DeckName = computed(() => deckStore.getDeckName() || '(No Name)')

function getDeckThumbnail(dno: number | null | undefined): string[] {
  if (!dno) return []
  const url = deckStore.deckThumbnails.get(dno)
  return url ? [url] : []
}

const p1DeckPreviewImages = computed(() => getDeckThumbnail(deckStore.deckInfo.dno))
const p2DeckPreviewImages = computed(() => getDeckThumbnail(practiceStore.p2DeckDno))

function clearP2DeckName() {
  practiceStore.p2DeckName = ''
}
</script>

<style scoped lang="scss">
.practice-player-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.players-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  align-items: start;
}

.player-section {
  padding: 6px;
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.1));
  border-radius: 3px;
  min-width: 0;
}

.deck-identity {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 6px;
}

.deck-preview-wrap {
  position: relative;
  flex-shrink: 0;
  width: 100%;
  aspect-ratio: 5 / 7;
  max-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.deck-preview-card {
  position: absolute;
  top: 0;
  max-height: 80px;
  max-width: 100%;
  width: auto;
  height: auto;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.deck-preview-empty {
  width: 316px;
  max-width: 100%;
  height: 100%;
  background: var(--bg-tertiary, rgba(255, 255, 255, 0.06));
  border-radius: 2px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.deck-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.player-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.p1-badge {
  background: rgba(25, 118, 210, 0.25);
  color: #64b5f6;
  border: 1px solid rgba(25, 118, 210, 0.4);
}

.p2-badge {
  background: rgba(220, 80, 80, 0.2);
  color: #ef9a9a;
  border: 1px solid rgba(220, 80, 80, 0.35);
}

.deck-name {
  font-size: 13px;
  color: var(--text-primary, #e0e0e0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.clear-deck-name-btn {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--text-primary, #e0e0e0);
    background: rgba(255, 255, 255, 0.1);
  }
}

.action-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
}

.action-btn {
  padding: 4px 6px;
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 3px;
  background: var(--bg-tertiary, rgba(255, 255, 255, 0.08));
  color: var(--text-primary, #e0e0e0);
  font-size: 9px;
  cursor: pointer;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(25, 118, 210, 0.3);
    border-color: var(--color-primary, #1976d2);
  }

  &:active {
    background: rgba(25, 118, 210, 0.5);
  }

  svg {
    flex-shrink: 0;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.action-btn--primary {
  background: rgba(25, 118, 210, 0.2);
  border-color: rgba(25, 118, 210, 0.4);
}

.action-btn--danger {
  &:hover {
    background: rgba(220, 80, 80, 0.3);
    border-color: rgba(220, 80, 80, 0.6);
  }
}

.action-btn--compact {
  padding: 2px;
}
</style>
