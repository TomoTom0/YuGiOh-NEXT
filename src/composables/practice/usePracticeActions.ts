import { usePracticeStore, type ZoneType, type PracticeCard } from '../../stores/practice'
import {
  mdiArrowCollapseDown,
  mdiArrowCollapseUp,
  mdiGraveStone,
  mdiHandBackRight,
  mdiMinusCircle,
  mdiRotateRight,
  mdiEyeOff,
} from '@mdi/js'

export interface ActionButton {
  key: string
  title: string
  icon: string
}

const NO_ROTATE_ZONES = new Set<ZoneType>(['gy', 'banish', 'deck', 'extra', 'hand'])

export function usePracticeActions() {
  const practiceStore = usePracticeStore()

  function executeAction(action: string, cardId: string, fieldIndex: number): void {
    if (action === 'moveToGY') {
      practiceStore.moveCard(cardId, 'gy', undefined, undefined, fieldIndex)
    } else if (action === 'moveToHand') {
      practiceStore.moveCard(cardId, 'hand', undefined, undefined, fieldIndex)
    } else if (action === 'moveToBanish') {
      practiceStore.moveCard(cardId, 'banish', undefined, undefined, fieldIndex)
    } else if (action === 'moveToField') {
      let targetSlot = 0
      for (let i = 0; i < 5; i++) {
        if (practiceStore.getCards('monster', i, fieldIndex).length === 0) {
          targetSlot = i
          break
        }
      }
      practiceStore.moveCard(cardId, 'monster', targetSlot, { face: 'up' }, fieldIndex)
    } else if (action === 'moveToDeckBottom') {
      practiceStore.moveCard(cardId, 'deck', undefined, { position: 'bottom', face: 'down' }, fieldIndex)
    } else if (action === 'moveToExtraBottom') {
      practiceStore.moveCard(cardId, 'extra', undefined, { position: 'bottom', face: 'down' }, fieldIndex)
    } else if (action === 'toggleFace') {
      const loc = practiceStore.findCard(cardId, fieldIndex)
      if (loc) {
        const cards = practiceStore.getCards(loc.zone, loc.slotIndex, fieldIndex)
        const card = cards[loc.cardIndex]
        if (card) practiceStore.setCardFace(cardId, card.face === 'up' ? 'down' : 'up', fieldIndex)
      }
    } else if (action === 'toggleOrientation') {
      const loc = practiceStore.findCard(cardId, fieldIndex)
      if (loc) {
        const cards = practiceStore.getCards(loc.zone, loc.slotIndex, fieldIndex)
        const card = cards[loc.cardIndex]
        if (card) practiceStore.setCardOrientation(cardId, card.orientation === 'vertical' ? 'horizontal' : 'vertical', fieldIndex)
      }
    }
  }

  function getAvailableActions(zone: ZoneType, card: PracticeCard): (ActionButton | null)[] {
    const isExtraCard = card.cardType === 'monster' && !!card.isExtraDeck
    const canRotate = !NO_ROTATE_ZONES.has(zone)

    const deckKey = isExtraCard ? 'moveToExtraBottom' : 'moveToDeckBottom'
    const deckTitle = isExtraCard ? 'EX Bot' : 'Deck Bot'

    return [
      zone !== 'gy' ? { key: 'moveToGY', title: 'GY', icon: mdiGraveStone } : null,
      zone !== 'banish' ? { key: 'moveToBanish', title: 'Banish', icon: mdiMinusCircle } : null,
      { key: 'toggleFace', title: 'Flip', icon: mdiEyeOff },
      canRotate ? { key: 'toggleOrientation', title: 'Rotate', icon: mdiRotateRight } : null,
      zone !== 'hand' ? { key: 'moveToHand', title: 'Hand', icon: mdiHandBackRight } : null,
      zone === 'extra'
        ? { key: 'moveToField', title: 'Field', icon: mdiArrowCollapseUp }
        : (zone !== 'deck')
          ? { key: deckKey, title: deckTitle, icon: mdiArrowCollapseDown }
          : null,
    ]
  }

  return { executeAction, getAvailableActions }
}
