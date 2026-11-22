import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePracticeDropHandler, type DropContext } from '@/composables/practice/usePracticeDropHandler'
import { usePracticeStore } from '@/stores/practice'
import { usePracticeDragState } from '@/composables/practice/usePracticeDragState'
import type { DropPosition } from '@/utils/drag-data'

// usePracticeDropHandler は practiceStore.moveCard/moveCardToDeckAndShuffle/addExternalCard/
// getCards/findCard の各メソッドを呼び分ける thin な composable。本テストでは
// - draggingRotated: 実際の usePracticeDragState の ref を直接操作
// - getCards / findCard: spyOn + mockReturnValue で制御
// - moveCard / moveCardToDeckAndShuffle / addExternalCard: spyOn で呼出引数を検証
// という構成で、conditions.toml の各条件の期待副作用を検証する。
describe('usePracticeDropHandler conditions', () => {
  let store: ReturnType<typeof usePracticeStore>
  let dragState: ReturnType<typeof usePracticeDragState>
  let handler: ReturnType<typeof usePracticeDropHandler>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePracticeStore()
    dragState = usePracticeDragState()
    // モジュールスコープの ref を直接リセット
    dragState.draggingRotated.value = false
    handler = usePracticeDropHandler()
  })

  // ============================================================
  // usePracticeDropHandler#handleCardDrop
  // ============================================================

  it('[covers:handle-card-drop.orientation-from-dragging-rotated] draggingRotatedに応じてorientationが切り替わる', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'getCards').mockReturnValue([])
    const ctx: DropContext = { targetZone: 'gy', fieldIndex: 0 }
    const dropPos: DropPosition = { isTop: true, isRight: false }

    dragState.draggingRotated.value = true
    handler.handleCardDrop('card1', ctx, dropPos)
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'gy', undefined, expect.objectContaining({ orientation: 'horizontal' }), 0)

    dragState.draggingRotated.value = false
    handler.handleCardDrop('card1', ctx, dropPos)
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'gy', undefined, expect.objectContaining({ orientation: 'vertical' }), 0)
  })

  it('[covers:handle-card-drop.deck-not-top-shuffles] deck + isTop=false は moveCardToDeckAndShuffle を呼ぶ', () => {
    const shuffleSpy = vi.spyOn(store, 'moveCardToDeckAndShuffle').mockImplementation(() => {})
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'deck', fieldIndex: 1 }
    const dropPos: DropPosition = { isTop: false, isRight: false }

    handler.handleCardDrop('card1', ctx, dropPos)

    expect(shuffleSpy).toHaveBeenCalledWith('card1', 1)
    expect(moveSpy).not.toHaveBeenCalled()
  })

  it('[covers:handle-card-drop.deck-top-right-inserts-face-down-at-top] deck + isTop=true + isRight=true は position:top face:down', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'deck', fieldIndex: 0 }
    const dropPos: DropPosition = { isTop: true, isRight: true }

    handler.handleCardDrop('card1', ctx, dropPos)

    expect(moveSpy).toHaveBeenCalledWith('card1', 'deck', undefined, { position: 'top', face: 'down', orientation: 'vertical' }, 0)
  })

  it('[covers:handle-card-drop.deck-top-left-inserts-face-down-at-bottom] deck + isTop=true + isRight=false は position:bottom face:down', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'deck', fieldIndex: 0 }
    const dropPos: DropPosition = { isTop: true, isRight: false }

    handler.handleCardDrop('card1', ctx, dropPos)

    expect(moveSpy).toHaveBeenCalledWith('card1', 'deck', undefined, { position: 'bottom', face: 'down', orientation: 'vertical' }, 0)
  })

  it('[covers:handle-card-drop.gy-ignores-drop-position] gy は dropPos に関わらず position:top face:up 固定', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'gy', fieldIndex: 0 }

    // isTop/isRight の全組合せで同じ引数になることを確認
    for (const isTop of [true, false]) {
      for (const isRight of [true, false]) {
        handler.handleCardDrop('card1', ctx, { isTop, isRight })
      }
    }
    expect(moveSpy).toHaveBeenCalledTimes(4)
    for (let i = 0; i < 4; i++) {
      expect(moveSpy).toHaveBeenNthCalledWith(i + 1, 'card1', 'gy', undefined, { position: 'top', face: 'up', orientation: 'vertical' }, 0)
    }
  })

  it('[covers:handle-card-drop.extra-face-from-is-top-position-always-top] extra は position 常に top、face は isTop で切替', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'extra', fieldIndex: 0 }

    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: true })
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'extra', undefined, { position: 'top', face: 'up', orientation: 'vertical' }, 0)

    // isRight=true でも position:top のまま（isRight 無視）
    handler.handleCardDrop('card1', ctx, { isTop: false, isRight: true })
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'extra', undefined, { position: 'top', face: 'down', orientation: 'vertical' }, 0)
  })

  it('[covers:handle-card-drop.banish-face-from-is-top] banish の face は isTop で切替', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'getCards').mockReturnValue([])
    const ctx: DropContext = { targetZone: 'banish', fieldIndex: 0 }

    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: false })
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'banish', undefined, expect.objectContaining({ face: 'up' }), 0)

    handler.handleCardDrop('card1', ctx, { isTop: false, isRight: false })
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'banish', undefined, expect.objectContaining({ face: 'down' }), 0)
  })

  it('[covers:handle-card-drop.banish-empty-zone-forces-top] banish 空ゾーンは isRight 関係なく position:top', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'getCards').mockReturnValue([]) // 空ゾーン
    const ctx: DropContext = { targetZone: 'banish', fieldIndex: 0 }

    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: true })
    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: false })

    expect(moveSpy).toHaveBeenCalledTimes(2)
    expect(moveSpy).toHaveBeenNthCalledWith(1, 'card1', 'banish', undefined, expect.objectContaining({ position: 'top' }), 0)
    expect(moveSpy).toHaveBeenNthCalledWith(2, 'card1', 'banish', undefined, expect.objectContaining({ position: 'top' }), 0)
  })

  it('[covers:handle-card-drop.banish-non-empty-position-from-is-right] banish 既存あり時は isRight で top/bottom 切替', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'getCards').mockReturnValue([{ instanceId: 'existing' }] as unknown as ReturnType<typeof store.getCards>)
    const ctx: DropContext = { targetZone: 'banish', fieldIndex: 0 }

    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: true })
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'banish', undefined, expect.objectContaining({ position: 'bottom' }), 0)

    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: false })
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'banish', undefined, expect.objectContaining({ position: 'top' }), 0)
  })

  it('[covers:handle-card-drop.hand-insert-index-decremented-when-source-before-target] 同一hand内で移動元が前の場合 idx を1減らす', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'findCard').mockReturnValue({ zone: 'hand', cardIndex: 1, fieldIndex: 0 })
    vi.spyOn(store, 'getCards').mockReturnValue([]) // handLength 計算用（0だが idx-1=2 が残る）
    const ctx: DropContext = { targetZone: 'hand', fieldIndex: 0 }
    const dropPos: DropPosition = { isTop: true, isRight: false, insertIndex: 3 }

    handler.handleCardDrop('card1', ctx, dropPos)

    // idx(3) - 1 = 2。clampedIdx = Math.max(0, Math.min(2, 0)) = 0 になるが、
    // moveCard の position 引数に渡るのは clampedIdx = 0
    expect(moveSpy).toHaveBeenCalledWith('card1', 'hand', undefined, expect.objectContaining({ position: 0 }), 0)
  })

  it('[covers:handle-card-drop.hand-insert-index-not-decremented-when-source-after-target] 移動元がhand外なら idx を減らさない', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'findCard').mockReturnValue({ zone: 'deck', cardIndex: 5, fieldIndex: 0 })
    vi.spyOn(store, 'getCards').mockReturnValue([]) // handLength=0 → min(1,0)=0
    const ctx: DropContext = { targetZone: 'hand', fieldIndex: 0 }
    const dropPos: DropPosition = { isTop: true, isRight: false, insertIndex: 1 }

    handler.handleCardDrop('card1', ctx, dropPos)

    // idx=1（減らない）、clampedIdx=min(1, 0)=0
    expect(moveSpy).toHaveBeenCalledWith('card1', 'hand', undefined, expect.objectContaining({ position: 0 }), 0)
  })

  it('[covers:handle-card-drop.hand-insert-index-clamped] hand の insertIndex は handLength でクランプ', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'findCard').mockReturnValue(null) // hand 以外からの移動扱い
    // hand length = 3 を返す（3枚の配列）
    vi.spyOn(store, 'getCards').mockReturnValue([
      { instanceId: 'h1' },
      { instanceId: 'h2' },
      { instanceId: 'h3' },
    ] as unknown as ReturnType<typeof store.getCards>)
    const ctx: DropContext = { targetZone: 'hand', fieldIndex: 0 }
    const dropPos: DropPosition = { isTop: true, isRight: false, insertIndex: 999 }

    handler.handleCardDrop('card1', ctx, dropPos)

    // idx=999、fromLoc=null なので減算なし、clampedIdx=min(999, 3)=3
    expect(moveSpy).toHaveBeenCalledWith('card1', 'hand', undefined, expect.objectContaining({ position: 3 }), 0)
  })

  it('[covers:handle-card-drop.hand-face-up-fixed] hand ドロップは face 常に up 固定', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'findCard').mockReturnValue(null)
    vi.spyOn(store, 'getCards').mockReturnValue([])
    const ctx: DropContext = { targetZone: 'hand', fieldIndex: 0 }
    // isTop=false でも face:'up' になることを確認
    const dropPos: DropPosition = { isTop: false, isRight: false, insertIndex: 0 }

    handler.handleCardDrop('card1', ctx, dropPos)

    expect(moveSpy).toHaveBeenCalledWith('card1', 'hand', undefined, expect.objectContaining({ face: 'up' }), 0)
  })

  it('[covers:handle-card-drop.default-face-from-is-top] default zone の face は isTop で切替', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'getCards').mockReturnValue([])
    const ctx: DropContext = { targetZone: 'monster', targetSlotIndex: 2, fieldIndex: 0 }

    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: false })
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'monster', 2, expect.objectContaining({ face: 'up' }), 0)

    handler.handleCardDrop('card1', ctx, { isTop: false, isRight: false })
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'monster', 2, expect.objectContaining({ face: 'down' }), 0)
  })

  it('[covers:handle-card-drop.default-empty-zone-forces-top] default zone 空ゾーンは isRight 関係なく top', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'getCards').mockReturnValue([])
    const ctx: DropContext = { targetZone: 'monster', targetSlotIndex: 2, fieldIndex: 0 }

    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: true })
    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: false })

    expect(moveSpy).toHaveBeenNthCalledWith(1, 'card1', 'monster', 2, expect.objectContaining({ position: 'top' }), 0)
    expect(moveSpy).toHaveBeenNthCalledWith(2, 'card1', 'monster', 2, expect.objectContaining({ position: 'top' }), 0)
  })

  it('[covers:handle-card-drop.default-non-empty-position-from-is-right] default zone 既存あり時は isRight で top/bottom', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'getCards').mockReturnValue([{ instanceId: 'e' }] as unknown as ReturnType<typeof store.getCards>)
    const ctx: DropContext = { targetZone: 'monster', targetSlotIndex: 2, fieldIndex: 0 }

    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: true })
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'monster', 2, expect.objectContaining({ position: 'bottom' }), 0)

    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: false })
    expect(moveSpy).toHaveBeenLastCalledWith('card1', 'monster', 2, expect.objectContaining({ position: 'top' }), 0)
  })

  it('[covers:handle-card-drop.default-passes-target-slot-index] default zone は targetSlotIndex を第3引数に渡す', () => {
    const moveSpy = vi.spyOn(store, 'moveCard').mockImplementation(() => {})
    vi.spyOn(store, 'getCards').mockReturnValue([])
    const ctx: DropContext = { targetZone: 'monster', targetSlotIndex: 3, fieldIndex: 0 }

    handler.handleCardDrop('card1', ctx, { isTop: true, isRight: false })

    // 第3引数が 3 であることを確認（hand/gy の early return 群は undefined を渡すのと対比）
    expect(moveSpy).toHaveBeenCalledWith('card1', 'monster', 3, expect.any(Object), 0)
  })

  // ============================================================
  // usePracticeDropHandler#handleExternalCardDrop
  // ============================================================

  it('[covers:handle-external-card-drop.face-deck-always-down] external drop deck は face 常に down', () => {
    const addSpy = vi.spyOn(store, 'addExternalCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'deck', fieldIndex: 0 }

    for (const dropPos of [
      { isTop: true, isRight: false },
      { isTop: false, isRight: false },
      undefined,
    ] as (DropPosition | undefined)[]) {
      handler.handleExternalCardDrop('cid', 'ciid', ctx, dropPos)
    }

    expect(addSpy).toHaveBeenCalledTimes(3)
    for (let i = 1; i <= 3; i++) {
      // face は第6引数
      const args = addSpy.mock.calls[i - 1]!
      expect(args[5]).toBe('down')
    }
  })

  it('[covers:handle-external-card-drop.face-extra-undefined-drop-pos-is-down] external drop extra + dropPos undefined は down', () => {
    const addSpy = vi.spyOn(store, 'addExternalCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'extra', fieldIndex: 0 }

    handler.handleExternalCardDrop('cid', 'ciid', ctx, undefined)

    expect(addSpy.mock.calls[0]![5]).toBe('down')

    // isTop=true なら up になることも確認
    handler.handleExternalCardDrop('cid', 'ciid', ctx, { isTop: true, isRight: false })
    expect(addSpy.mock.calls[1]![5]).toBe('up')
  })

  it('[covers:handle-external-card-drop.face-banish-undefined-drop-pos-is-down] external drop banish + isTop=true は up', () => {
    const addSpy = vi.spyOn(store, 'addExternalCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'banish', fieldIndex: 0 }

    handler.handleExternalCardDrop('cid', 'ciid', ctx, { isTop: true, isRight: false })
    expect(addSpy.mock.calls[0]![5]).toBe('up')

    // dropPos undefined は down
    handler.handleExternalCardDrop('cid', 'ciid', ctx, undefined)
    expect(addSpy.mock.calls[1]![5]).toBe('down')
  })

  it('[covers:handle-external-card-drop.face-gy-always-up] external drop gy は face 常に up', () => {
    const addSpy = vi.spyOn(store, 'addExternalCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'gy', fieldIndex: 0 }

    for (const dropPos of [
      { isTop: true, isRight: false },
      { isTop: false, isRight: false },
      undefined,
    ] as (DropPosition | undefined)[]) {
      handler.handleExternalCardDrop('cid', 'ciid', ctx, dropPos)
    }

    expect(addSpy).toHaveBeenCalledTimes(3)
    for (let i = 0; i < 3; i++) {
      expect(addSpy.mock.calls[i]![5]).toBe('up')
    }
  })

  it('[covers:handle-external-card-drop.face-default-undefined-drop-pos-is-up] external drop default + dropPos undefined は up', () => {
    const addSpy = vi.spyOn(store, 'addExternalCard').mockImplementation(() => {})
    // hand は insertIndex undefined 時 default 分岐へ。targetZone='hand' で検証
    const ctx: DropContext = { targetZone: 'hand', fieldIndex: 0 }

    handler.handleExternalCardDrop('cid', 'ciid', ctx, undefined)

    // face='up' かつ position 引数なし（default 分岐）
    expect(addSpy).toHaveBeenCalledWith('cid', 'ciid', 'hand', undefined, 0, 'up')
  })

  it('[covers:handle-external-card-drop.face-default-explicit-false-is-down] external drop default + isTop=false は down', () => {
    const addSpy = vi.spyOn(store, 'addExternalCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'field', fieldIndex: 0 }

    handler.handleExternalCardDrop('cid', 'ciid', ctx, { isTop: false, isRight: false })

    expect(addSpy.mock.calls[0]![5]).toBe('down')
  })

  it('[covers:handle-external-card-drop.hand-insert-index-clamped] external drop hand + insertIndex は handLength でクランプ', () => {
    const addSpy = vi.spyOn(store, 'addExternalCard').mockImplementation(() => {})
    vi.spyOn(store, 'getCards').mockReturnValue([
      { instanceId: 'h1' },
      { instanceId: 'h2' },
      { instanceId: 'h3' },
    ] as unknown as ReturnType<typeof store.getCards>)
    const ctx: DropContext = { targetZone: 'hand', fieldIndex: 0 }

    handler.handleExternalCardDrop('cid', 'ciid', ctx, { isTop: true, isRight: false, insertIndex: 999 })

    // min(999, 3) = 3 が第7引数(position)に渡る
    expect(addSpy).toHaveBeenCalledWith('cid', 'ciid', 'hand', undefined, 0, 'up', 3)
  })

  it('[covers:handle-external-card-drop.hand-insert-uses-undefined-slot] external drop hand insert は slotIndex に undefined', () => {
    const addSpy = vi.spyOn(store, 'addExternalCard').mockImplementation(() => {})
    vi.spyOn(store, 'getCards').mockReturnValue([])
    // context.targetSlotIndex=99 を渡しても slotIndex 引数は undefined になる
    const ctx: DropContext = { targetZone: 'hand', targetSlotIndex: 99, fieldIndex: 0 }

    handler.handleExternalCardDrop('cid', 'ciid', ctx, { isTop: true, isRight: false, insertIndex: 0 })

    // 第4引数(slotIndex)が undefined であることを確認
    expect(addSpy.mock.calls[0]![3]).toBeUndefined()
    expect(addSpy.mock.calls[0]![4]).toBe(0) // fieldIndex
  })

  it('[covers:handle-external-card-drop.default-adds-without-position] external drop default は position 引数なし', () => {
    const addSpy = vi.spyOn(store, 'addExternalCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'monster', targetSlotIndex: 2, fieldIndex: 0 }

    handler.handleExternalCardDrop('cid', 'ciid', ctx, { isTop: true, isRight: false })

    // 第7引数(position)が渡されない（引数6個）
    expect(addSpy.mock.calls[0]!).toHaveLength(6)
    expect(addSpy).toHaveBeenCalledWith('cid', 'ciid', 'monster', 2, 0, 'up')
  })

  it('[covers:handle-external-card-drop.drop-pos-undefined-falls-to-default] external drop dropPos undefined は default 分岐へ', () => {
    const addSpy = vi.spyOn(store, 'addExternalCard').mockImplementation(() => {})
    const ctx: DropContext = { targetZone: 'hand', fieldIndex: 0 }

    handler.handleExternalCardDrop('cid', 'ciid', ctx, undefined)

    // hand + dropPos undefined は insert分岐（insertIndex !== undefined）を抜けて default へ
    // position 引数なし（6個）、face='up'
    expect(addSpy.mock.calls[0]!).toHaveLength(6)
    expect(addSpy).toHaveBeenCalledWith('cid', 'ciid', 'hand', undefined, 0, 'up')
  })
})
