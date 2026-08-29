/**
 * card-utils.ts のテスト
 * - TempCacheDB/UnifiedCacheDBからのカード情報取得（優先順位・フォールバック・マージ）
 * - デッキ内カード検索（mainDeck/extraDeck/sideDeck/trashDeckの結合順序）
 *
 * conditions: tests/design/card-utils/conditions.toml
 * （実装コードを直接読んで転記した条件一覧。[covers:<id>] タグで対応関係を明示）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CardInfo, SpellCard } from '@/types/card';
import type { DeckCardRef } from '@/types/deck';

// vi.mockはファイル先頭にhoistingされるため、参照する変数はvi.hoisted()で定義する
const mocks = vi.hoisted(() => ({
  tempDbGet: vi.fn(),
  unifiedReconstructCardInfo: vi.fn(),
  unifiedHasCardTableC: vi.fn(),
  detectLanguage: vi.fn(),
}));

vi.mock('@/utils/temp-cache-db', () => ({
  getTempCacheDB: () => ({ get: mocks.tempDbGet }),
}));

vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: () => ({
    reconstructCardInfo: mocks.unifiedReconstructCardInfo,
    hasCardTableC: mocks.unifiedHasCardTableC,
  }),
}));

vi.mock('@/utils/language-detector', () => ({
  detectLanguage: mocks.detectLanguage,
}));

import {
  getCardInfoFromTempDB,
  getCardInfoFromUnifiedDB,
  getCardInfo,
  getCardInfoLegacy,
  findDeckCardRef,
  getCardInfoWithLang,
  type DeckData,
} from '@/utils/card-utils';

/** テスト用の最小CardInfo（spellカードで必須フィールドのみ、asキャストを使わずSpellCardとして構築） */
function makeCardInfo(overrides: Partial<SpellCard> = {}): CardInfo {
  const base: SpellCard = {
    cardType: 'spell',
    name: 'テストカード',
    cardId: '1',
    ciid: '0',
    lang: 'ja',
    imgs: [],
  };
  return { ...base, ...overrides };
}

/** テスト用のDeckCardRef */
function makeDeckCardRef(overrides: Partial<DeckCardRef> = {}): DeckCardRef {
  return {
    cid: '1',
    ciid: '0',
    lang: 'ja',
    quantity: 1,
    ...overrides,
  };
}

describe('card-utils', () => {
  beforeEach(() => {
    mocks.tempDbGet.mockReset();
    mocks.unifiedReconstructCardInfo.mockReset();
    mocks.unifiedHasCardTableC.mockReset();
    mocks.detectLanguage.mockReset();
    mocks.detectLanguage.mockReturnValue('ja');
  });

  describe('getCardInfoFromTempDB', () => {
    // [covers:get_card_info_from_temp_db.found]
    it('TempCacheDBにcidが存在する場合はそのCardInfoを返す', () => {
      const info = makeCardInfo({ cardId: '100' });
      mocks.tempDbGet.mockReturnValue(info);

      expect(getCardInfoFromTempDB('100')).toBe(info);
    });

    // [covers:get_card_info_from_temp_db.not_found]
    it('TempCacheDBにcidが存在しない場合はnullを返す', () => {
      mocks.tempDbGet.mockReturnValue(undefined);

      expect(getCardInfoFromTempDB('999')).toBeNull();
    });
  });

  describe('getCardInfoFromUnifiedDB', () => {
    // [covers:get_card_info_from_unified_db.found]
    it('UnifiedCacheDBにcidが存在する場合はそのCardInfoを返す', () => {
      const info = makeCardInfo({ cardId: '200' });
      mocks.unifiedReconstructCardInfo.mockReturnValue(info);

      expect(getCardInfoFromUnifiedDB('200')).toBe(info);
    });

    // [covers:get_card_info_from_unified_db.not_found]
    it('UnifiedCacheDBにcidが存在しない場合はnullを返す', () => {
      mocks.unifiedReconstructCardInfo.mockReturnValue(undefined);

      expect(getCardInfoFromUnifiedDB('999')).toBeNull();
    });
  });

  describe('getCardInfo', () => {
    // [covers:get_card_info.unified_missing_fallback_temp]
    it('UnifiedDBに無い場合、hasCardTableCを見ずTempDBの結果をそのまま返す', () => {
      mocks.unifiedReconstructCardInfo.mockReturnValue(undefined);
      const tempInfo = makeCardInfo({ cardId: '300' });
      mocks.tempDbGet.mockReturnValue(tempInfo);

      expect(getCardInfo('300')).toBe(tempInfo);
      expect(mocks.unifiedHasCardTableC).not.toHaveBeenCalled();
    });

    it('UnifiedDBにもTempDBにも無い場合はnullを返す', () => {
      mocks.unifiedReconstructCardInfo.mockReturnValue(undefined);
      mocks.tempDbGet.mockReturnValue(undefined);

      expect(getCardInfo('300')).toBeNull();
    });

    // [covers:get_card_info.unified_present_has_table_c]
    it('UnifiedDBにありhasCardTableCがtrueの場合、TempDBに触れずunifiedInfoをそのまま返す', () => {
      const unifiedInfo = makeCardInfo({ cardId: '400', text: 'unified-text' });
      mocks.unifiedReconstructCardInfo.mockReturnValue(unifiedInfo);
      mocks.unifiedHasCardTableC.mockReturnValue(true);

      expect(getCardInfo('400')).toBe(unifiedInfo);
      expect(mocks.tempDbGet).not.toHaveBeenCalled();
    });

    // [covers:get_card_info.unified_present_no_table_c_temp_supplements]
    it('hasCardTableCがfalseでTempDBにも情報がある場合、TempDB優先でマージして返す', () => {
      const unifiedInfo = makeCardInfo({ cardId: '500', text: 'unified-text', ciid: 'unified-ciid' });
      const tempInfo = makeCardInfo({ cardId: '500', ciid: 'temp-ciid' });
      mocks.unifiedReconstructCardInfo.mockReturnValue(unifiedInfo);
      mocks.unifiedHasCardTableC.mockReturnValue(false);
      mocks.tempDbGet.mockReturnValue(tempInfo);

      const result = getCardInfo('500');
      // マージ結果: unifiedInfoの内容をベースにtempInfoのキーが上書きする
      expect(result).toEqual({ ...unifiedInfo, ...tempInfo });
      expect(result?.ciid).toBe('temp-ciid');
    });

    // [covers:get_card_info.unified_present_no_table_c_temp_missing]
    it('hasCardTableCがfalseでもTempDBに情報が無い場合はunifiedInfoをそのまま返す', () => {
      const unifiedInfo = makeCardInfo({ cardId: '600', text: 'unified-text' });
      mocks.unifiedReconstructCardInfo.mockReturnValue(unifiedInfo);
      mocks.unifiedHasCardTableC.mockReturnValue(false);
      mocks.tempDbGet.mockReturnValue(undefined);

      expect(getCardInfo('600')).toBe(unifiedInfo);
    });
  });

  describe('getCardInfoLegacy', () => {
    // [covers:get_card_info_legacy.delegates_ignoring_extra_args]
    it('ciid/deckDataを無視してgetCardInfo(cid)の結果をそのまま返す', () => {
      const info = makeCardInfo({ cardId: '700' });
      mocks.unifiedReconstructCardInfo.mockReturnValue(info);
      mocks.unifiedHasCardTableC.mockReturnValue(true);

      const deckData: DeckData = { mainDeck: [], extraDeck: [], sideDeck: [] };
      const result = getCardInfoLegacy('700', 999, deckData);

      expect(result).toBe(info);
      // 引数(999, deckData)は実装上参照されないため、DBアクセス先はcidのみで決まる
    });
  });

  describe('findDeckCardRef', () => {
    // [covers:find_deck_card_ref.trash_deck_absent_defaults_empty]
    it('trashDeckがundefinedの場合、trashDeck相当のカードは検索対象に含まれない', () => {
      const trashCard = makeDeckCardRef({ cid: 'trash-1' });
      const deckData: DeckData = {
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        // trashDeck未指定
      };
      // trashCardはどのデッキにも実際には入れていないため、
      // 「trashDeck未指定でもmain/extra/sideの検索自体は正常」であることも合わせて検証する
      const result = findDeckCardRef((dc) => dc.cid === trashCard.cid, deckData);

      expect(result).toBeUndefined();
    });

    // [covers:find_deck_card_ref.trash_deck_present_included]
    it('trashDeckが配列で存在する場合は検索対象に含まれる', () => {
      const trashCard = makeDeckCardRef({ cid: 'trash-1' });
      const deckData: DeckData = {
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        trashDeck: [trashCard],
      };

      const result = findDeckCardRef((dc) => dc.cid === 'trash-1', deckData);

      expect(result).toBe(trashCard);
    });

    // [covers:find_deck_card_ref.first_match_priority_order]
    it('複数デッキに一致し得る場合、main→extra→side→trashの順で最初に見つかったものを返す', () => {
      const mainCard = makeDeckCardRef({ cid: 'dup', ciid: 'main' });
      const sideCard = makeDeckCardRef({ cid: 'dup', ciid: 'side' });
      const deckData: DeckData = {
        mainDeck: [mainCard],
        extraDeck: [],
        sideDeck: [sideCard],
      };

      const result = findDeckCardRef((dc) => dc.cid === 'dup', deckData);

      expect(result).toBe(mainCard);
    });

    // [covers:find_deck_card_ref.no_match_returns_undefined]
    it('どのカードにも一致しない場合はundefinedを返す', () => {
      const deckData: DeckData = {
        mainDeck: [makeDeckCardRef({ cid: 'a' })],
        extraDeck: [makeDeckCardRef({ cid: 'b' })],
        sideDeck: [makeDeckCardRef({ cid: 'c' })],
      };

      const result = findDeckCardRef((dc) => dc.cid === 'not-exist', deckData);

      expect(result).toBeUndefined();
    });
  });

  describe('getCardInfoWithLang', () => {
    // [covers:get_card_info_with_lang.not_found_returns_null]
    it('UnifiedCacheDBに情報が無い場合はnullを返す（TempDBへのフォールバックなし）', () => {
      mocks.unifiedReconstructCardInfo.mockReturnValue(undefined);

      const result = getCardInfoWithLang('800', 1, document);

      expect(result).toBeNull();
      expect(mocks.tempDbGet).not.toHaveBeenCalled();
    });

    // [covers:get_card_info_with_lang.found_overwrites_ciid]
    it('取得できた場合、元のciidに関わらず引数ciidをStringに変換した値で上書きする', () => {
      const cardInfo = makeCardInfo({ cardId: '900', ciid: '999' });
      mocks.unifiedReconstructCardInfo.mockReturnValue(cardInfo);

      const result = getCardInfoWithLang('900', 42, document);

      expect(result).toEqual({ ...cardInfo, ciid: '42' });
      expect(result?.ciid).toBe('42');
    });

    // [covers:get_card_info_with_lang.lang_from_local_document_param]
    it('langの決定に使うdetectLanguageの引数はグローバルdocumentではなく第3引数documentである', () => {
      const cardInfo = makeCardInfo({ cardId: '901' });
      mocks.unifiedReconstructCardInfo.mockReturnValue(cardInfo);
      const customDoc = document.implementation.createHTMLDocument('custom');

      getCardInfoWithLang('901', 1, customDoc);

      // toHaveBeenCalledWithは深い等価比較でDOMオブジェクト同士の差異検出が不安定なため、
      // 参照そのもの(toBe)で「第3引数documentが渡された」ことを確認する
      expect(mocks.detectLanguage).toHaveBeenCalledTimes(1);
      expect(mocks.detectLanguage.mock.calls[0][0]).toBe(customDoc);
      expect(mocks.detectLanguage.mock.calls[0][0]).not.toBe(document);
    });
  });
});
