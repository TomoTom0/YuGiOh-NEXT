<template>
  <div class="ygo-next practice-field" :class="{ 'field-opponent': fieldIndex === 1 }" :style="practiceCardStyle" v-if="isInitialized">
    <!-- Row 1: Field / M1-M5 / GY / Banish -->
    <div class="field-row row-1">
      <div class="field-zone field-slot" @mouseenter="hoveredZone = 'field'" @mouseleave="hoveredZone = null">
        <PracticeSlot
          :cards="currentZones.field"
          zone="field"
          stack-direction="right-up"
          @card-click="handleCardClick"
          @slot-click="openMenu('field')"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex) => handleDropOnZone('field', undefined, cardId, fromZone, fromSlotIndex)"
        />
        <PracticeSlotControls
          :zone="'field'"
          :cards="currentZones.field"
          :visible="hoveredZone === 'field'"
          @action="handleAction"
          @open-menu="openMenu('field')"
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
          @slot-click="openMenu('monster', i - 1)"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex) => handleDropOnZone('monster', i - 1, cardId, fromZone, fromSlotIndex)"
        />
        <PracticeSlotControls
          zone="monster"
          :cards="currentZones.monster[i - 1]!"
          :visible="hoveredZone === `monster-${i - 1}`"
          @action="handleAction"
          @open-menu="openMenu('monster', i - 1)"
        />
      </div>
      <div class="field-slot gy-slot" @mouseenter="hoveredZone = 'gy'" @mouseleave="hoveredZone = null">
        <PracticeSlot
          :cards="currentZones.gy"
          zone="gy"
          stack-direction="left-up"
          @card-click="handleCardClick"
          @slot-click="openMenu('gy')"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex) => handleDropOnZone('gy', undefined, cardId, fromZone, fromSlotIndex)"
        />
        <PracticeSlotControls
          zone="gy"
          :cards="currentZones.gy"
          :visible="hoveredZone === 'gy'"
          @action="handleAction"
          @open-menu="openMenu('gy')"
        />
      </div>
      <div class="field-slot banish-slot" @mouseenter="hoveredZone = 'banish'" @mouseleave="hoveredZone = null">
        <PracticeSlot
          :cards="currentZones.banish"
          zone="banish"
          stack-direction="left-up"
          @card-click="handleCardClick"
          @slot-click="openMenu('banish')"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex) => handleDropOnZone('banish', undefined, cardId, fromZone, fromSlotIndex)"
        />
        <PracticeSlotControls
          zone="banish"
          :cards="currentZones.banish"
          :visible="hoveredZone === 'banish'"
          @action="handleAction"
          @open-menu="openMenu('banish')"
        />
      </div>
    </div>

    <!-- Row 2: Extra / ST1-ST5 / Deck / (empty) -->
    <div class="field-row row-2">
      <div class="field-slot extra-slot" @mouseenter="hoveredZone = 'extra'" @mouseleave="hoveredZone = null">
        <PracticeSlot
          :cards="currentZones.extra"
          zone="extra"
          stack-direction="none"
          :force-reveal="true"
          @card-click="handleCardClick"
          @slot-click="openMenu('extra')"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex) => handleDropOnZone('extra', undefined, cardId, fromZone, fromSlotIndex)"
        />
        <PracticeSlotControls
          zone="extra"
          :cards="currentZones.extra"
          :visible="hoveredZone === 'extra'"
          @action="handleAction"
          @open-menu="openMenu('extra')"
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
          @slot-click="openMenu('spellTrap', i - 1)"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex) => handleDropOnZone('spellTrap', i - 1, cardId, fromZone, fromSlotIndex)"
        />
        <PracticeSlotControls
          zone="spellTrap"
          :cards="currentZones.spellTrap[i - 1]!"
          :visible="hoveredZone === `spellTrap-${i - 1}`"
          @action="handleAction"
          @open-menu="openMenu('spellTrap', i - 1)"
        />
      </div>
      <div class="field-slot deck-slot" @mouseenter="hoveredZone = 'deck'" @mouseleave="hoveredZone = null">
        <PracticeSlot
          :cards="currentZones.deck"
          zone="deck"
          stack-direction="none"
          :force-reveal="currentRevealDeck"
          @card-click="handleCardClick"
          @slot-click="openMenu('deck')"
          @card-action="handleAction"
          @card-dragstart="handleDragStart"
          @card-dragend="handleDragEnd"
          @card-drop="(cardId, fromZone, fromSlotIndex) => handleDropOnZone('deck', undefined, cardId, fromZone, fromSlotIndex)"
        />
        <PracticeSlotControls
          zone="deck"
          :cards="currentZones.deck"
          :visible="hoveredZone === 'deck'"
          :deck-empty="currentDeckCount === 0"
          @action="handleAction"
          @open-menu="openMenu('deck')"
        />
      </div>
      <div class="field-slot empty-slot"></div>
    </div>

    <!-- Row 3: Hand + Temp -->
    <div class="field-row row-3">
      <PracticeHandArea
        :hand-cards="currentZones.hand"
        :temp-cards="currentZones.temp"
        @card-click="handleCardClick"
        @card-action="handleAction"
        @card-dragstart="handleDragStart"
        @card-dragend="handleDragEnd"
        @card-drop="(cardId, fromZone, fromSlotIndex) => handleDropOnZone('hand', undefined, cardId, fromZone, fromSlotIndex)"
      />
    </div>

    <!-- Menu Dialog -->
    <PracticeSlotMenuDialog
      :visible="menuVisible"
      :cards="menuCards"
      :zone="menuZone"
      :slot-index="menuSlotIndex"
      @close="menuVisible = false"
      @action="handleMenuAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePracticeStore, type ZoneType, type PracticeCard } from '../../stores/practice'
import { useSettingsStore } from '../../stores/settings'
import PracticeSlot from './PracticeSlot.vue'
import PracticeSlotControls from './PracticeSlotControls.vue'
import PracticeHandArea from './PracticeHandArea.vue'
import PracticeSlotMenuDialog from './PracticeSlotMenuDialog.vue'

const props = withDefaults(defineProps<{
  fieldIndex?: number
}>(), {
  fieldIndex: 0,
})

const practiceStore = usePracticeStore()
const settingsStore = useSettingsStore()
const fi = computed(() => props.fieldIndex)
const hoveredZone = ref<string | null>(null)

const practiceCardStyle = computed(() => {
  const { width, height } = settingsStore.practiceCardSizePixels
  return {
    '--practice-card-width': `${width}px`,
    '--practice-card-height': `${height}px`,
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

const currentDeckCount = computed(() =>
  fi.value === 1 ? practiceStore.deckCount2 : practiceStore.deckCount
)

const menuVisible = ref(false)
const menuZone = ref<ZoneType>('deck')
const menuSlotIndex = ref<number | undefined>(undefined)

const menuCards = computed(() => {
  return practiceStore.getCards(menuZone.value, menuSlotIndex.value, fi.value)
})

function openMenu(zone: ZoneType, slotIndex?: number) {
  menuZone.value = zone
  menuSlotIndex.value = slotIndex
  menuVisible.value = true
}

function handleCardClick(_card: PracticeCard) {
  // TODO
}

function handleAction(action: string, cardId?: string) {
  const fieldIdx = fi.value
  if (!cardId) {
    if (action === 'draw') practiceStore.draw(fieldIdx)
    else if (action === 'shuffleDeck') practiceStore.shuffleDeck(fieldIdx)
    return
  }

  if (action === 'moveToGY') practiceStore.moveCard(cardId, 'gy', undefined, undefined, fieldIdx)
  else if (action === 'moveToHand') practiceStore.moveCard(cardId, 'hand', undefined, undefined, fieldIdx)
  else if (action === 'moveToBanish') practiceStore.moveCard(cardId, 'banish', undefined, undefined, fieldIdx)
  else if (action === 'moveToField') {
    practiceStore.moveCard(cardId, 'monster', 0, undefined, fieldIdx)
  }
  else if (action === 'moveToTemp') practiceStore.moveCard(cardId, 'temp', undefined, undefined, fieldIdx)
  else if (action === 'moveToDeckTop') practiceStore.moveCard(cardId, 'deck', undefined, { position: 'top', face: 'down' }, fieldIdx)
  else if (action === 'moveToDeckBottom') practiceStore.moveCard(cardId, 'deck', undefined, { position: 'bottom', face: 'down' }, fieldIdx)
  else if (action === 'toggleFace') {
    const loc = practiceStore.findCard(cardId, fieldIdx)
    if (loc) {
      const cards = practiceStore.getCards(loc.zone, loc.slotIndex, fieldIdx)
      const card = cards[loc.cardIndex]
      if (card) practiceStore.setCardFace(cardId, card.face === 'up' ? 'down' : 'up', fieldIdx)
    }
  }
  else if (action === 'toggleOrientation') {
    const loc = practiceStore.findCard(cardId, fieldIdx)
    if (loc) {
      const cards = practiceStore.getCards(loc.zone, loc.slotIndex, fieldIdx)
      const card = cards[loc.cardIndex]
      if (card) practiceStore.setCardOrientation(cardId, card.orientation === 'vertical' ? 'horizontal' : 'vertical', fieldIdx)
    }
  }
}

function handleDragStart(_card: PracticeCard, _event: DragEvent) {
  // drag data is set in PracticeCard
}

function handleDragEnd() {
  // cleanup if needed
}

function handleDropOnZone(targetZone: ZoneType, targetSlotIndex: number | undefined, cardId: string, _fromZone: ZoneType, _fromSlotIndex: number | undefined) {
  const fieldIdx = fi.value
  if (targetZone === 'deck') {
    practiceStore.moveCard(cardId, targetZone, targetSlotIndex, { position: 'top', face: 'down' }, fieldIdx)
  } else {
    practiceStore.moveCard(cardId, targetZone, targetSlotIndex, undefined, fieldIdx)
  }
}

function handleMenuAction(action: string, cardId: string) {
  handleAction(action, cardId)
}
</script>

<style scoped lang="scss">
$pw: var(--practice-card-width, 75px);
$ph: var(--practice-card-height, 110px);
$gap: 4px;

.practice-field {
  display: flex;
  flex-direction: column;
  gap: $gap;
  padding: 8px;
  user-select: none;
}

.field-opponent {
  flex-direction: column-reverse;
}

.field-row {
  display: grid;
  gap: $gap;
}

.row-1 {
  grid-template-columns: $pw repeat(5, $pw) $pw $pw;
}

.row-2 {
  grid-template-columns: $pw repeat(5, $pw) $pw $pw;
}

.row-3 {
  width: 100%;
}

.field-slot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: $ph;
  border: 1px dashed var(--border-secondary, rgba(255, 255, 255, 0.2));
  border-radius: 3px;
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

.empty-slot {
  border: none;
  background: transparent;
}
</style>
