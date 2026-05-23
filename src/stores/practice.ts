import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DeckCardRef } from '../types/card'
import { fisherYatesShuffle } from '../utils/array-shuffle'
import { useDeckUndoRedo, type Command } from '../composables/deck/useDeckUndoRedo'

export type CardFace = 'up' | 'down'
export type CardOrientation = 'vertical' | 'horizontal'

export interface PracticeCard {
  id: string
  cid: string
  ciid: string
  face: CardFace
  orientation: CardOrientation
}

export type ZoneType =
  | 'field'
  | 'monster'
  | 'spellTrap'
  | 'gy'
  | 'banish'
  | 'deck'
  | 'extra'
  | 'hand'
  | 'temp'

export interface PracticeZones {
  field: PracticeCard[]
  monster: PracticeCard[][]
  spellTrap: PracticeCard[][]
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

function createCard(cid: string, ciid: string, face: CardFace = 'up'): PracticeCard {
  return {
    id: crypto.randomUUID(),
    cid,
    ciid,
    face,
    orientation: 'vertical',
  }
}

function emptyZones(): PracticeZones {
  return {
    field: [],
    monster: [[], [], [], [], []],
    spellTrap: [[], [], [], [], []],
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

export const usePracticeStore = defineStore('practice', () => {
  const zones = ref<PracticeZones>(emptyZones())
  const revealDeck = ref(false)
  const initialized = ref(false)
  const originalMainDeck = ref<DeckCardRef[]>([])
  const originalExtraDeck = ref<DeckCardRef[]>([])

  const zones2 = ref<PracticeZones>(emptyZones())
  const revealDeck2 = ref(false)
  const initialized2 = ref(false)
  const originalMainDeck2 = ref<DeckCardRef[]>([])
  const originalExtraDeck2 = ref<DeckCardRef[]>([])

  const twoDeckMode = ref(false)

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

  function getZonesRef(fieldIndex: number): { value: PracticeZones } {
    return fieldIndex === 1 ? zones2 : zones
  }

  function getRevealDeckRef(fieldIndex: number): { value: boolean } {
    return fieldIndex === 1 ? revealDeck2 : revealDeck
  }

  function getOriginalMainDeck(fieldIndex: number): DeckCardRef[] {
    return fieldIndex === 1 ? originalMainDeck2.value : originalMainDeck.value
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
    return z[zone] as PracticeCard[]
  }

  function findCard(cardId: string, fieldIndex: number = 0): CardLocation | null {
    const z = getZonesRef(fieldIndex).value
    const simpleZones: ZoneType[] = ['field', 'gy', 'banish', 'deck', 'extra', 'hand', 'temp']
    for (const zone of simpleZones) {
      const cards = z[zone] as PracticeCard[]
      const idx = cards.findIndex(c => c.id === cardId)
      if (idx !== -1) return { zone, cardIndex: idx, fieldIndex }
    }
    for (let i = 0; i < 5; i++) {
      const idx = z.monster[i]!.findIndex(c => c.id === cardId)
      if (idx !== -1) return { zone: 'monster', slotIndex: i, cardIndex: idx, fieldIndex }
    }
    for (let i = 0; i < 5; i++) {
      const idx = z.spellTrap[i]!.findIndex(c => c.id === cardId)
      if (idx !== -1) return { zone: 'spellTrap', slotIndex: i, cardIndex: idx, fieldIndex }
    }
    return null
  }

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

  const deckCount = computed(() => zones.value.deck.length)
  const extraCount = computed(() => zones.value.extra.length)
  const handCount = computed(() => zones.value.hand.length)
  const gyCount = computed(() => zones.value.gy.length)
  const banishCount = computed(() => zones.value.banish.length)
  const tempCount = computed(() => zones.value.temp.length)

  const deckCount2 = computed(() => zones2.value.deck.length)
  const extraCount2 = computed(() => zones2.value.extra.length)
  const handCount2 = computed(() => zones2.value.hand.length)
  const gyCount2 = computed(() => zones2.value.gy.length)
  const banishCount2 = computed(() => zones2.value.banish.length)
  const tempCount2 = computed(() => zones2.value.temp.length)

  function getDeckCount(fieldIndex: number): number {
    return fieldIndex === 1 ? deckCount2.value : deckCount.value
  }

  function initPractice(mainDeck: DeckCardRef[], extraDeck: DeckCardRef[], fieldIndex: number = 0) {
    clearHistory()

    const z = getZonesRef(fieldIndex)
    const origMain = fieldIndex === 1 ? originalMainDeck2 : originalMain
    const origExtra = fieldIndex === 1 ? originalExtraDeck2 : originalExtra
    const initFlag = fieldIndex === 1 ? initialized2 : initialized

    z.value = emptyZones()
    getRevealDeckRef(fieldIndex).value = false

    origMain.value = mainDeck.map(d => ({ ...d }))
    origExtra.value = extraDeck.map(d => ({ ...d }))

    for (const ref of mainDeck) {
      for (let i = 0; i < ref.quantity; i++) {
        z.value.deck.push(createCard(ref.cid, ref.ciid, 'down'))
      }
    }

    for (const ref of extraDeck) {
      for (let i = 0; i < ref.quantity; i++) {
        z.value.extra.push(createCard(ref.cid, ref.ciid, 'up'))
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

    for (const ref of origMain) {
      for (let i = 0; i < ref.quantity; i++) {
        z.value.deck.push(createCard(ref.cid, ref.ciid, 'down'))
      }
    }

    for (const ref of origExtra) {
      for (let i = 0; i < ref.quantity; i++) {
        z.value.extra.push(createCard(ref.cid, ref.ciid, 'up'))
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

  function revealDeckContents(show: boolean, fieldIndex: number = 0) {
    getRevealDeckRef(fieldIndex).value = show
  }

  function saveToLocalStorage() {
    try {
      const data = {
        zones: zones.value,
        revealDeck: revealDeck.value,
        originalMainDeck: originalMainDeck.value,
        originalExtraDeck: originalExtraDeck.value,
        twoDeckMode: twoDeckMode.value,
        zones2: zones2.value,
        revealDeck2: revealDeck2.value,
        originalMainDeck2: originalMainDeck2.value,
        originalExtraDeck2: originalExtraDeck2.value,
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

      zones.value = data.zones
      revealDeck.value = data.revealDeck ?? false
      originalMainDeck.value = data.originalMainDeck ?? []
      originalExtraDeck.value = data.originalExtraDeck ?? []
      initialized.value = true

      if (data.twoDeckMode) {
        twoDeckMode.value = data.twoDeckMode
        zones2.value = data.zones2 ?? emptyZones()
        revealDeck2.value = data.revealDeck2 ?? false
        originalMainDeck2.value = data.originalMainDeck2 ?? []
        originalExtraDeck2.value = data.originalExtraDeck2 ?? []
        initialized2.value = !!(data.zones2)
      }

      return true
    } catch (e) {
      console.error('[practice] Failed to load from localStorage:', e)
      return false
    }
  }

  function clearLocalStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('[practice] Failed to clear localStorage:', e)
    }
  }

  function undo() {
    undoCommand()
    saveToLocalStorage()
  }

  function redo() {
    redoCommand()
    saveToLocalStorage()
  }

  return {
    zones,
    revealDeck,
    initialized,
    originalMainDeck,
    originalExtraDeck,
    zones2,
    revealDeck2,
    initialized2,
    originalMainDeck2,
    originalExtraDeck2,
    twoDeckMode,
    deckCount,
    extraCount,
    handCount,
    gyCount,
    banishCount,
    tempCount,
    deckCount2,
    extraCount2,
    handCount2,
    gyCount2,
    banishCount2,
    tempCount2,
    commandHistory,
    commandIndex,
    canUndo,
    canRedo,
    initPractice,
    resetPractice,
    draw,
    drawToZone,
    drawMultiple,
    moveCard,
    shuffleDeck,
    shuffleHand,
    shuffleExtra,
    setCardFace,
    setCardOrientation,
    reorderInZone,
    revealDeckContents,
    getCards,
    findCard,
    findCardGlobal,
    getDeckCount,
    getZonesRef,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    undo,
    redo,
    clearHistory,
    getUndoDescription,
    getRedoDescription,
  }
})
