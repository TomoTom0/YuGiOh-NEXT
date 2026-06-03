import { usePracticeStore, type ZoneType, type MoveOptions, type CardOrientation } from '../../stores/practice'
import type { DropPosition } from '../../utils/drag-data'
import { usePracticeDragState } from './usePracticeDragState'

export interface DropContext {
  targetZone: ZoneType
  targetSlotIndex?: number
  fieldIndex: number
}

export function usePracticeDropHandler() {
  const practiceStore = usePracticeStore()
  const { draggingRotated, draggingFaceDown } = usePracticeDragState()

  function handleCardDrop(
    cardId: string,
    context: DropContext,
    dropPos: DropPosition,
  ): void {
    const { targetZone, targetSlotIndex, fieldIndex } = context
    const orientation: CardOrientation = draggingRotated.value ? 'horizontal' : 'vertical'

    if (targetZone === 'deck') {
      if (!dropPos.isTop) {
        practiceStore.moveCardToDeckAndShuffle(cardId, fieldIndex)
      } else if (dropPos.isRight) {
        practiceStore.moveCard(cardId, 'deck', undefined, { position: 'top', face: 'down', orientation }, fieldIndex)
      } else {
        practiceStore.moveCard(cardId, 'deck', undefined, { position: 'bottom', face: 'down', orientation }, fieldIndex)
      }
      return
    }

    if (targetZone === 'gy') {
      practiceStore.moveCard(cardId, 'gy', undefined, { position: 'top', face: 'up', orientation }, fieldIndex)
      return
    }

    if (targetZone === 'extra') {
      const face = dropPos.isTop ? 'up' : 'down'
      practiceStore.moveCard(cardId, 'extra', undefined, { position: 'top', face, orientation }, fieldIndex)
      return
    }

    if (targetZone === 'banish') {
      const face = dropPos.isTop ? 'up' : 'down'
      const existingCards = practiceStore.getCards('banish', undefined, fieldIndex)
      const position: MoveOptions['position'] = existingCards.length > 0
        ? (dropPos.isRight ? 'bottom' : 'top')
        : 'top'
      practiceStore.moveCard(cardId, 'banish', undefined, { position, face, orientation }, fieldIndex)
      return
    }

    if (targetZone === 'hand' && dropPos.insertIndex !== undefined) {
      const fromLoc = practiceStore.findCard(cardId, fieldIndex)
      let idx = dropPos.insertIndex
      if (fromLoc && fromLoc.zone === 'hand' && fromLoc.cardIndex < idx) {
        idx = idx - 1
      }
      const clampedIdx = Math.max(0, Math.min(idx, practiceStore.getCards('hand', undefined, fieldIndex).length))
      practiceStore.moveCard(cardId, 'hand', undefined, { position: clampedIdx, face: 'up', orientation }, fieldIndex)
      return
    }

    const face = dropPos.isTop ? 'up' : 'down'
    const existingCards = practiceStore.getCards(targetZone, targetSlotIndex, fieldIndex)
    const position: MoveOptions['position'] = existingCards.length > 0
      ? (dropPos.isRight ? 'bottom' : 'top')
      : 'top'
    practiceStore.moveCard(cardId, targetZone, targetSlotIndex, { position, face, orientation }, fieldIndex)
  }

  function handleExternalCardDrop(
    cid: string,
    ciid: string,
    context: DropContext,
    dropPos?: DropPosition,
  ): void {
    const { targetZone, targetSlotIndex, fieldIndex } = context
    let face: 'up' | 'down' = 'up'
    if (targetZone === 'deck') face = 'down'
    else if (targetZone === 'extra') face = dropPos?.isTop ? 'up' : 'down'
    else if (targetZone === 'banish') face = dropPos?.isTop ? 'up' : 'down'
    else if (targetZone === 'gy') face = 'up'
    else face = dropPos?.isTop !== false ? 'up' : 'down'

    if (targetZone === 'hand' && dropPos?.insertIndex !== undefined) {
      const clampedIdx = Math.max(0, Math.min(dropPos.insertIndex, practiceStore.getCards('hand', undefined, fieldIndex).length))
      practiceStore.addExternalCard(cid, ciid, 'hand', undefined, fieldIndex, face, clampedIdx)
      return
    }
    practiceStore.addExternalCard(cid, ciid, targetZone, targetSlotIndex, fieldIndex, face)
  }

  return { handleCardDrop, handleExternalCardDrop }
}
