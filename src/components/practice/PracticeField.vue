<template>
  <PracticeDragOverlay v-if="fieldIndex === 0" />
  <div class="ygo-next practice-field" :class="{ 'field-opponent': fieldIndex === 1 }" :style="practiceCardStyle" v-if="isInitialized">
    <!-- Row 0: EM zones above M2(col3) and M4(col5) -->
    <div v-if="!hideEMZ" class="field-row row-em">
      <!-- P2 banish (only in 2P mode) -->
      <div v-if="practiceStore.twoDeckMode" class="field-slot banish-slot banish-p2" @mouseenter="hoveredZone = 'banish-p2'" @mouseleave="hoveredZone = null">
        <PracticeSlot
          :cards="practiceStore.zones2.banish"
          zone="banish"
          stack-direction="right-up"
          :max-visible="10"
          @card-click="handleCardClickP2"
          @slot-click="selectZoneOnlyP2('banish')"
          @card-action="handleActionP2"
          @card-dragstart="handleDragStartP2"
          @card-dragend="handleDragEndP2"
          @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZoneP2('banish', undefined, cardId, fromZone, fromSlotIndex, dropPos)"
          @deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDropP2('banish', undefined, cid, ciid, dropPos)"
        />
      </div>
      <div v-else class="field-slot empty-slot"></div>
      <div class="field-slot empty-slot"></div>
      <div class="field-slot em-slot" @mouseenter="hoveredZone = 'extraMonster-0'" @mouseleave="hoveredZone = null">
        <PracticeSlot
          :cards="currentZones.extraMonster[0]!"
          zone="extraMonster"
          :slot-index="0"
          stack-direction="right-up"
          @card-click="handleCardClick"
          @slot-click="selectZoneOnly('extraMonster', 0)"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZone('extraMonster', 0, cardId, fromZone, fromSlotIndex, dropPos)"
          @deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDrop('extraMonster', 0, cid, ciid, dropPos)"
        />
      </div>
      <div class="field-slot empty-slot"></div>
      <div class="field-slot em-slot" @mouseenter="hoveredZone = 'extraMonster-1'" @mouseleave="hoveredZone = null">
        <PracticeSlot
          :cards="currentZones.extraMonster[1]!"
          zone="extraMonster"
          :slot-index="1"
          stack-direction="right-up"
          @card-click="handleCardClick"
          @slot-click="selectZoneOnly('extraMonster', 1)"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZone('extraMonster', 1, cardId, fromZone, fromSlotIndex, dropPos)"
          @deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDrop('extraMonster', 1, cid, ciid, dropPos)"
        />
      </div>
      <div class="field-slot empty-slot"></div>
      <div class="field-slot banish-slot" @mouseenter="hoveredZone = 'banish'" @mouseleave="hoveredZone = null">
        <PracticeSlot
          :cards="currentZones.banish"
          zone="banish"
          stack-direction="right-up"
          :max-visible="10"
          @card-click="handleCardClick"
          @slot-click="selectZoneOnly('banish')"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZone('banish', undefined, cardId, fromZone, fromSlotIndex, dropPos)"
          @deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDrop('banish', undefined, cid, ciid, dropPos)"
        />
        <PracticeSlotControls
          zone="banish"
          :cards="currentZones.banish"
          :visible="hoveredZone === 'banish'"
          @action="handleAction"
          @open-menu="selectZoneOnly('banish')"
        />
      </div>
    </div>

    <!-- Row 1: Field / M1-M5 / GY (8 columns) -->
    <div class="field-row row-1">
      <div class="field-zone field-slot" @mouseenter="hoveredZone = 'field'" @mouseleave="hoveredZone = null">
        <PracticeSlot
          :cards="currentZones.field"
          zone="field"
          stack-direction="right-up"
          @card-click="handleCardClick"
          @slot-click="selectZoneOnly('field')"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZone('field', undefined, cardId, fromZone, fromSlotIndex, dropPos)"
          @deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDrop('field', undefined, cid, ciid, dropPos)"
        />
        <PracticeSlotControls
          :zone="'field'"
          :cards="currentZones.field"
          :visible="hoveredZone === 'field'"
          @action="handleAction"
          @open-menu="selectZoneOnly('field')"
        />
      </div>
      <div
        v-for="i in 5"
        :key="'m' + i"
        class="field-slot monster-slot"
        @mouseenter="hoveredZone = `monster-${i - 1}`"
        @mouseleave="hoveredZone = null"
      >
        <PracticeSlot
          :cards="currentZones.monster[i - 1]!"
          zone="monster"
          :slot-index="i - 1"
          stack-direction="right-up"
          @card-click="handleCardClick"
          @slot-click="selectZoneOnly('monster', i - 1)"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZone('monster', i - 1, cardId, fromZone, fromSlotIndex, dropPos)"
          @deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDrop('monster', i - 1, cid, ciid, dropPos)"
        />
        <PracticeSlotControls
          zone="monster"
          :cards="currentZones.monster[i - 1]!"
          :visible="hoveredZone === `monster-${i - 1}`"
          @action="handleAction"
          @open-menu="selectZoneOnly('monster', i - 1)"
        />
      </div>
      <div class="field-slot gy-slot" @mouseenter="hoveredZone = 'gy'" @mouseleave="hoveredZone = null">
        <PracticeSlot
          :cards="currentZones.gy"
          zone="gy"
          stack-direction="right-up"
          :max-visible="10"
          @card-click="handleCardClick"
          @slot-click="selectZoneOnly('gy')"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZone('gy', undefined, cardId, fromZone, fromSlotIndex, dropPos)"
          @deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDrop('gy', undefined, cid, ciid, dropPos)"
        />
        <PracticeSlotControls
          zone="gy"
          :cards="currentZones.gy"
          :visible="hoveredZone === 'gy'"
          @action="handleAction"
          @open-menu="selectZoneOnly('gy')"
        />
      </div>
    </div>

    <!-- Row 2: Extra / ST1-ST5 / Deck (7 columns) -->
    <div class="field-row row-2">
      <div class="field-slot extra-slot" @mouseenter="hoveredZone = 'extra'" @mouseleave="hoveredZone = null">
        <span class="zone-label">EX</span>
        <PracticeSlot
          :cards="currentZones.extra"
          zone="extra"
          stack-direction="none"
          :force-reveal="currentRevealExtra"
          @card-click="handleCardClick"
          @slot-click="selectZoneOnly('extra')"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZone('extra', undefined, cardId, fromZone, fromSlotIndex, dropPos)"
          @deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDrop('extra', undefined, cid, ciid, dropPos)"
        />
        <PracticeSlotControls
          zone="extra"
          :cards="currentZones.extra"
          :visible="hoveredZone === 'extra'"
          :reveal-extra="currentRevealExtra"
          @action="handleAction"
          @open-menu="selectZoneOnly('extra')"
        />
      </div>
      <div
        v-for="i in 5"
        :key="'st' + i"
        class="field-slot spelltrap-slot"
        @mouseenter="hoveredZone = `spellTrap-${i - 1}`"
        @mouseleave="hoveredZone = null"
      >
        <PracticeSlot
          :cards="currentZones.spellTrap[i - 1]!"
          zone="spellTrap"
          :slot-index="i - 1"
          stack-direction="right-up"
          @card-click="handleCardClick"
          @slot-click="selectZoneOnly('spellTrap', i - 1)"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZone('spellTrap', i - 1, cardId, fromZone, fromSlotIndex, dropPos)"
          @deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDrop('spellTrap', i - 1, cid, ciid, dropPos)"
        />
        <PracticeSlotControls
          zone="spellTrap"
          :cards="currentZones.spellTrap[i - 1]!"
          :visible="hoveredZone === `spellTrap-${i - 1}`"
          @action="handleAction"
          @open-menu="selectZoneOnly('spellTrap', i - 1)"
        />
      </div>
      <div class="field-slot deck-slot" @mouseenter="hoveredZone = 'deck'" @mouseleave="hoveredZone = null">
        <span class="zone-label">Main</span>
        <PracticeSlot
          :cards="currentZones.deck"
          zone="deck"
          stack-direction="none"
          :force-reveal="currentRevealDeck"
          @card-click="handleCardClick"
          @slot-click="selectZoneOnly('deck')"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZone('deck', undefined, cardId, fromZone, fromSlotIndex, dropPos)"
          @deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDrop('deck', undefined, cid, ciid, dropPos)"
        />
        <PracticeSlotControls
          zone="deck"
          :cards="currentZones.deck"
          :visible="hoveredZone === 'deck'"
          :deck-empty="currentDeckCount === 0"
          @action="handleAction"
          @open-menu="selectZoneOnly('deck')"
        />
      </div>
    </div>

    <!-- Row 3: Hand + Temp -->
    <div class="field-row row-3">
      <PracticeHandArea
        :hand-cards="currentZones.hand"
        :temp-cards="currentZones.temp"
        :reversed="fieldIndex === 1"
        :two-deck-mode="practiceStore.twoDeckMode"
        @card-click="handleCardClick"
        @card-action="handleAction"
        @card-dragstart="handleDragStart"
        @card-dragend="handleDragEnd"
        @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZone('hand', undefined, cardId, fromZone, fromSlotIndex, dropPos)"
        @deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDrop('hand', undefined, cid, ciid, dropPos)"
        @temp-card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDropOnZone('temp', undefined, cardId, fromZone, fromSlotIndex, dropPos)"
        @temp-deck-card-drop="(cid, ciid, dropPos) => handleDeckCardDrop('temp', undefined, cid, ciid, dropPos)"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePracticeStore, type ZoneType, type PracticeCard } from '../../stores/practice'
import { useSettingsStore } from '../../stores/settings'
import { useDeckEditStore } from '../../stores/deck-edit'
import { usePracticeDragState } from '../../composables/practice/usePracticeDragState'
import { usePracticeActions } from '../../composables/practice/usePracticeActions'
import { usePracticeDropHandler, type DropContext } from '../../composables/practice/usePracticeDropHandler'
import type { DropPosition } from '../../utils/drag-data'
import PracticeSlot from './PracticeSlot.vue'
import PracticeSlotControls from './PracticeSlotControls.vue'
import PracticeHandArea from './PracticeHandArea.vue'
import PracticeDragOverlay from './PracticeDragOverlay.vue'

const props = withDefaults(defineProps<{
  fieldIndex?: number
  hideEMZ?: boolean
}>(), {
  fieldIndex: 0,
  hideEMZ: false,
})

const practiceStore = usePracticeStore()
const settingsStore = useSettingsStore()
const deckStore = useDeckEditStore()
const { draggingRotated, draggingFaceDown } = usePracticeDragState()
const { executeAction } = usePracticeActions()
const dropHandler = usePracticeDropHandler()
const fi = computed(() => props.fieldIndex)
const hoveredZone = ref<string | null>(null)

const practiceCardStyle = computed(() => {
  const size = practiceStore.twoDeckMode
    ? settingsStore.practiceCardSize2PPixels
    : settingsStore.practiceCardSizePixels
  return {
    '--practice-card-width': `${size.width}px`,
    '--practice-card-height': `${size.height}px`,
  }
})

const isInitialized = computed(() =>
  fi.value === 1 ? practiceStore.initialized2 : practiceStore.initialized
)

const currentZones = computed(() =>
  fi.value === 1 ? practiceStore.zones2 : practiceStore.zones
)

const currentRevealDeck = computed(() =>
  fi.value === 1 ? practiceStore.revealDeck2 : practiceStore.revealDeck
)

const currentRevealExtra = computed(() =>
  fi.value === 1 ? practiceStore.revealExtra2 : practiceStore.revealExtra
)

const currentDeckCount = computed(() =>
  fi.value === 1 ? practiceStore.deckCount2 : practiceStore.deckCount
)

function selectZoneOnly(zone: ZoneType, slotIndex?: number) {
  practiceStore.selectZone(zone, slotIndex, fi.value)
  deckStore.activeTab = 'practice'
}

function handleCardClick(_card: PracticeCard) {
  // TODO: カード詳細表示等
}

function handleAction(action: string, cardId?: string) {
  const fieldIdx = fi.value
  if (!cardId) {
    if (action === 'draw') practiceStore.draw(fieldIdx)
    else if (action === 'shuffleDeck') practiceStore.shuffleDeck(fieldIdx)
    else if (action === 'revealExtraToggle') practiceStore.revealExtraContents(!currentRevealExtra.value, fieldIdx)
    return
  }

  executeAction(action, cardId, fieldIdx)
}

function handleDragStart(_card: PracticeCard, _event: DragEvent) {
  // drag data is set in PracticeCard
}

function handleDragEnd() {
  // cleanup if needed
}

function handleDropOnZone(targetZone: ZoneType, targetSlotIndex: number | undefined, cardId: string, _fromZone: ZoneType, _fromSlotIndex: number | undefined, dropPos: DropPosition) {
  const context: DropContext = { targetZone, targetSlotIndex, fieldIndex: fi.value }
  dropHandler.handleCardDrop(cardId, context, dropPos)
}

function handleDeckCardDrop(targetZone: ZoneType, _targetSlotIndex: number | undefined, cid: string, ciid: string, dropPos?: DropPosition) {
  const context: DropContext = { targetZone, targetSlotIndex: _targetSlotIndex, fieldIndex: fi.value }
  dropHandler.handleExternalCardDrop(cid, ciid, context, dropPos)
}

// P2 banish handlers (fieldIndex=1)
function selectZoneOnlyP2(zone: ZoneType, slotIndex?: number) {
  practiceStore.selectZone(zone, slotIndex, 1)
  deckStore.activeTab = 'practice'
}

function handleCardClickP2(_card: PracticeCard) {}

function handleActionP2(action: string, cardId?: string) {
  if (!cardId) {
    if (action === 'draw') practiceStore.draw(1)
    return
  }
  executeAction(action, cardId, 1)
}

function handleDragStartP2(_card: PracticeCard, _event: DragEvent) {}
function handleDragEndP2() {}

function handleDropOnZoneP2(targetZone: ZoneType, targetSlotIndex: number | undefined, cardId: string, _fromZone: ZoneType, _fromSlotIndex: number | undefined, dropPos: DropPosition) {
  const context: DropContext = { targetZone, targetSlotIndex, fieldIndex: 1 }
  dropHandler.handleCardDrop(cardId, context, dropPos)
}

function handleDeckCardDropP2(targetZone: ZoneType, _targetSlotIndex: number | undefined, cid: string, ciid: string, dropPos?: DropPosition) {
  const context: DropContext = { targetZone, targetSlotIndex: _targetSlotIndex, fieldIndex: 1 }
  dropHandler.handleExternalCardDrop(cid, ciid, context, dropPos)
}
</script>

<style scoped lang="scss">
$pw: var(--practice-card-width, 90px);
$ph: var(--practice-card-height, 130px);
$zw: calc(#{$pw} + 60px);
$sw: calc(#{$pw} + 16px);
$gap: 6px;
$slot-padding: 2px;
$slot-border: 1px;
$slot-overhead: calc(#{$slot-padding} * 2 + #{$slot-border} * 2);

.practice-field {
  display: flex;
  flex-direction: column;
  gap: $gap;
  padding: 8px;
  user-select: none;
  margin: 0;
  box-sizing: border-box;
  min-width: min-content;
  align-items: stretch;
  flex-shrink: 0;
}

.field-opponent {
  flex-direction: column-reverse;
  padding-bottom: 0;

  .field-row {
    direction: rtl;
  }
}

.field-fill {
}

.field-row {
  display: grid;
  gap: $gap;
  margin: 0;
  box-sizing: border-box;
  height: calc(#{$ph} + #{$slot-overhead});
  flex-shrink: 0;
  grid-template-columns: repeat(7, minmax(calc(#{$pw} + #{$slot-overhead}), 1fr));
}

.row-em {
}

.row-1 {
}

.row-2 {
}

.row-3 {
  width: 100%;
  grid-template-columns: none;
  height: auto;
  min-height: calc(#{$ph} + #{$slot-overhead});
}

.field-slot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: $ph;
  padding: $slot-padding;
  margin: 0;
  border: $slot-border dashed var(--border-secondary, rgba(255, 255, 255, 0.2));
  border-radius: 3px;
  box-sizing: border-box;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--color-primary, #1976d2);
  }
}

.field-zone {
  background: var(--zone-field-bg, transparent);
}

.monster-slot {
  background: var(--zone-monster-bg, transparent);
}

.spelltrap-slot {
  background: var(--zone-spelltrap-bg, transparent);
}

.gy-slot {
  background: var(--zone-gy-bg, transparent);
}

.banish-slot {
  background: var(--zone-banish-bg, transparent);
}

.deck-slot {
  background: var(--zone-deck-bg, transparent);
}

.extra-slot {
  background: var(--zone-extra-bg, transparent);
}

.zone-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 30%);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, rgba(255, 255, 255, 0.3));
  pointer-events: none;
  user-select: none;
  z-index: 0;
  letter-spacing: 0.5px;
}

.empty-slot {
  border: none;
  background: transparent;
}

.em-slot {
  background: var(--zone-extra-bg, rgba(128, 0, 128, 0.1));
}
</style>
