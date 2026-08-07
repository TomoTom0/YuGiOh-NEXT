import { describe, it, expect } from 'vitest';
import {
  captureDeckSnapshot,
  captureDeckSnapshotWithoutOrder,
  hasOnlySortOrderChanges,
  compareSnapshots,
  type DeckSnapshotData
} from '@/composables/deck/useDeckSnapshot';
import type { DeckInfo } from '@/types/deck';

describe('useDeckSnapshot', () => {
  const createDeckInfo = (overrides?: Partial<DeckInfo>): DeckInfo => ({
    dno: 1,
    name: 'Test Deck',
    deckCode: '',
    mainDeck: [
      { cid: '12345', ciid: 'ciid1', quantity: 3 },
      { cid: '67890', ciid: 'ciid2', quantity: 2 }
    ],
    extraDeck: [
      { cid: '11111', ciid: 'ciid3', quantity: 1 }
    ],
    sideDeck: [],
    category: ['カテゴリ1'],
    tags: ['タグ1', 'タグ2'],
    comment: 'テストコメント',
    skippedCards: [],
    ...overrides
  });

  describe('captureDeckSnapshot', () => {
    it('デッキ情報からスナップショットを作成できる', () => {
      const deckInfo = createDeckInfo();
      const snapshot = captureDeckSnapshot(deckInfo);

      expect(snapshot).toBeDefined();
      expect(typeof snapshot).toBe('string');

      const parsed: DeckSnapshotData = JSON.parse(snapshot);
      expect(parsed.dno).toBe(1);
      expect(parsed.name).toBe('Test Deck');
      expect(parsed.mainDeck).toHaveLength(2);
      expect(parsed.extraDeck).toHaveLength(1);
      expect(parsed.sideDeck).toHaveLength(0);
      expect(parsed.category).toEqual(['カテゴリ1']);
      expect(parsed.tags).toEqual(['タグ1', 'タグ2']);
      expect(parsed.comment).toBe('テストコメント');
    });

    // [covers:capture.excludes_deck_code]
    it('スナップショットにはdeckCodeが含まれない', () => {
      const deckInfo = createDeckInfo({ deckCode: 'test-code' });
      const snapshot = captureDeckSnapshot(deckInfo);

      const parsed: DeckSnapshotData = JSON.parse(snapshot);
      expect(parsed).not.toHaveProperty('deckCode');
    });

    it('空のデッキでもスナップショットを作成できる', () => {
      const deckInfo = createDeckInfo({
        mainDeck: [],
        extraDeck: [],
        sideDeck: []
      });
      const snapshot = captureDeckSnapshot(deckInfo);

      const parsed: DeckSnapshotData = JSON.parse(snapshot);
      expect(parsed.mainDeck).toEqual([]);
      expect(parsed.extraDeck).toEqual([]);
      expect(parsed.sideDeck).toEqual([]);
    });

    // [covers:capture.no_default_fallback_for_optional_fields]
    it('カテゴリ・タグ・コメントがundefinedでもスナップショットを作成できる', () => {
      const deckInfo = createDeckInfo({
        category: undefined,
        tags: undefined,
        comment: undefined
      });
      const snapshot = captureDeckSnapshot(deckInfo);

      const parsed: DeckSnapshotData = JSON.parse(snapshot);
      expect(parsed.category).toBeUndefined();
      expect(parsed.tags).toBeUndefined();
      expect(parsed.comment).toBeUndefined();
    });
  });

  describe('captureDeckSnapshotWithoutOrder', () => {
    it('表示順序を無視したスナップショットを作成できる', () => {
      const deckInfo = createDeckInfo();
      const snapshot = captureDeckSnapshotWithoutOrder(deckInfo);

      expect(snapshot).toBeDefined();
      expect(typeof snapshot).toBe('string');

      const parsed: DeckSnapshotData = JSON.parse(snapshot);
      expect(parsed.mainDeck).toBeDefined();
      expect(parsed.mainDeck).toHaveLength(2);
    });

    it('カードの並び順が異なっても同じスナップショットになる', () => {
      const deckInfo1 = createDeckInfo({
        mainDeck: [
          { cid: '12345', ciid: 'ciid1', quantity: 3 },
          { cid: '67890', ciid: 'ciid2', quantity: 2 }
        ]
      });
      const deckInfo2 = createDeckInfo({
        mainDeck: [
          { cid: '67890', ciid: 'ciid2', quantity: 2 },
          { cid: '12345', ciid: 'ciid1', quantity: 3 }
        ]
      });

      const snapshot1 = captureDeckSnapshotWithoutOrder(deckInfo1);
      const snapshot2 = captureDeckSnapshotWithoutOrder(deckInfo2);

      expect(snapshot1).toBe(snapshot2);
    });

    // [covers:normalize.sort_primary_key_cid]
    // [covers:normalize.sort_secondary_key_ciid_when_cid_equal]
    it('カードが正しくソートされる（cid、ciidの順）', () => {
      const deckInfo = createDeckInfo({
        mainDeck: [
          { cid: '99999', ciid: 'ciid1', quantity: 1 },
          { cid: '11111', ciid: 'ciid3', quantity: 2 },
          { cid: '11111', ciid: 'ciid1', quantity: 1 }
        ]
      });

      const snapshot = captureDeckSnapshotWithoutOrder(deckInfo);
      const parsed: DeckSnapshotData = JSON.parse(snapshot);

      expect(parsed.mainDeck[0]?.cid).toBe('11111');
      expect(parsed.mainDeck[0]?.ciid).toBe('ciid1');
      expect(parsed.mainDeck[1]?.cid).toBe('11111');
      expect(parsed.mainDeck[1]?.ciid).toBe('ciid3');
      expect(parsed.mainDeck[2]?.cid).toBe('99999');
    });

    it('各セクション（メイン、エクストラ、サイド）が独立してソートされる', () => {
      const deckInfo = createDeckInfo({
        mainDeck: [
          { cid: '99999', ciid: 'ciid1', quantity: 1 },
          { cid: '11111', ciid: 'ciid1', quantity: 1 }
        ],
        extraDeck: [
          { cid: '88888', ciid: 'ciid1', quantity: 1 },
          { cid: '22222', ciid: 'ciid1', quantity: 1 }
        ],
        sideDeck: [
          { cid: '77777', ciid: 'ciid1', quantity: 1 },
          { cid: '33333', ciid: 'ciid1', quantity: 1 }
        ]
      });

      const snapshot = captureDeckSnapshotWithoutOrder(deckInfo);
      const parsed: DeckSnapshotData = JSON.parse(snapshot);

      expect(parsed.mainDeck[0]?.cid).toBe('11111');
      expect(parsed.mainDeck[1]?.cid).toBe('99999');
      expect(parsed.extraDeck[0]?.cid).toBe('22222');
      expect(parsed.extraDeck[1]?.cid).toBe('88888');
      expect(parsed.sideDeck[0]?.cid).toBe('33333');
      expect(parsed.sideDeck[1]?.cid).toBe('77777');
    });

    // [covers:normalize.sort_ties_preserve_relative_order]
    it('cid・ciidが完全に一致するエントリの相対順序は元の配列順が保たれる', () => {
      const deckInfo = createDeckInfo({
        mainDeck: [
          { cid: '11111', ciid: 'ciid1', quantity: 1, lang: 'ja' },
          { cid: '11111', ciid: 'ciid1', quantity: 2, lang: 'ja' },
          { cid: '11111', ciid: 'ciid1', quantity: 3, lang: 'ja' }
        ]
      });

      const snapshot = captureDeckSnapshotWithoutOrder(deckInfo);
      const parsed: DeckSnapshotData = JSON.parse(snapshot);

      expect(parsed.mainDeck[0]?.quantity).toBe(1);
      expect(parsed.mainDeck[1]?.quantity).toBe(2);
      expect(parsed.mainDeck[2]?.quantity).toBe(3);
    });

    // [covers:normalize.drops_lang_field_from_comparison_key]
    it('langフィールドは比較対象から除外される（出力に含まれない・差異が結果に影響しない）', () => {
      const deckInfoJa = createDeckInfo({
        mainDeck: [{ cid: '12345', ciid: 'ciid1', quantity: 3, lang: 'ja' }]
      });
      const deckInfoEn = createDeckInfo({
        mainDeck: [{ cid: '12345', ciid: 'ciid1', quantity: 3, lang: 'en' }]
      });

      const snapshotJa = captureDeckSnapshotWithoutOrder(deckInfoJa);
      const snapshotEn = captureDeckSnapshotWithoutOrder(deckInfoEn);

      const parsed: DeckSnapshotData = JSON.parse(snapshotJa);
      expect(parsed.mainDeck[0]).not.toHaveProperty('lang');
      expect(snapshotJa).toBe(snapshotEn);
    });

    // [covers:without_order.skipped_cards_not_normalized]
    it('skippedCardsはソートされず、並び順の差がそのまま結果に反映される', () => {
      const deckInfo1 = createDeckInfo({
        skippedCards: [
          { cid: '11111', name: 'A', lang: 'ja' },
          { cid: '22222', name: 'B', lang: 'ja' }
        ]
      });
      const deckInfo2 = createDeckInfo({
        skippedCards: [
          { cid: '22222', name: 'B', lang: 'ja' },
          { cid: '11111', name: 'A', lang: 'ja' }
        ]
      });

      const snapshot1 = captureDeckSnapshotWithoutOrder(deckInfo1);
      const snapshot2 = captureDeckSnapshotWithoutOrder(deckInfo2);

      expect(snapshot1).not.toBe(snapshot2);
    });
  });

  describe('hasOnlySortOrderChanges', () => {
    // [covers:has_only_sort_order_changes.pure_reorder_returns_true]
    it('並び順のみが異なる場合、trueを返す', () => {
      const deckInfo1 = createDeckInfo({
        mainDeck: [
          { cid: '12345', ciid: 'ciid1', quantity: 3 },
          { cid: '67890', ciid: 'ciid2', quantity: 2 }
        ]
      });
      const deckInfo2 = createDeckInfo({
        mainDeck: [
          { cid: '67890', ciid: 'ciid2', quantity: 2 },
          { cid: '12345', ciid: 'ciid1', quantity: 3 }
        ]
      });

      const snapshot1 = captureDeckSnapshot(deckInfo1);
      const snapshot2 = captureDeckSnapshot(deckInfo2);

      const result = hasOnlySortOrderChanges(snapshot1, snapshot2);

      expect(result).toBe(true);
    });

    // [covers:has_only_sort_order_changes.content_difference_returns_false]
    it('カードの内容が異なる場合、falseを返す', () => {
      const deckInfo1 = createDeckInfo({
        mainDeck: [
          { cid: '12345', ciid: 'ciid1', quantity: 3 }
        ]
      });
      const deckInfo2 = createDeckInfo({
        mainDeck: [
          { cid: '67890', ciid: 'ciid2', quantity: 2 }
        ]
      });

      const snapshot1 = captureDeckSnapshot(deckInfo1);
      const snapshot2 = captureDeckSnapshot(deckInfo2);

      const result = hasOnlySortOrderChanges(snapshot1, snapshot2);

      expect(result).toBe(false);
    });

    it('カードの枚数が異なる場合、falseを返す', () => {
      const deckInfo1 = createDeckInfo({
        mainDeck: [
          { cid: '12345', ciid: 'ciid1', quantity: 3 }
        ]
      });
      const deckInfo2 = createDeckInfo({
        mainDeck: [
          { cid: '12345', ciid: 'ciid1', quantity: 2 }
        ]
      });

      const snapshot1 = captureDeckSnapshot(deckInfo1);
      const snapshot2 = captureDeckSnapshot(deckInfo2);

      const result = hasOnlySortOrderChanges(snapshot1, snapshot2);

      expect(result).toBe(false);
    });

    it('デッキ名が異なる場合、falseを返す', () => {
      const deckInfo1 = createDeckInfo({ name: 'Deck A' });
      const deckInfo2 = createDeckInfo({ name: 'Deck B' });

      const snapshot1 = captureDeckSnapshot(deckInfo1);
      const snapshot2 = captureDeckSnapshot(deckInfo2);

      const result = hasOnlySortOrderChanges(snapshot1, snapshot2);

      expect(result).toBe(false);
    });

    it('カテゴリが異なる場合、falseを返す', () => {
      const deckInfo1 = createDeckInfo({ category: ['カテゴリ1'] });
      const deckInfo2 = createDeckInfo({ category: ['カテゴリ2'] });

      const snapshot1 = captureDeckSnapshot(deckInfo1);
      const snapshot2 = captureDeckSnapshot(deckInfo2);

      const result = hasOnlySortOrderChanges(snapshot1, snapshot2);

      expect(result).toBe(false);
    });

    // [covers:has_only_sort_order_changes.catch_returns_false_and_logs_on_error]
    it('不正なスナップショットの場合、falseを返す', () => {
      const invalidSnapshot = 'invalid json';
      const validSnapshot = captureDeckSnapshot(createDeckInfo());

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = hasOnlySortOrderChanges(invalidSnapshot, validSnapshot);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    // [covers:has_only_sort_order_changes.category_undefined_fallback_to_empty_array]
    // [covers:has_only_sort_order_changes.undefined_vs_default_diverges_from_compare_snapshots]
    it('categoryがundefinedのスナップショットとcategory=[]のスナップショットは同一視される（compareSnapshotsとは判定が食い違う）', () => {
      const deckInfoUndefined = createDeckInfo({ category: undefined });
      const deckInfoEmpty = createDeckInfo({ category: [] });

      const snapshotUndefined = captureDeckSnapshot(deckInfoUndefined);
      const snapshotEmpty = captureDeckSnapshot(deckInfoEmpty);

      expect(hasOnlySortOrderChanges(snapshotUndefined, snapshotEmpty)).toBe(true);
      expect(compareSnapshots(snapshotUndefined, snapshotEmpty)).toBe(false);
    });

    // [covers:has_only_sort_order_changes.tags_undefined_fallback_to_empty_array]
    it('tagsがundefinedのスナップショットとtags=[]のスナップショットは同一視される', () => {
      const deckInfoUndefined = createDeckInfo({ tags: undefined });
      const deckInfoEmpty = createDeckInfo({ tags: [] });

      const snapshotUndefined = captureDeckSnapshot(deckInfoUndefined);
      const snapshotEmpty = captureDeckSnapshot(deckInfoEmpty);

      expect(hasOnlySortOrderChanges(snapshotUndefined, snapshotEmpty)).toBe(true);
    });

    // [covers:has_only_sort_order_changes.comment_undefined_fallback_to_empty_string]
    it("commentがundefinedのスナップショットとcomment=''のスナップショットは同一視される", () => {
      const deckInfoUndefined = createDeckInfo({ comment: undefined });
      const deckInfoEmpty = createDeckInfo({ comment: '' });

      const snapshotUndefined = captureDeckSnapshot(deckInfoUndefined);
      const snapshotEmpty = captureDeckSnapshot(deckInfoEmpty);

      expect(hasOnlySortOrderChanges(snapshotUndefined, snapshotEmpty)).toBe(true);
    });

    // [covers:has_only_sort_order_changes.lang_only_difference_not_detected]
    it('langのみが異なる場合、並び順のみの変更として扱われる（lang差分は検出されない）', () => {
      const deckInfoJa = createDeckInfo({
        mainDeck: [{ cid: '12345', ciid: 'ciid1', quantity: 3, lang: 'ja' }]
      });
      const deckInfoEn = createDeckInfo({
        mainDeck: [{ cid: '12345', ciid: 'ciid1', quantity: 3, lang: 'en' }]
      });

      const snapshotJa = captureDeckSnapshot(deckInfoJa);
      const snapshotEn = captureDeckSnapshot(deckInfoEn);

      const result = hasOnlySortOrderChanges(snapshotJa, snapshotEn);

      expect(result).toBe(true);
    });

    // [covers:has_only_sort_order_changes.skipped_cards_order_affects_result]
    it('skippedCardsは正規化されないため、並び順のみの差でもfalseを返す', () => {
      const deckInfo1 = createDeckInfo({
        skippedCards: [
          { cid: '11111', name: 'A', lang: 'ja' },
          { cid: '22222', name: 'B', lang: 'ja' }
        ]
      });
      const deckInfo2 = createDeckInfo({
        skippedCards: [
          { cid: '22222', name: 'B', lang: 'ja' },
          { cid: '11111', name: 'A', lang: 'ja' }
        ]
      });

      const snapshot1 = captureDeckSnapshot(deckInfo1);
      const snapshot2 = captureDeckSnapshot(deckInfo2);

      const result = hasOnlySortOrderChanges(snapshot1, snapshot2);

      expect(result).toBe(false);
    });
  });

  describe('compareSnapshots', () => {
    it('同じスナップショットの場合、trueを返す', () => {
      const deckInfo = createDeckInfo();
      const snapshot1 = captureDeckSnapshot(deckInfo);
      const snapshot2 = captureDeckSnapshot(deckInfo);

      const result = compareSnapshots(snapshot1, snapshot2);

      expect(result).toBe(true);
    });

    it('異なるスナップショットの場合、falseを返す', () => {
      const deckInfo1 = createDeckInfo({ name: 'Deck A' });
      const deckInfo2 = createDeckInfo({ name: 'Deck B' });

      const snapshot1 = captureDeckSnapshot(deckInfo1);
      const snapshot2 = captureDeckSnapshot(deckInfo2);

      const result = compareSnapshots(snapshot1, snapshot2);

      expect(result).toBe(false);
    });

    it('並び順が異なる場合、falseを返す', () => {
      const deckInfo1 = createDeckInfo({
        mainDeck: [
          { cid: '12345', ciid: 'ciid1', quantity: 3 },
          { cid: '67890', ciid: 'ciid2', quantity: 2 }
        ]
      });
      const deckInfo2 = createDeckInfo({
        mainDeck: [
          { cid: '67890', ciid: 'ciid2', quantity: 2 },
          { cid: '12345', ciid: 'ciid1', quantity: 3 }
        ]
      });

      const snapshot1 = captureDeckSnapshot(deckInfo1);
      const snapshot2 = captureDeckSnapshot(deckInfo2);

      const result = compareSnapshots(snapshot1, snapshot2);

      expect(result).toBe(false);
    });

    // [covers:compare_snapshots.strict_string_equality_no_normalization]
    it('正規化を行わないため、hasOnlySortOrderChangesならtrueになる組でもfalseを返す', () => {
      const deckInfoUndefined = createDeckInfo({ category: undefined });
      const deckInfoEmpty = createDeckInfo({ category: [] });

      const snapshotUndefined = captureDeckSnapshot(deckInfoUndefined);
      const snapshotEmpty = captureDeckSnapshot(deckInfoEmpty);

      const result = compareSnapshots(snapshotUndefined, snapshotEmpty);

      expect(result).toBe(false);
      expect(hasOnlySortOrderChanges(snapshotUndefined, snapshotEmpty)).toBe(true);
    });
  });
});
