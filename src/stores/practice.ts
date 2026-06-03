import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DeckCardRef } from '../types/card'
import type { CardListCard } from '../types/card-list'
import { fisherYatesShuffle } from '../utils/array-shuffle'
import { getUnifiedCacheDB } from '../utils/unified-cache-db'
import { useDeckUndoRedo, type Command } from '../composables/deck/useDeckUndoRedo'

// --- Types ---

export type CardFace = 'up' | 'down'
export type CardOrientation = 'vertical' | 'horizontal'

export type PracticeCard = CardListCard

export interface TempRecipeCard {
  cid: string
  ciid: string
  section: 'main' | 'extra'
}

export type ZoneType =
  | 'field'
  | 'monster'
  | 'spellTrap'
  | 'gy'
  | 'banish'
  | 'deck'
  | 'extra'
  | 'extraMonster'
  | 'hand'
  | 'temp'

export interface PracticeZones {
  field: PracticeCard[]
  monster: PracticeCard[][]
  spellTrap: PracticeCard[][]
  extraMonster: PracticeCard[][]
  gy: PracticeCard[]
  banish: PracticeCard[]
  deck: PracticeCard[]
  extra: PracticeCard[]
  hand: PracticeCard[]
  temp: PracticeCard[]
}

export interface CardLocation {
  zone: ZoneType
  slotIndex?: number
  cardIndex: number
  fieldIndex: number
}

export interface MoveOptions {
  face?: CardFace
  orientation?: CardOrientation
  position?: 'top' | 'bottom' | number
}

const STORAGE_KEY = 'ygoNext:practice'

// --- Helpers ---

function createCard(cid: string, ciid: string, face: CardFace = 'up'): CardListCard {
  const db = getUnifiedCacheDB()
  const info = db.getCardInfo(cid)
  const instanceId = crypto.randomUUID()

  if (!info) {
    return {
      cardId: cid,
      name: '',
      ciid,
      lang: 'ja',
      imgs: [],
      cardType: 'unknown',
      empty: false,
      instanceId,
      face,
      orientation: 'vertical',
    }
  }

  const base: CardListCard = {
    cardId: cid,
    name: info.name,
    ciid,
    lang: info.lang,
    imgs: info.imgs ?? [],
    cardType: info.cardType,
    limitRegulation: info.limitRegulation,
    text: info.text,
    pendulumText: info.pendulumText,
    empty: false,
    instanceId,
    face,
    orientation: 'vertical',
  }

  if (info.cardType === 'monster') {
    base.atk = info.atk
    base.def = info.def
    base.levelType = info.levelType
    base.levelValue = info.levelValue
    base.attribute = info.attribute
    base.race = info.race
    base.types = info.types
    base.isExtraDeck = info.isExtraDeck
  } else if (info.cardType === 'spell' || info.cardType === 'trap') {
    base.effectType = info.effectType
  }

  return base
}

function emptyZones(): PracticeZones {
  return {
    field: [],
    monster: [[], [], [], [], []],
    spellTrap: [[], [], [], [], []],
    extraMonster: [[], []],
    gy: [],
    banish: [],
    deck: [],
    extra: [],
    hand: [],
    temp: [],
  }
}

function cloneZones(z: PracticeZones): PracticeZones {
  return {
    field: z.field.map(c => ({ ...c })),
    monster: z.monster.map(slot => slot.map(c => ({ ...c }))),
    spellTrap: z.spellTrap.map(slot => slot.map(c => ({ ...c }))),
    extraMonster: z.extraMonster.map(slot => slot.map(c => ({ ...c }))),
    gy: z.gy.map(c => ({ ...c })),
    banish: z.banish.map(c => ({ ...c })),
    deck: z.deck.map(c => ({ ...c })),
    extra: z.extra.map(c => ({ ...c })),
    hand: z.hand.map(c => ({ ...c })),
    temp: z.temp.map(c => ({ ...c })),
  }
}

interface DualFieldSnapshot {
  zones1: PracticeZones
  zones2: PracticeZones
}

function captureSnapshot(z1: PracticeZones, z2: PracticeZones): DualFieldSnapshot {
  return { zones1: cloneZones(z1), zones2: cloneZones(z2) }
}

function restoreSnapshot(snapshot: DualFieldSnapshot, target1: { value: PracticeZones }, target2: { value: PracticeZones }) {
  target1.value = cloneZones(snapshot.zones1)
  target2.value = cloneZones(snapshot.zones2)
}

// --- Store ---

export const usePracticeStore = defineStore('practice', () => {
  // Field 1
  const zones = ref<PracticeZones>(emptyZones())
  const revealDeck = ref(false)
  const revealExtra = ref(false)
  const initialized = ref(false)
  const originalMainDeck = ref<DeckCardRef[]>([])
  const originalExtraDeck = ref<DeckCardRef[]>([])

  // Field 2
  const zones2 = ref<PracticeZones>(emptyZones())
  const revealDeck2 = ref(false)
  const revealExtra2 = ref(false)
  const initialized2 = ref(false)
  const originalMainDeck2 = ref<DeckCardRef[]>([])
  const originalExtraDeck2 = ref<DeckCardRef[]>([])
  const p2DeckDno = ref<number | null>(null)
  const p2DeckName = ref<string>('')

  // Temporary recipe: cards added from outside the original deck during practice
  const tempRecipe = ref<TempRecipeCard[]>([])
  const tempRecipe2 = ref<TempRecipeCard[]>([])

  // Mode（P2にデッキがロードされているか）
  const twoDeckMode = computed(() => p2DeckDno.value !== null)

  // Practice mode active state
  const isActive = ref(false)

  // Zone selection (for zone info panel in practice tab)
  const selectedZone = ref<ZoneType | null>(null)
  const selectedSlotIndex = ref<number | undefined>(undefined)
  const selectedFieldIndex = ref<number>(0)

  function selectZone(zone: ZoneType, slotIndex?: number, fieldIndex: number = 0) {
    selectedZone.value = zone
    selectedSlotIndex.value = slotIndex
    selectedFieldIndex.value = fieldIndex
  }

  const {
    commandHistory,
    commandIndex,
    canUndo,
    canRedo,
    pushCommand,
    undo: undoCommand,
    redo: redoCommand,
    clearHistory,
    getUndoDescription,
    getRedoDescription,
  } = useDeckUndoRedo()

  // --- Internal helpers ---

  function getZonesRef(fieldIndex: number): { value: PracticeZones } {
    return fieldIndex === 1 ? zones2 : zones
  }

  function getRevealDeckRef(fieldIndex: number): { value: boolean } {
    return fieldIndex === 1 ? revealDeck2 : revealDeck
  }

  function getRevealExtraRef(fieldIndex: number): { value: boolean } {
    return fieldIndex === 1 ? revealExtra2 : revealExtra
  }

  function getOriginalMainDeck(fieldIndex: number): DeckCardRef[] {
    return fieldIndex === 1 ? originalMainDeck2.value : originalMainDeck.value
  }

  function getTempRecipeRef(fieldIndex: number): { value: TempRecipeCard[] } {
    return fieldIndex === 1 ? tempRecipe2 : tempRecipe
  }

  function getOriginalExtraDeck(fieldIndex: number): DeckCardRef[] {
    return fieldIndex === 1 ? originalExtraDeck2.value : originalExtraDeck.value
  }

  function getCards(zone: ZoneType, slotIndex?: number, fieldIndex: number = 0): PracticeCard[] {
    const z = getZonesRef(fieldIndex).value
    if (zone === 'monster') {
      const idx = slotIndex ?? 0
      if (idx < 0 || idx >= 5) return []
      return z.monster[idx]!
    }
    if (zone === 'spellTrap') {
      const idx = slotIndex ?? 0
      if (idx < 0 || idx >= 5) return []
      return z.spellTrap[idx]!
    }
    if (zone === 'extraMonster') {
      const idx = slotIndex ?? 0
      if (idx < 0 || idx >= 2) return []
      return z.extraMonster[idx]!
    }
    return z[zone] as PracticeCard[]
  }

  function findCard(cardId: string, fieldIndex: number = 0): CardLocation | null {
    const z = getZonesRef(fieldIndex).value
    const simpleZones: ZoneType[] = ['field', 'gy', 'banish', 'deck', 'extra', 'hand', 'temp']
    for (const zone of simpleZones) {
      const cards = z[zone] as PracticeCard[]
      const idx = cards.findIndex(c => c.instanceId === cardId)
      if (idx !== -1) return { zone, cardIndex: idx, fieldIndex }
    }
    for (let i = 0; i < 5; i++) {
      const idx = z.monster[i]!.findIndex(c => c.instanceId === cardId)
      if (idx !== -1) return { zone: 'monster', slotIndex: i, cardIndex: idx, fieldIndex }
    }
    for (let i = 0; i < 5; i++) {
      const idx = z.spellTrap[i]!.findIndex(c => c.instanceId === cardId)
      if (idx !== -1) return { zone: 'spellTrap', slotIndex: i, cardIndex: idx, fieldIndex }
    }
    for (let i = 0; i < 2; i++) {
      const idx = z.extraMonster[i]!.findIndex(c => c.instanceId === cardId)
      if (idx !== -1) return { zone: 'extraMonster', slotIndex: i, cardIndex: idx, fieldIndex }
    }
    return null
  }

  // Find card across both fields
  function findCardGlobal(cardId: string): CardLocation | null {
    return findCard(cardId, 0) ?? findCard(cardId, 1)
  }

  function pushSnapshotCommand(before: DualFieldSnapshot, after: DualFieldSnapshot, description: string, type: Command['type']) {
    const command: Command = {
      execute: () => restoreSnapshot(after, zones, zones2),
      undo: () => restoreSnapshot(before, zones, zones2),
      description,
      type,
    }
    pushCommand(command)
  }

  // --- Computed (field 1) ---

  const deckCount = computed(() => zones.value.deck.length)
  const extraCount = computed(() => zones.value.extra.length)
  const handCount = computed(() => zones.value.hand.length)
  const gyCount = computed(() => zones.value.gy.length)
  const banishCount = computed(() => zones.value.banish.length)
  const tempCount = computed(() => zones.value.temp.length)

  // --- Computed (field 2) ---

  const deckCount2 = computed(() => zones2.value.deck.length)
  const extraCount2 = computed(() => zones2.value.extra.length)
  const handCount2 = computed(() => zones2.value.hand.length)
  const gyCount2 = computed(() => zones2.value.gy.length)
  const banishCount2 = computed(() => zones2.value.banish.length)
  const tempCount2 = computed(() => zones2.value.temp.length)

  const hasTempRecipe = computed(() => tempRecipe.value.length > 0 || tempRecipe2.value.length > 0)

  // --- Generic computed by fieldIndex ---

  function getDeckCount(fieldIndex: number): number {
    return fieldIndex === 1 ? deckCount2.value : deckCount.value
  }

  // --- Actions ---

  function initPractice(mainDeck: DeckCardRef[], extraDeck: DeckCardRef[], fieldIndex: number = 0) {
    clearHistory()

    const z = getZonesRef(fieldIndex)
    const origMain = fieldIndex === 1 ? originalMainDeck2 : originalMainDeck
    const origExtra = fieldIndex === 1 ? originalExtraDeck2 : originalExtraDeck
    const initFlag = fieldIndex === 1 ? initialized2 : initialized

    z.value = emptyZones()
    getRevealDeckRef(fieldIndex).value = false
    getRevealExtraRef(fieldIndex).value = false
    getTempRecipeRef(fieldIndex).value = []

    origMain.value = mainDeck.map(d => ({ ...d }))
    origExtra.value = extraDeck.map(d => ({ ...d }))

    for (const ref of mainDeck) {
      for (let i = 0; i < ref.quantity; i++) {
        z.value.deck.push(createCard(ref.cid, ref.ciid, 'down'))
      }
    }

    for (const ref of extraDeck) {
      for (let i = 0; i < ref.quantity; i++) {
        z.value.extra.push(createCard(ref.cid, ref.ciid, 'down'))
      }
    }

    z.value.deck = fisherYatesShuffle(z.value.deck)

    for (let i = 0; i < 5 && z.value.deck.length > 0; i++) {
      const card = z.value.deck.shift()!
      card.face = 'up'
      z.value.hand.push(card)
    }

    initFlag.value = true
    saveToLocalStorage()
  }

  function resetPractice(fieldIndex: number = 0) {
    const z = getZonesRef(fieldIndex)
    const initFlag = fieldIndex === 1 ? initialized2 : initialized
    if (!initFlag.value) return

    const before = captureSnapshot(zones.value, zones2.value)
    const origMain = getOriginalMainDeck(fieldIndex)
    const origExtra = getOriginalExtraDeck(fieldIndex)

    z.value = emptyZones()
    getRevealDeckRef(fieldIndex).value = false
    getRevealExtraRef(fieldIndex).value = false

    for (const ref of origMain) {
      for (let i = 0; i < ref.quantity; i++) {
        z.value.deck.push(createCard(ref.cid, ref.ciid, 'down'))
      }
    }

    for (const ref of origExtra) {
      for (let i = 0; i < ref.quantity; i++) {
        z.value.extra.push(createCard(ref.cid, ref.ciid, 'down'))
      }
    }

    for (const tc of getTempRecipeRef(fieldIndex).value) {
      if (tc.section === 'extra') {
        z.value.extra.push(createCard(tc.cid, tc.ciid, 'down'))
      } else {
        z.value.deck.push(createCard(tc.cid, tc.ciid, 'down'))
      }
    }

    z.value.deck = fisherYatesShuffle(z.value.deck)

    for (let i = 0; i < 5 && z.value.deck.length > 0; i++) {
      const card = z.value.deck.shift()!
      card.face = 'up'
      z.value.hand.push(card)
    }

    const after = captureSnapshot(zones.value, zones2.value)
    pushSnapshotCommand(before, after, 'リセット', 'reorder')
    saveToLocalStorage()
  }

  function draw(fieldIndex: number = 0) {
    const z = getZonesRef(fieldIndex)
    if (z.value.deck.length === 0) return

    const before = captureSnapshot(zones.value, zones2.value)
    const card = z.value.deck.shift()!
    card.face = 'up'
    z.value.hand.push(card)
    const after = captureSnapshot(zones.value, zones2.value)

    pushSnapshotCommand(before, after, 'ドロー', 'move')
    saveToLocalStorage()
  }

  function drawToZone(zone: ZoneType, slotIndex?: number, fieldIndex: number = 0) {
    const z = getZonesRef(fieldIndex)
    if (z.value.deck.length === 0) return

    const before = captureSnapshot(zones.value, zones2.value)
    const card = z.value.deck.shift()!
    card.face = 'up'
    const target = getCards(zone, slotIndex, fieldIndex)
    if (target) {
      target.unshift(card)
    }
    const after = captureSnapshot(zones.value, zones2.value)

    pushSnapshotCommand(before, after, `ドロー -> ${zone}`, 'move')
    saveToLocalStorage()
  }

  function drawMultiple(count: number, fieldIndex: number = 0) {
    const z = getZonesRef(fieldIndex)
    if (z.value.deck.length === 0) return

    const before = captureSnapshot(zones.value, zones2.value)
    const actual = Math.min(count, z.value.deck.length)
    for (let i = 0; i < actual; i++) {
      const card = z.value.deck.shift()!
      card.face = 'up'
      z.value.hand.push(card)
    }
    const after = captureSnapshot(zones.value, zones2.value)

    pushSnapshotCommand(before, after, `${actual}枚ドロー`, 'move')
    saveToLocalStorage()
  }

  function moveCard(cardId: string, toZone: ZoneType, toSlotIndex?: number, options?: MoveOptions, fieldIndex: number = 0) {
    const loc = findCard(cardId, fieldIndex)
    if (!loc) return

    const before = captureSnapshot(zones.value, zones2.value)

    const cards = getCards(loc.zone, loc.slotIndex, fieldIndex)
    if (!cards || loc.cardIndex < 0 || loc.cardIndex >= cards.length) return
    const card = cards.splice(loc.cardIndex, 1)[0]!

    if (options?.face !== undefined) card.face = options.face
    if (options?.orientation !== undefined) card.orientation = options.orientation

    const target = getCards(toZone, toSlotIndex, fieldIndex)
    if (!target) return

    const pos = options?.position ?? 'top'
    if (pos === 'top') {
      target.unshift(card)
    } else if (pos === 'bottom') {
      target.push(card)
    } else {
      const idx = Math.max(0, Math.min(pos, target.length))
      target.splice(idx, 0, card)
    }

    const after = captureSnapshot(zones.value, zones2.value)
    pushSnapshotCommand(before, after, `移動 -> ${toZone}`, 'move')
    saveToLocalStorage()
  }

  function shuffleDeck(fieldIndex: number = 0) {
    const z = getZonesRef(fieldIndex)
    if (z.value.deck.length <= 1) return

    const before = captureSnapshot(zones.value, zones2.value)
    z.value.deck = fisherYatesShuffle(z.value.deck)
    const after = captureSnapshot(zones.value, zones2.value)

    pushSnapshotCommand(before, after, 'デッキシャッフル', 'reorder')
    saveToLocalStorage()
  }

  function moveCardToDeckAndShuffle(cardId: string, fieldIndex: number = 0) {
    const loc = findCard(cardId, fieldIndex)
    if (!loc) return

    const before = captureSnapshot(zones.value, zones2.value)

    const cards = getCards(loc.zone, loc.slotIndex, fieldIndex)
    if (!cards || loc.cardIndex < 0 || loc.cardIndex >= cards.length) return
    const card = cards.splice(loc.cardIndex, 1)[0]!
    card.face = 'down'
    card.orientation = 'vertical'

    const z = getZonesRef(fieldIndex)
    z.value.deck.push(card)
    z.value.deck = fisherYatesShuffle(z.value.deck)
    z.value.deck.forEach(c => { c.face = 'down' })

    const after = captureSnapshot(zones.value, zones2.value)
    pushSnapshotCommand(before, after, 'デッキにシャッフル挿入', 'move')
    saveToLocalStorage()
  }

  function shuffleHand(fieldIndex: number = 0) {
    const z = getZonesRef(fieldIndex)
    if (z.value.hand.length <= 1) return

    const before = captureSnapshot(zones.value, zones2.value)
    z.value.hand = fisherYatesShuffle(z.value.hand)
    const after = captureSnapshot(zones.value, zones2.value)

    pushSnapshotCommand(before, after, '手札シャッフル', 'reorder')
    saveToLocalStorage()
  }

  function shuffleExtra(fieldIndex: number = 0) {
    const z = getZonesRef(fieldIndex)
    if (z.value.extra.length <= 1) return

    const before = captureSnapshot(zones.value, zones2.value)
    z.value.extra = fisherYatesShuffle(z.value.extra)
    const after = captureSnapshot(zones.value, zones2.value)

    pushSnapshotCommand(before, after, 'EXシャッフル', 'reorder')
    saveToLocalStorage()
  }

  function setCardFace(cardId: string, face: CardFace, fieldIndex: number = 0) {
    const loc = findCard(cardId, fieldIndex)
    if (!loc) return

    const cards = getCards(loc.zone, loc.slotIndex, fieldIndex)
    if (!cards) return
    const card = cards[loc.cardIndex]
    if (!card || card.face === face) return

    const before = captureSnapshot(zones.value, zones2.value)
    card.face = face
    const after = captureSnapshot(zones.value, zones2.value)

    pushSnapshotCommand(before, after, '表裏切替', 'reorder')
    saveToLocalStorage()
  }

  function setCardOrientation(cardId: string, orientation: CardOrientation, fieldIndex: number = 0) {
    const loc = findCard(cardId, fieldIndex)
    if (!loc) return

    const cards = getCards(loc.zone, loc.slotIndex, fieldIndex)
    if (!cards) return
    const card = cards[loc.cardIndex]
    if (!card || card.orientation === orientation) return

    const before = captureSnapshot(zones.value, zones2.value)
    card.orientation = orientation
    const after = captureSnapshot(zones.value, zones2.value)

    pushSnapshotCommand(before, after, '縦横切替', 'reorder')
    saveToLocalStorage()
  }

  function reorderInZone(zone: ZoneType, slotIndex: number | undefined, fromIndex: number, toIndex: number, fieldIndex: number = 0) {
    const cards = getCards(zone, slotIndex, fieldIndex)
    if (!cards || fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= cards.length) return
    if (toIndex < 0 || toIndex >= cards.length) return

    const before = captureSnapshot(zones.value, zones2.value)
    const moved = cards.splice(fromIndex, 1)[0]
    if (!moved) return
    cards.splice(toIndex, 0, moved)
    const after = captureSnapshot(zones.value, zones2.value)

    pushSnapshotCommand(before, after, '並び替え', 'reorder')
    saveToLocalStorage()
  }

  function addExternalCard(cid: string, ciid: string, zone: ZoneType, slotIndex: number | undefined, fieldIndex: number = 0, face: CardFace = 'up', position: 'top' | 'bottom' | number = 'bottom') {
    const before = captureSnapshot(zones.value, zones2.value)
    const card = createCard(cid, ciid, face)
    const target = getCards(zone, slotIndex, fieldIndex)
    if (target) {
      if (position === 'top') {
        target.unshift(card)
      } else if (position === 'bottom') {
        target.push(card)
      } else {
        const idx = Math.max(0, Math.min(position, target.length))
        target.splice(idx, 0, card)
      }
    }
    const after = captureSnapshot(zones.value, zones2.value)
    pushSnapshotCommand(before, after, `外部カード追加 -> ${zone}`, 'move')

    const recipe = getTempRecipeRef(fieldIndex)
    const section: TempRecipeCard['section'] = zone === 'extra' ? 'extra' : 'main'
    recipe.value.push({ cid, ciid, section })

    saveToLocalStorage()
  }

  function revealDeckContents(show: boolean, fieldIndex: number = 0) {
    getRevealDeckRef(fieldIndex).value = show
  }

  function revealExtraContents(show: boolean, fieldIndex: number = 0) {
    getRevealExtraRef(fieldIndex).value = show
  }

  // --- Persistence ---

  function stripCards(cards: CardListCard[]): Array<{ instanceId: string; cardId: string; ciid: string; face: CardFace; orientation: CardOrientation }> {
    return cards.map(c => ({
      instanceId: c.instanceId ?? '',
      cardId: c.cardId,
      ciid: c.ciid,
      face: c.face ?? 'up',
      orientation: c.orientation ?? 'vertical',
    }))
  }

  function stripZones(z: PracticeZones) {
    return {
      field: stripCards(z.field),
      monster: z.monster.map(s => stripCards(s)),
      spellTrap: z.spellTrap.map(s => stripCards(s)),
      extraMonster: z.extraMonster.map(s => stripCards(s)),
      gy: stripCards(z.gy),
      banish: stripCards(z.banish),
      deck: stripCards(z.deck),
      extra: stripCards(z.extra),
      hand: stripCards(z.hand),
      temp: stripCards(z.temp),
    }
  }

  function rehydrateCard(raw: Record<string, unknown>): CardListCard {
    const instanceId = (raw.instanceId ?? raw.id ?? '') as string
    const cardId = (raw.cardId ?? raw.cid ?? '') as string
    const ciid = (raw.ciid ?? '') as string
    const face = (raw.face ?? 'up') as CardFace
    const orientation = (raw.orientation ?? 'vertical') as CardOrientation

    const db = getUnifiedCacheDB()
    const info = db.getCardInfo(cardId)

    if (!info) {
      return { cardId, name: '', ciid, lang: 'ja', imgs: [], cardType: 'unknown', empty: false, instanceId, face, orientation }
    }

    const base: CardListCard = {
      cardId,
      name: info.name,
      ciid,
      lang: info.lang,
      imgs: info.imgs ?? [],
      cardType: info.cardType,
      limitRegulation: info.limitRegulation,
      text: info.text,
      pendulumText: info.pendulumText,
      empty: false,
      instanceId,
      face,
      orientation,
    }

    if (info.cardType === 'monster') {
      base.atk = info.atk
      base.def = info.def
      base.levelType = info.levelType
      base.levelValue = info.levelValue
      base.attribute = info.attribute
      base.race = info.race
      base.types = info.types
      base.isExtraDeck = info.isExtraDeck
    } else if (info.cardType === 'spell' || info.cardType === 'trap') {
      base.effectType = info.effectType
    }

    return base
  }

  function rehydrateZone(raw: unknown[]): CardListCard[] {
    return (raw as Record<string, unknown>[]).map(rehydrateCard)
  }

  function rehydrateZones(raw: Record<string, unknown>): PracticeZones {
    return {
      field: rehydrateZone((raw.field ?? []) as unknown[]),
      monster: ((raw.monster ?? []) as unknown[][]).map(rehydrateZone),
      spellTrap: ((raw.spellTrap ?? []) as unknown[][]).map(rehydrateZone),
      extraMonster: ((raw.extraMonster ?? []) as unknown[][]).map(rehydrateZone),
      gy: rehydrateZone((raw.gy ?? []) as unknown[]),
      banish: rehydrateZone((raw.banish ?? []) as unknown[]),
      deck: rehydrateZone((raw.deck ?? []) as unknown[]),
      extra: rehydrateZone((raw.extra ?? []) as unknown[]),
      hand: rehydrateZone((raw.hand ?? []) as unknown[]),
      temp: rehydrateZone((raw.temp ?? []) as unknown[]),
    }
  }

  function saveToLocalStorage() {
    try {
      const data = {
        zones: stripZones(zones.value),
        revealDeck: revealDeck.value,
        revealExtra: revealExtra.value,
        originalMainDeck: originalMainDeck.value,
        originalExtraDeck: originalExtraDeck.value,
        tempRecipe: tempRecipe.value,
        initialized2: initialized2.value,
        zones2: stripZones(zones2.value),
        revealDeck2: revealDeck2.value,
        revealExtra2: revealExtra2.value,
        originalMainDeck2: originalMainDeck2.value,
        originalExtraDeck2: originalExtraDeck2.value,
        tempRecipe2: tempRecipe2.value,
        p2DeckDno: p2DeckDno.value,
        p2DeckName: p2DeckName.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('[practice] Failed to save to localStorage:', e)
    }
  }

  function loadFromLocalStorage(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false

      const data = JSON.parse(raw)
      if (!data.zones) return false

      zones.value = rehydrateZones(data.zones as Record<string, unknown>)
      revealDeck.value = data.revealDeck ?? false
      revealExtra.value = data.revealExtra ?? false
      originalMainDeck.value = data.originalMainDeck ?? []
      originalExtraDeck.value = data.originalExtraDeck ?? []
      tempRecipe.value = data.tempRecipe ?? []
      initialized.value = true

      if (data.initialized2 || data.twoDeckMode) {
        zones2.value = data.zones2 ? rehydrateZones(data.zones2 as Record<string, unknown>) : emptyZones()
        revealDeck2.value = data.revealDeck2 ?? false
        revealExtra2.value = data.revealExtra2 ?? false
        originalMainDeck2.value = data.originalMainDeck2 ?? []
        originalExtraDeck2.value = data.originalExtraDeck2 ?? []
        tempRecipe2.value = data.tempRecipe2 ?? []
        initialized2.value = !!(data.zones2)
        p2DeckDno.value = data.p2DeckDno ?? null
        p2DeckName.value = data.p2DeckName ?? ''
      }

      return true
    } catch (e) {
      console.error('[practice] Failed to load from localStorage:', e)
      return false
    }
  }

  function clearField2() {
    zones2.value = emptyZones()
    initialized2.value = false
    originalMainDeck2.value = []
    originalExtraDeck2.value = []
    revealDeck2.value = false
    p2DeckDno.value = null
    p2DeckName.value = ''
  }

  function clearLocalStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('[practice] Failed to clear localStorage:', e)
    }
  }

  // --- Undo/Redo wrappers ---

  function undo() {
    undoCommand()
    saveToLocalStorage()
  }

  function redo() {
    redoCommand()
    saveToLocalStorage()
  }

  return {
    // State (field 1)
    zones,
    revealDeck,
    revealExtra,
    initialized,
    originalMainDeck,
    originalExtraDeck,

    // State (field 2)
    zones2,
    revealDeck2,
    revealExtra2,
    initialized2,
    originalMainDeck2,
    originalExtraDeck2,
    p2DeckDno,
    p2DeckName,

    // Temp recipe
    tempRecipe,
    tempRecipe2,
    hasTempRecipe,

    // Mode
    twoDeckMode,
    isActive,

    // Zone selection
    selectedZone,
    selectedSlotIndex,
    selectedFieldIndex,
    selectZone,

    // Computed (field 1)
    deckCount,
    extraCount,
    handCount,
    gyCount,
    banishCount,
    tempCount,

    // Computed (field 2)
    deckCount2,
    extraCount2,
    handCount2,
    gyCount2,
    banishCount2,
    tempCount2,

    // Undo/Redo state
    commandHistory,
    commandIndex,
    canUndo,
    canRedo,

    // Actions
    initPractice,
    resetPractice,
    clearField2,
    draw,
    drawToZone,
    drawMultiple,
    moveCard,
    moveCardToDeckAndShuffle,
    shuffleDeck,
    shuffleHand,
    shuffleExtra,
    setCardFace,
    setCardOrientation,
    reorderInZone,
    addExternalCard,
    revealDeckContents,
    revealExtraContents,

    // Helpers
    getCards,
    findCard,
    findCardGlobal,
    getDeckCount,
    getZonesRef,

    // Persistence
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,

    // Undo/Redo
    undo,
    redo,
    clearHistory,
    getUndoDescription,
    getRedoDescription,
  }
})
