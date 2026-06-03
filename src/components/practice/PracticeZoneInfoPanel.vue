<template>
  <div class="ygo-next practice-zone-info-panel">
    <template v-if="zone">
      <div class="zone-header">
        <span class="zone-label">{{ zoneLabel }}</span>
        <span class="zone-count">{{ cards.length }}</span>
      </div>

      <div class="card-list-wrap" @click.capture="handleCardClick">
        <CardList
          :cards="sortedCards"
          section-type="practice"
          :sort-order="cardListSortOrder"
          :unique-id="`zone-${zone}-${slotIndex}`"
          :force-reveal="true"
          :zone="zone"
          @update:sort-order="handleSortChange"
          @practice-dragstart="handlePracticeDragStart"
          @practice-dragend="handlePracticeDragEnd"
          @practice-action="handlePracticeAction"
        />
      </div>
    </template>
    <div v-else class="no-selection">
      Select a zone to view cards
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePracticeStore, type PracticeCard, type ZoneType } from '../../stores/practice'
import { useDeckEditStore } from '../../stores/deck-edit'
import { useSettingsStore } from '../../stores/settings'
import { getCardImageUrl } from '../../types/card'
import { detectCardGameType } from '../../utils/page-detector'
import { setDragData } from '../../utils/drag-data'
import { usePracticeDragState } from '../../composables/practice/usePracticeDragState'
import { usePracticeActions, type ActionButton } from '../../composables/practice/usePracticeActions'
import { createDeckCardComparator, buildRecipeSortOptions, type DisplayCard } from '../../composables/deck/useDeckCardSorter'
import CardList from '../CardList.vue'
import {
  mdiClose,
} from '@mdi/js'

const emit = defineEmits<{
  action: [action: string, cardId: string]
  dragstart: [card: PracticeCard, event: DragEvent]
}>()

const practiceStore = usePracticeStore()
const deckEditStore = useDeckEditStore()
const settingsStore = useSettingsStore()
const { startDrag, endDrag } = usePracticeDragState()
const { executeAction, getAvailableActions } = usePracticeActions()

const zone = computed(() => practiceStore.selectedZone)
const slotIndex = computed(() => practiceStore.selectedSlotIndex)
const fieldIndex = computed(() => practiceStore.selectedFieldIndex)

const cards = computed(() => {
  if (!zone.value) return []
  return practiceStore.getCards(zone.value, slotIndex.value, fieldIndex.value)
})

const ZONE_LABELS: Record<ZoneType, string> = {
  field: 'Field Spell',
  monster: 'Monster',
  spellTrap: 'Spell/Trap',
  extraMonster: 'Extra Monster',
  gy: 'Graveyard',
  banish: 'Banished',
  deck: 'Deck',
  extra: 'Extra Deck',
  hand: 'Hand',
  temp: 'Temp',
}

const zoneLabel = computed(() => zone.value ? (ZONE_LABELS[zone.value] ?? zone.value) : '')

const isDeckZone = computed(() => zone.value === 'deck' || zone.value === 'extra')

const recipeComparator = computed(() => {
  if (!isDeckZone.value || (!deckSortMode.value.startsWith('recipe') && !deckSortMode.value.startsWith('fa-br'))) return null
  const displayCards: DisplayCard[] = cards.value.map(c => ({
    cid: c.cardId,
    ciid: Number(c.ciid),
    uuid: c.instanceId ?? '',
  }))
  return createDeckCardComparator(displayCards, buildRecipeSortOptions({
    enableCategoryPriority: settingsStore.appSettings.enableCategoryPriority,
    categoryMatchedCardIds: deckEditStore.categoryMatchedCardIds,
    enableHeadPlacement: settingsStore.appSettings.enableHeadPlacement,
    headPlacementCardIds: deckEditStore.headPlacementCardIds,
    enableTailPlacement: settingsStore.appSettings.enableTailPlacement,
    tailPlacementCardIds: settingsStore.tailPlacementCardIds,
  }))
})

const deckSortMode = ref<string>('fa-br_asc')

const sortedCards = computed(() => {
  if (!isDeckZone.value) return cards.value
  if (deckSortMode.value.startsWith('actual')) return cards.value
  if (deckSortMode.value.startsWith('fa-br')) {
    // FA+BR: face-up cards keep actual order, face-down cards sorted by recipe
    const faceUp = cards.value.filter(c => c.face === 'up')
    const faceDown = cards.value.filter(c => c.face !== 'up')
    if (!recipeComparator.value || faceDown.length === 0) return cards.value
    const sortedFaceDown = [...faceDown].sort((a, b) =>
      recipeComparator.value!(
        { cid: a.cardId, ciid: Number(a.ciid), uuid: a.instanceId ?? '' },
        { cid: b.cardId, ciid: Number(b.ciid), uuid: b.instanceId ?? '' },
      )
    )
    return [...faceUp, ...sortedFaceDown]
  }
  if (recipeComparator.value) {
    return [...cards.value].sort((a, b) =>
      recipeComparator.value!(
        { cid: a.cardId, ciid: Number(a.ciid), uuid: a.instanceId ?? '' },
        { cid: b.cardId, ciid: Number(b.ciid), uuid: b.instanceId ?? '' },
      )
    )
  }
  return cards.value
})

const cardListSortOrder = computed(() => {
  if (!isDeckZone.value) return 'actual_asc'
  return deckSortMode.value
})

function handleSortChange(sortOrder: string) {
  deckSortMode.value = sortOrder
}

// UUID (CardList generates as `{cardId}-{ciid}-{index}` with code_asc sort = input order)
// → PracticeCard mapping
const practiceCardByUuid = computed(() => {
  const map = new Map<string, PracticeCard>()
  const indexCount = new Map<string, number>()
  for (const card of cards.value) {
    const baseKey = `${card.cardId}-${card.ciid || '0'}`
    const idx = indexCount.get(baseKey) ?? 0
    map.set(`${baseKey}-${idx}`, card)
    indexCount.set(baseKey, idx + 1)
  }
  return map
})

const selectedPracticeCard = ref<PracticeCard | null>(null)

watch([zone, slotIndex, () => cards.value.length], () => {
  selectedPracticeCard.value = null
})

function handleCardClick(event: MouseEvent) {
  const deckCardEl = (event.target as Element).closest('.deck-card')
  if (!deckCardEl) return
  const uuid = deckCardEl.getAttribute('data-uuid')
  if (!uuid) return
  const practiceCard = practiceCardByUuid.value.get(uuid)
  if (!practiceCard) return
  selectedPracticeCard.value = practiceCard
}

function handleAction(actionKey: string) {
  if (!selectedPracticeCard.value) return
  emit('action', actionKey, selectedPracticeCard.value.instanceId)
  selectedPracticeCard.value = null
}

function getCardActions(card: PracticeCard): (ActionButton | null)[] {
  const zoneValue = zone.value
  if (!zoneValue) return Array(6).fill(null)
  return getAvailableActions(zoneValue, card)
}

function handlePracticeDragStart(event: DragEvent, uuid: string, offset: { x: number; y: number }) {
  const card = practiceCardByUuid.value.get(uuid)
  if (!card || !event.dataTransfer) return

  const emptyImg = new Image()
  emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
  event.dataTransfer.setDragImage(emptyImg, 0, 0)
  event.dataTransfer.effectAllowed = 'move'

  setDragData(event, { cardId: card.instanceId, zone: zone.value, slotIndex: slotIndex.value })

  const backUrl = chrome.runtime.getURL('images/card_back.png')
  const imageUrl = getCardImageUrl(card, detectCardGameType(), card.ciid) ?? backUrl

  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const cardSize = { width: rect.width, height: rect.height }
  startDrag(card.instanceId!, card.orientation!, imageUrl, offset, cardSize)
  emit('dragstart', card, event)
}

function handlePracticeDragEnd() {
  endDrag()
}

function handlePracticeAction(action: string, uuid: string) {
  const card = practiceCardByUuid.value.get(uuid)
  if (!card) return
  if (action === 'moveToHand') {
    practiceStore.moveCard(card.instanceId!, 'hand', undefined, { face: 'up' }, fieldIndex.value)
  } else if (action === 'moveToDeckBottom') {
    practiceStore.moveCard(card.instanceId!, 'deck', undefined, { position: 'bottom', face: 'up' }, fieldIndex.value)
  }
}
</script>

<style scoped lang="scss">
.practice-zone-info-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.zone-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
  flex-shrink: 0;
}

.zone-count {
  font-size: 11px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  background: var(--bg-tertiary, rgba(255, 255, 255, 0.08));
  padding: 1px 6px;
  border-radius: 8px;
}

.selected-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 4px 6px;
  background: var(--bg-secondary, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 4px;
  flex-shrink: 0;
}

.practice-action-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 3px;
  background: var(--bg-tertiary, rgba(255, 255, 255, 0.08));
  color: var(--text-primary, #e0e0e0);
  font-size: 10px;
  cursor: pointer;

  &:hover {
    background: rgba(25, 118, 210, 0.3);
    border-color: var(--color-primary, #1976d2);
  }

  svg {
    flex-shrink: 0;
  }
}

.action-label {
  white-space: nowrap;
}

.deselect-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 3px;
  background: transparent;
  color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  cursor: pointer;

  &:hover {
    background: rgba(220, 80, 80, 0.2);
    border-color: rgba(220, 80, 80, 0.4);
    color: #ef9a9a;
  }
}

.card-list-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.no-selection {
  text-align: center;
  padding: 24px 12px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.4));
  font-size: 12px;
}
</style>
