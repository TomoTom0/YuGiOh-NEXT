import { describe, it, expect, vi } from 'vitest';
import { executeTool } from '../tool-executor';
import type { StoreRefs } from '../tool-executor';

function createMockStoreRefs(overrides?: Partial<StoreRefs>): StoreRefs {
  return {
    getDeckSections: vi.fn(() => ({
      main: [],
      extra: [],
      side: [],
      trash: [],
      searchResults: [],
    })),
    addCard: vi.fn(() => ({ success: true })),
    removeCard: vi.fn(() => ({ success: true })),
    moveCard: vi.fn(() => ({ success: true })),
    getDeckState: vi.fn(() => ({})),
    getCardInfoById: vi.fn(() => undefined),
    getCardsBySection: vi.fn(() => []),
    ...overrides,
  };
}

describe('executeTool - removeCardFromDeck', () => {
  it('main/extra/sideからの削除はtrashへのmoveCardを呼ぶ', async () => {
    const refs = createMockStoreRefs();
    const result = await executeTool(
      { name: 'removeCardFromDeck', arguments: { cardId: '123', section: 'main' } },
      refs
    );
    expect(result.success).toBe(true);
    expect(refs.moveCard).toHaveBeenCalledWith('123', 'main', 'trash');
    expect(refs.removeCard).not.toHaveBeenCalled();
  });

  it('cardIds配列で複数カードをtrashに移動する', async () => {
    const refs = createMockStoreRefs();
    const result = await executeTool(
      { name: 'removeCardFromDeck', arguments: { cardIds: ['111', '222'], section: 'extra' } },
      refs
    );
    expect(result.success).toBe(true);
    expect(refs.moveCard).toHaveBeenCalledWith('111', 'extra', 'trash');
    expect(refs.moveCard).toHaveBeenCalledWith('222', 'extra', 'trash');
  });

  it('cardIdもcardIdsもない場合はエラー', async () => {
    const refs = createMockStoreRefs();
    const result = await executeTool(
      { name: 'removeCardFromDeck', arguments: { section: 'main' } },
      refs
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('cardId');
  });

  it('sideからの削除もtrashへの移動', async () => {
    const refs = createMockStoreRefs();
    const result = await executeTool(
      { name: 'removeCardFromDeck', arguments: { cardId: '456', section: 'side' } },
      refs
    );
    expect(result.success).toBe(true);
    expect(refs.moveCard).toHaveBeenCalledWith('456', 'side', 'trash');
  });
});

describe('executeTool - moveCard', () => {
  it('カードを移動する', async () => {
    const refs = createMockStoreRefs();
    const result = await executeTool(
      { name: 'moveCard', arguments: { cardId: '123', from: 'main', to: 'side' } },
      refs
    );
    expect(result.success).toBe(true);
    expect(refs.moveCard).toHaveBeenCalledWith('123', 'main', 'side');
  });

  it('trashからmainへの移動', async () => {
    const refs = createMockStoreRefs();
    const result = await executeTool(
      { name: 'moveCard', arguments: { cardId: '123', from: 'trash', to: 'main' } },
      refs
    );
    expect(result.success).toBe(true);
    expect(refs.moveCard).toHaveBeenCalledWith('123', 'trash', 'main');
  });
});
