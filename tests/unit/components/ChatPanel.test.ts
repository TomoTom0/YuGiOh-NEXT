/**
 * ChatPanel.vue のテスト
 *
 * tests/design/chat-panel/conditions.toml（TASK-507テスト先行）の回帰条件をカバーする。
 * ChatPanel本体の全面条件化はTier C候補として別タスクのスコープ（条件書[meta]参照）。
 *
 * TASK-507の背景: buildDeckSectionsの searchResults: searchStore.searchResults.map(r => r.card) は
 * CardInfoにcardプロパティが存在しないため実行時常にundefined配列をLLMへ渡す潜在バグだった。
 * 本テストはstore（フラットなCardInfo[]）→ ChatPanel → chat引数deckSections.searchResults の
 * 接続が正しいことを保証する（tests/unit/services/llm/はDeckSectionsを直接構築しておらず
 * この接続部分を保証しない）。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ChatPanel from '@/components/ChatPanel.vue';
import { useSearchStore } from '@/stores/search';
import { chat } from '@/services/llm/llm-chat-service';
import type { CardInfo } from '@/types/card';

// LLM呼び出し（llm-chat-service）。DeckSections構築結果の受け渡しを観測するためmockへ置き換える。
// ChatAbortErrorはsend()のcatch節のinstanceof判定用（本テストではrejectしないがimport要件）
vi.mock('@/services/llm/llm-chat-service', () => ({
  chat: vi.fn(),
  ChatAbortError: class ChatAbortError extends Error {},
}));

// カードリンク解析（assistantメッセージ表示の装飾）。本テストの対象外のため最小実装へ置き換える
vi.mock('@/composables/useCardLinks', () => ({
  useCardLinks: () => ({
    parseCardLinks: (text: string | undefined) => [{ type: 'text' as const, text: text ?? '' }],
    handleCardLinkClick: vi.fn(),
  }),
}));

// getCardInfo（カードキャッシュ参照）。本テストではデッキ各セクションを空にするため
// buildDeckSectionsのresolveCardsからは呼ばれないが、module import解決のため置き換える
vi.mock('@/utils/card-utils', () => ({
  getCardInfo: vi.fn(() => undefined),
}));

describe('components/ChatPanel', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    vi.mocked(chat).mockResolvedValue({ message: 'テスト回答', needsClarification: false });
  });

  // サンプルカード（tests/unit/stores/search.test.tsと同形のフラットなCardInfo。
  // src/types/card.ts のMonsterCard必須フィールドを過不足なく持つ）
  const createCard = (id: string): CardInfo => ({
    cardId: id,
    ciid: 'ciid1',
    lang: 'ja',
    imgs: [{ ciid: 'ciid1', imgHash: 'hash1' }],
    name: `Card ${id}`,
    cardType: 'monster',
    attribute: 'light',
    levelType: 'level',
    levelValue: 4,
    race: 'dragon',
    types: ['effect'],
    atk: 1800,
    def: 1000,
    isExtraDeck: false
  });

  it('[covers:chat-panel.deck-sections-pass-search-results-directly] 検索結果のカードがDeckSections.searchResultsへそのまま渡る', async () => {
    const searchStore = useSearchStore();
    const card1 = createCard('card1');
    const card2 = createCard('card2');
    searchStore.searchResults = [card1, card2];

    const wrapper = mount(ChatPanel, {
      global: {
        plugins: [pinia]
      }
    });

    // 送信経路（ChatPanel.vue template）: textarea入力 → 送信ボタンclick
    await wrapper.find('textarea.chat-input').setValue('デッキを評価して');
    await wrapper.find('button.chat-send-btn').trigger('click');
    await flushPromises();

    expect(vi.mocked(chat)).toHaveBeenCalledTimes(1);
    const request = vi.mocked(chat).mock.calls[0]?.[0];
    expect(request).toBeDefined();

    // storeのsearchResults（フラットなCardInfo[]）がそのまま渡ること。
    // 旧実装（.map(r => r.card)）の場合はundefined配列になりこの検証はfailする
    const passed = request?.deckSections.searchResults;
    expect(passed).toHaveLength(2);
    expect(passed?.[0]).toMatchObject({ cardId: 'card1', name: 'Card card1' });
    expect(passed?.[1]).toMatchObject({ cardId: 'card2', name: 'Card card2' });
  });
});
