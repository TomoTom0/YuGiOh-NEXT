import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePracticeActions } from '@/composables/practice/usePracticeActions'
import { usePracticeStore, type PracticeCard, type ZoneType, type CardLocation } from '@/stores/practice'

// usePracticeActions は practiceStore.moveCard / getCards / findCard / setCardFace /
// setCardOrientation の各メソッドを呼び分ける thin な composable。本テストでは
// - moveCard / setCardFace / setCardOrientation: spyOn で呼出引数を検証
// - getCards / findCard: spyOn + mockReturnValue/mockImplementation で制御
// という構成で、conditions.toml の各条件の期待副作用を検証する。
// getAvailableActions は zone と card 属性からボタン配列を構築する純粋関数的な部分で、
// ストア状態に依存しないためモック無しで直接検証する。

function createCard(overrides: Partial<PracticeCard> = {}): PracticeCard {
  return {
    cardId: 'c1',
    ciid: 'ciid1',
    name: 'Test Card',
    lang: 'ja',
    imgs: [],
    cardType: 'monster',
    empty: false,
    instanceId: 'inst1',
    face: 'up',
    orientation: 'vertical',
    ...overrides,
  }
}

describe('usePracticeActions conditions', () => {
  let store: ReturnType<typeof usePracticeStore>
  let actions: ReturnType<typeof usePracticeActions>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePracticeStore()
    actions = usePracticeActions()
  })

  // ============================================================
  // usePracticeActions#executeAction - 単純移動系
  // ============================================================

  it('[covers:execute.movetogy-calls-movecard-gy-no-options] moveToGY は zone=gy, options 無しで moveCard を呼ぶ', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    actions.executeAction('moveToGY', 'c1', 1)
    expect(moveSpy).toHaveBeenCalledWith('c1', 'gy', undefined, undefined, 1)
  })

  it('[covers:execute.movetohand-calls-movecard-hand-no-options] moveToHand は zone=hand, options 無しで moveCard を呼ぶ', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    actions.executeAction('moveToHand', 'c1', 0)
    expect(moveSpy).toHaveBeenCalledWith('c1', 'hand', undefined, undefined, 0)
  })

  it('[covers:execute.movetobanish-calls-movecard-banish-no-options] moveToBanish は zone=banish, options 無しで moveCard を呼ぶ', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    actions.executeAction('moveToBanish', 'c1', 0)
    expect(moveSpy).toHaveBeenCalledWith('c1', 'banish', undefined, undefined, 0)
  })

  it('[covers:execute.movetodeckbottom-calls-movecard-deck-bottom-down] moveToDeckBottom は deck + {position:bottom,face:down} で呼ぶ', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    actions.executeAction('moveToDeckBottom', 'c1', 2)
    expect(moveSpy).toHaveBeenCalledWith('c1', 'deck', undefined, { position: 'bottom', face: 'down' }, 2)
  })

  it('[covers:execute.movetoextrabottom-calls-movecard-extra-bottom-down] moveToExtraBottom は extra + {position:bottom,face:down} で呼ぶ', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    actions.executeAction('moveToExtraBottom', 'c1', 0)
    expect(moveSpy).toHaveBeenCalledWith('c1', 'extra', undefined, { position: 'bottom', face: 'down' }, 0)
  })

  // ============================================================
  // usePracticeActions#executeAction - moveToField (空きスロット探索)
  // ============================================================

  it('[covers:execute.movetofield-selects-first-empty-monster-slot] moveToField は最初の空き monster slot を targetSlot にする', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    // slot 0 は非空、slot 1 が空 → targetSlot=1 で break
    vi.spyOn(store, 'getCards').mockImplementation((zone: ZoneType, slotIndex?: number) => {
      if (zone === 'monster' && slotIndex === 0) return [createCard()]
      return []
    })
    actions.executeAction('moveToField', 'c1', 0)
    expect(moveSpy).toHaveBeenCalledWith('c1', 'monster', 1, { face: 'up' }, 0)
  })

  it('[covers:execute.movetofield-all-full-falls-back-to-slot-0] 全 monster slot が埋まっていれば targetSlot=0 にフォールバック', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    // slot 0..4 全て非空（各1件）→ ループが break せず targetSlot 初期値 0 のまま
    vi.spyOn(store, 'getCards').mockImplementation((zone: ZoneType): PracticeCard[] => {
      if (zone === 'monster') return [createCard()]
      return []
    })
    actions.executeAction('moveToField', 'c1', 0)
    expect(moveSpy).toHaveBeenCalledWith('c1', 'monster', 0, { face: 'up' }, 0)
  })

  it('[covers:execute.movetofield-passes-face-up-option] moveToField の options は {face:up} のみ（position/orientation キー無し）', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'getCards').mockReturnValue([])
    actions.executeAction('moveToField', 'c1', 0)
    const callArgs = moveSpy.mock.calls[0]!
    // 第4引数 options が { face: 'up' } に等しい（他キーを含まない）
    expect(callArgs[3]).toEqual({ face: 'up' })
    // 第2引数 zone は 'monster' 固定
    expect(callArgs[1]).toBe('monster')
  })

  // ============================================================
  // usePracticeActions#executeAction - toggleFace
  // ============================================================

  it('[covers:execute.toggleface-flips-up-to-down] toggleFace は face=up のカードを down に切替', () => {
    const faceSpy = vi.spyOn(store, 'setCardFace').mockImplementation(() => {})
    const loc: CardLocation = { zone: 'hand', cardIndex: 0, fieldIndex: 0 }
    vi.spyOn(store, 'findCard').mockReturnValue(loc)
    vi.spyOn(store, 'getCards').mockReturnValue([createCard({ face: 'up' })])
    actions.executeAction('toggleFace', 'c1', 0)
    expect(faceSpy).toHaveBeenCalledWith('c1', 'down', 0)
  })

  it('[covers:execute.toggleface-flips-down-to-up] toggleFace は face=down のカードを up に切替', () => {
    const faceSpy = vi.spyOn(store, 'setCardFace').mockImplementation(() => {})
    const loc: CardLocation = { zone: 'hand', cardIndex: 0, fieldIndex: 0 }
    vi.spyOn(store, 'findCard').mockReturnValue(loc)
    vi.spyOn(store, 'getCards').mockReturnValue([createCard({ face: 'down' })])
    actions.executeAction('toggleFace', 'c1', 0)
    expect(faceSpy).toHaveBeenCalledWith('c1', 'up', 0)
  })

  it('[covers:execute.toggleface-noop-when-findcard-returns-null] findCard が null なら setCardFace/getCards とも呼ばない', () => {
    const faceSpy = vi.spyOn(store, 'setCardFace').mockImplementation(() => {})
    const getCardsSpy = vi.spyOn(store, 'getCards').mockReturnValue([])
    vi.spyOn(store, 'findCard').mockReturnValue(null)
    actions.executeAction('toggleFace', 'c1', 0)
    expect(faceSpy).not.toHaveBeenCalled()
    expect(getCardsSpy).not.toHaveBeenCalled()
  })

  it('[covers:execute.toggleface-noop-when-card-undefined] getCards が空配列なら setCardFace を呼ばない（防御ガード）', () => {
    const faceSpy = vi.spyOn(store, 'setCardFace').mockImplementation(() => {})
    const loc: CardLocation = { zone: 'hand', cardIndex: 0, fieldIndex: 0 }
    vi.spyOn(store, 'findCard').mockReturnValue(loc)
    vi.spyOn(store, 'getCards').mockReturnValue([]) // cards[0] が undefined
    actions.executeAction('toggleFace', 'c1', 0)
    expect(faceSpy).not.toHaveBeenCalled()
  })

  // ============================================================
  // usePracticeActions#executeAction - toggleOrientation
  // ============================================================

  it('[covers:execute.toggleorientation-flips-vertical-to-horizontal] toggleOrientation は vertical を horizontal に切替', () => {
    const orientSpy = vi.spyOn(store, 'setCardOrientation').mockImplementation(() => {})
    const loc: CardLocation = { zone: 'hand', cardIndex: 0, fieldIndex: 0 }
    vi.spyOn(store, 'findCard').mockReturnValue(loc)
    vi.spyOn(store, 'getCards').mockReturnValue([createCard({ orientation: 'vertical' })])
    actions.executeAction('toggleOrientation', 'c1', 0)
    expect(orientSpy).toHaveBeenCalledWith('c1', 'horizontal', 0)
  })

  it('[covers:execute.toggleorientation-flips-horizontal-to-vertical] toggleOrientation は horizontal を vertical に切替', () => {
    const orientSpy = vi.spyOn(store, 'setCardOrientation').mockImplementation(() => {})
    const loc: CardLocation = { zone: 'hand', cardIndex: 0, fieldIndex: 0 }
    vi.spyOn(store, 'findCard').mockReturnValue(loc)
    vi.spyOn(store, 'getCards').mockReturnValue([createCard({ orientation: 'horizontal' })])
    actions.executeAction('toggleOrientation', 'c1', 0)
    expect(orientSpy).toHaveBeenCalledWith('c1', 'vertical', 0)
  })

  it('[covers:execute.toggleorientation-noop-when-findcard-returns-null] findCard が null なら setCardOrientation を呼ばない', () => {
    const orientSpy = vi.spyOn(store, 'setCardOrientation').mockImplementation(() => {})
    vi.spyOn(store, 'findCard').mockReturnValue(null)
    actions.executeAction('toggleOrientation', 'c1', 0)
    expect(orientSpy).not.toHaveBeenCalled()
  })

  it('[covers:execute.toggleorientation-noop-when-card-undefined] getCards が空配列なら setCardOrientation を呼ばない（防御ガード）', () => {
    const orientSpy = vi.spyOn(store, 'setCardOrientation').mockImplementation(() => {})
    const loc: CardLocation = { zone: 'hand', cardIndex: 0, fieldIndex: 0 }
    vi.spyOn(store, 'findCard').mockReturnValue(loc)
    vi.spyOn(store, 'getCards').mockReturnValue([])
    actions.executeAction('toggleOrientation', 'c1', 0)
    expect(orientSpy).not.toHaveBeenCalled()
  })

  // ============================================================
  // usePracticeActions#executeAction - 不明な action
  // ============================================================

  it('[covers:execute.unknown-action-silent-noop] 不明な action 文字列はいずれの store メソッドも呼ばない', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    const faceSpy = vi.spyOn(store, 'setCardFace').mockImplementation(() => {})
    const orientSpy = vi.spyOn(store, 'setCardOrientation').mockImplementation(() => {})
    const getCardsSpy = vi.spyOn(store, 'getCards').mockReturnValue([])
    const findCardSpy = vi.spyOn(store, 'findCard').mockReturnValue(null)

    actions.executeAction('unknownAction', 'c1', 0)

    expect(moveSpy).not.toHaveBeenCalled()
    expect(faceSpy).not.toHaveBeenCalled()
    expect(orientSpy).not.toHaveBeenCalled()
    expect(getCardsSpy).not.toHaveBeenCalled()
    expect(findCardSpy).not.toHaveBeenCalled()
  })

  // ============================================================
  // usePracticeActions#getAvailableActions - ボタン表示/非表示
  // ============================================================

  it('[covers:getactions.movetogy-hidden-when-zone-is-gy] zone=gy のとき戻り値[0] は null', () => {
    const result = actions.getAvailableActions('gy', createCard())
    expect(result[0]).toBeNull()
  })

  it('[covers:getactions.movetogy-shown-when-zone-not-gy] zone!=gy のとき戻り値[0] は moveToGY ボタン', () => {
    const result = actions.getAvailableActions('hand', createCard())
    expect(result[0]).not.toBeNull()
    expect(result[0]!.key).toBe('moveToGY')
    expect(result[0]!.title).toBe('GY')
  })

  it('[covers:getactions.movetobanish-hidden-when-zone-is-banish] zone=banish のとき戻り値[1] は null', () => {
    const result = actions.getAvailableActions('banish', createCard())
    expect(result[1]).toBeNull()
  })

  it('[covers:getactions.movetobanish-shown-when-zone-not-banish] zone!=banish のとき戻り値[1] は moveToBanish ボタン', () => {
    const result = actions.getAvailableActions('hand', createCard())
    expect(result[1]).not.toBeNull()
    expect(result[1]!.key).toBe('moveToBanish')
    expect(result[1]!.title).toBe('Banish')
  })

  it('[covers:getactions.toggleface-always-present] toggleFace ボタンは zone に関わらず常に表示される', () => {
    // 様々な zone で全て [2] が null でないことを確認
    const zones: ZoneType[] = ['gy', 'banish', 'deck', 'extra', 'hand', 'monster', 'field', 'spellTrap', 'extraMonster', 'temp']
    for (const zone of zones) {
      const result = actions.getAvailableActions(zone, createCard())
      expect(result[2]).not.toBeNull()
      expect(result[2]!.key).toBe('toggleFace')
      expect(result[2]!.title).toBe('Flip')
    }
  })

  it('[covers:getactions.toggleorientation-hidden-in-no-rotate-zones] NO_ROTATE_ZONES では戻り値[3] が null', () => {
    const noRotateZones: ZoneType[] = ['gy', 'banish', 'deck', 'extra', 'hand']
    for (const zone of noRotateZones) {
      const result = actions.getAvailableActions(zone, createCard())
      expect(result[3]).toBeNull()
    }
  })

  it('[covers:getactions.toggleorientation-shown-in-rotatable-zones] 回転可能ゾーンでは戻り値[3] が toggleOrientation ボタン', () => {
    const rotatableZones: ZoneType[] = ['field', 'monster', 'spellTrap', 'extraMonster', 'temp']
    for (const zone of rotatableZones) {
      const result = actions.getAvailableActions(zone, createCard())
      expect(result[3]).not.toBeNull()
      expect(result[3]!.key).toBe('toggleOrientation')
      expect(result[3]!.title).toBe('Rotate')
    }
  })

  it('[covers:getactions.movetohand-hidden-when-zone-is-hand] zone=hand のとき戻り値[4] は null', () => {
    const result = actions.getAvailableActions('hand', createCard())
    expect(result[4]).toBeNull()
  })

  it('[covers:getactions.movetohand-shown-when-zone-not-hand] zone!=hand のとき戻り値[4] は moveToHand ボタン', () => {
    const result = actions.getAvailableActions('gy', createCard())
    expect(result[4]).not.toBeNull()
    expect(result[4]!.key).toBe('moveToHand')
    expect(result[4]!.title).toBe('Hand')
  })

  it('[covers:getactions.last-slot-movetofield-when-zone-is-extra] zone=extra のとき戻り値[5] は moveToField（isExtraCard に関わらず）', () => {
    // 非EXモンスターでも extra ゾーンなら moveToField
    const result1 = actions.getAvailableActions('extra', createCard({ cardType: 'spell' }))
    expect(result1[5]).not.toBeNull()
    expect(result1[5]!.key).toBe('moveToField')
    expect(result1[5]!.title).toBe('Field')
    // EXモンスターでも extra ゾーンなら moveToField（zone 優先）
    const result2 = actions.getAvailableActions('extra', createCard({ cardType: 'monster', isExtraDeck: true }))
    expect(result2[5]!.key).toBe('moveToField')
  })

  it('[covers:getactions.last-slot-deckkey-when-zone-not-extra-not-deck] zone が extra/deck 以外のとき戻り値[5] は deckKey ボタン', () => {
    const result = actions.getAvailableActions('monster', createCard({ cardType: 'spell' }))
    expect(result[5]).not.toBeNull()
    // cardType='spell' は isExtraCard=false → moveToDeckBottom
    expect(result[5]!.key).toBe('moveToDeckBottom')
  })

  it('[covers:getactions.last-slot-null-when-zone-is-deck] zone=deck のとき戻り値[5] は null', () => {
    const result = actions.getAvailableActions('deck', createCard())
    expect(result[5]).toBeNull()
  })

  it('[covers:getactions.deckkey-uses-movetoextrabottom-for-extra-deck-monster] isExtraCard=true なら deckKey=moveToExtraBottom, title=EX Bot', () => {
    const result = actions.getAvailableActions('monster', createCard({ cardType: 'monster', isExtraDeck: true }))
    expect(result[5]).not.toBeNull()
    expect(result[5]!.key).toBe('moveToExtraBottom')
    expect(result[5]!.title).toBe('EX Bot')
  })

  it('[covers:getactions.deckkey-uses-movetodeckbottom-for-non-extra] isExtraCard=false なら deckKey=moveToDeckBottom, title=Deck Bot', () => {
    // spell は isExtraCard=false
    const result = actions.getAvailableActions('monster', createCard({ cardType: 'spell' }))
    expect(result[5]).not.toBeNull()
    expect(result[5]!.key).toBe('moveToDeckBottom')
    expect(result[5]!.title).toBe('Deck Bot')
  })

  it('[covers:getactions.isextracard-requires-both-monster-and-isextradeck] monster でも isExtraDeck 無しなら moveToDeckBottom', () => {
    // cardType='monster' だが isExtraDeck=undefined → isExtraCard=false
    const result = actions.getAvailableActions('monster', createCard({ cardType: 'monster', isExtraDeck: undefined }))
    expect(result[5]).not.toBeNull()
    expect(result[5]!.key).toBe('moveToDeckBottom')
    expect(result[5]!.title).toBe('Deck Bot')
  })
})
