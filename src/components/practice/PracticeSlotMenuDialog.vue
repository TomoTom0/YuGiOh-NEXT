<template>
  <Teleport to="body">
    <div v-if="visible" class="ygo-next practice-slot-menu-overlay" @click.self="$emit('close')">
      <div class="practice-slot-menu">
        <div class="menu-header">
          <span class="menu-zone-label">{{ zoneLabel }}</span>
          <span class="menu-count">{{ cards.length }}枚</span>
          <button class="menu-close" @click="$emit('close')">x</button>
        </div>
        <div class="menu-toolbar">
          <div class="filter-group">
            <button
              v-for="f in filterOptions"
              :key="f.value"
              class="filter-btn"
              :class="{ active: filterType === f.value }"
              @click="filterType = f.value"
            >{{ f.label }}</button>
          </div>
          <input
            v-model="filterText"
            type="text"
            class="name-search"
            placeholder="Search..."
          >
          <select v-model="sortKey" class="sort-select">
            <option value="name">Name</option>
            <option value="type">Type</option>
          </select>
        </div>
        <div class="menu-card-grid">
          <PracticeCardComponent
            v-for="card in filteredCards"
            :key="card.id"
            :card="card"
            :zone="zone"
            :slot-index="slotIndex"
            :force-reveal="true"
            class="menu-grid-card"
            @action="(action, cardId) => $emit('action', action, cardId)"
            @dragstart="handleDragStart"
          />
          <div v-if="filteredCards.length === 0" class="no-cards">
            No cards
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PracticeCard, ZoneType } from '../../stores/practice'
import { getUnifiedCacheDB } from '../../utils/unified-cache-db'
import PracticeCardComponent from './PracticeCard.vue'

const props = withDefaults(defineProps<{
  visible: boolean
  cards: PracticeCard[]
  zone: ZoneType
  slotIndex?: number
}>(), {
  slotIndex: undefined,
})

const emit = defineEmits<{
  close: []
  action: [action: string, cardId: string]
  dragstart: [card: PracticeCard, event: DragEvent]
}>()

function handleDragStart(card: PracticeCard, event: DragEvent) {
  emit('dragstart', card, event)
  emit('close')
}

const ZONE_LABELS: Record<ZoneType, string> = {
  field: 'Field Spell',
  monster: 'Monster',
  spellTrap: 'Spell/Trap',
  gy: 'Graveyard',
  banish: 'Banished',
  deck: 'Deck',
  extra: 'Extra Deck',
  hand: 'Hand',
  temp: 'Temp',
}

const zoneLabel = computed(() => ZONE_LABELS[props.zone] ?? props.zone)

type CardTypeFilter = 'all' | 'monster' | 'spell' | 'trap'
const filterType = ref<CardTypeFilter>('all')
const filterText = ref('')
const sortKey = ref<'name' | 'type'>('name')

const filterOptions: { value: CardTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'monster', label: 'M' },
  { value: 'spell', label: 'S' },
  { value: 'trap', label: 'T' },
]

interface CardMeta {
  cardType: string
  name: string
}

const cardMetaMap = ref<Map<string, CardMeta>>(new Map())

function rebuildMetaMap() {
  const db = getUnifiedCacheDB()
  const map = new Map<string, CardMeta>()
  for (const card of props.cards) {
    if (map.has(card.cid)) continue
    const info = db.getCardInfo(card.cid)
    map.set(card.cid, {
      cardType: info?.cardType ?? 'unknown',
      name: info?.name ?? '',
    })
  }
  cardMetaMap.value = map
}

watch(() => [props.visible, props.cards.length] as const, ([vis]) => {
  if (vis) {
    filterType.value = 'all'
    filterText.value = ''
    sortKey.value = 'name'
    rebuildMetaMap()
  }
}, { immediate: true })

const TYPE_ORDER: Record<string, number> = { monster: 0, spell: 1, trap: 2, unknown: 3 }

const filteredCards = computed(() => {
  const list = [...props.cards]
  return list.filter(card => {
    const meta = cardMetaMap.value.get(card.cid)
    const ct = meta?.cardType ?? 'unknown'
    if (filterType.value !== 'all' && ct !== filterType.value) return false
    if (filterText.value) {
      const name = meta?.name ?? ''
      if (!name.toLowerCase().includes(filterText.value.toLowerCase())) return false
    }
    return true
  }).sort((a, b) => {
    const ma = cardMetaMap.value.get(a.cid)
    const mb = cardMetaMap.value.get(b.cid)
    if (sortKey.value === 'name') {
      return (ma?.name ?? '').localeCompare(mb?.name ?? '')
    }
    const ta = TYPE_ORDER[ma?.cardType ?? 'unknown'] ?? 99
    const tb = TYPE_ORDER[mb?.cardType ?? 'unknown'] ?? 99
    return ta - tb
  })
})
</script>

<style scoped lang="scss">
.practice-slot-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.practice-slot-menu {
  background: var(--bg-primary, #1a1a2e);
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 8px;
  padding: 12px;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  min-width: 300px;
}

.menu-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
}

.menu-zone-label {
  flex: 1;
}

.menu-count {
  font-size: 12px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.5));
}

.menu-close {
  background: none;
  border: none;
  color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;

  &:hover {
    color: var(--text-primary, #e0e0e0);
  }
}

.menu-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 2px;
}

.filter-btn {
  padding: 2px 6px;
  font-size: 11px;
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 3px;
  background: transparent;
  color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  cursor: pointer;

  &.active {
    background: var(--color-primary, #1976d2);
    border-color: var(--color-primary, #1976d2);
    color: #fff;
  }
}

.name-search {
  flex: 1;
  min-width: 80px;
  padding: 2px 6px;
  font-size: 11px;
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 3px;
  background: var(--bg-secondary, rgba(255, 255, 255, 0.05));
  color: var(--text-primary, #e0e0e0);
  outline: none;

  &::placeholder {
    color: var(--text-secondary, rgba(255, 255, 255, 0.3));
  }

  &:focus {
    border-color: var(--color-primary, #1976d2);
  }
}

.sort-select {
  padding: 2px 4px;
  font-size: 11px;
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 3px;
  background: var(--bg-secondary, rgba(255, 255, 255, 0.05));
  color: var(--text-primary, #e0e0e0);
  outline: none;
}

.menu-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 6px;
}

.menu-grid-card {
  width: 100% !important;
  height: auto !important;
  aspect-ratio: 75 / 110;
}

.no-cards {
  grid-column: 1 / -1;
  text-align: center;
  padding: 16px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.4));
  font-size: 12px;
}
</style>
