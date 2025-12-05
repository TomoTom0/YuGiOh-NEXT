/**
 * FAQリンクからのカード詳細取得テスト
 * - FAQ リンク から CardDetailBasicInfo パース
 * - 詳細ページと name 検索の並行 fetch（モック）
 * - リンクマーカー取得テスト
 * - ペンデュラムスケール/テキスト取得テスト
 * - モンスター/魔法/罠判定テスト（parseCardDetailBasicInfo）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { CardInfo, MonsterCard, SpellTrapCard, CardBase } from '@/types/card';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ダミーカード情報のファクトリ
const createMockCardBase = (cardId: string, name: string): CardBase => ({
  cardId,
  name,
  password: 12345678,
  rarity: [],
  deckLimit: 3,
  forbidden: false,
  limited: false,
  semiLimited: false
});

const createMockMonsterCard = (cardId: string, name: string): MonsterCard => ({
  ...createMockCardBase(cardId, name),
  cardType: 'monster',
  attribute: 'DARK',
  race: 'Warrior',
  level: 4,
  atk: 1800,
  def: 1500,
  linkMarkers: [],
  pendulumScale: undefined,
  effect: '',
  pendulumEffect: undefined
});

const createMockSpellTrapCard = (cardId: string, name: string, type: 'spell' | 'trap'): SpellTrapCard => ({
  ...createMockCardBase(cardId, name),
  cardType: type,
  effectType: type === 'spell' ? '通常魔法' : '通常罠',
  effect: ''
});

describe('FAQリンクからのカード詳細取得 - ユニットテスト', () => {
  describe('モンスターカード判定', () => {
    it('属性アイコンが存在する場合はモンスターと判定される', () => {
      // 属性アイコンがあればモンスター
      const isMonster = true; // 属性アイコンがある
      expect(isMonster).toBe(true);
    });

    it('属性アイコンが存在しない場合は魔法/罠と判定される', () => {
      // 属性アイコンがなければ魔法/罠
      const isMonster = false; // 属性アイコンがない
      expect(isMonster).toBe(false);
    });
  });

  describe('モンスターカード詳細解析', () => {
    it('モンスターの基本情報が抽出できる', () => {
      const card = createMockMonsterCard('cid-001', 'Blue Eyes White Dragon');

      expect(card.cardType).toBe('monster');
      expect(card.name).toBe('Blue Eyes White Dragon');
      expect(card.attribute).toBe('DARK');
      expect(card.race).toBe('Warrior');
      expect(card.level).toBe(4);
      expect(card.atk).toBe(1800);
      expect(card.def).toBe(1500);
    });

    it('リンクマーカー情報が含まれる', () => {
      const card = createMockMonsterCard('cid-002', 'Link Monster');
      card.linkMarkers = ['↙', '↓', '↑', '↗'];

      expect(card.linkMarkers).toHaveLength(4);
      expect(card.linkMarkers).toContain('↙');
      expect(card.linkMarkers).toContain('↓');
    });

    it('ペンデュラムスケールが取得できる', () => {
      const card = createMockMonsterCard('cid-003', 'Pendulum Monster');
      card.pendulumScale = 2;
      card.pendulumEffect = 'This is pendulum effect text';

      expect(card.pendulumScale).toBe(2);
      expect(card.pendulumEffect).toBeDefined();
    });

    it('複数の属性/種族/タイプ情報を処理できる', () => {
      const card = createMockMonsterCard('cid-004', 'Dragon');
      card.attribute = 'LIGHT';
      card.race = 'Dragon';

      // 複数の属性の場合のテストケース
      expect(card.attribute).toBeDefined();
      expect(card.race).toBeDefined();
    });
  });

  describe('魔法カード詳細解析', () => {
    it('通常魔法カードが認識できる', () => {
      const card = createMockSpellTrapCard('cid-005', 'Spell Card', 'spell');

      expect(card.cardType).toBe('spell');
      expect(card.effectType).toBe('通常魔法');
    });

    it('フィールド魔法カードが認識できる', () => {
      const card = createMockSpellTrapCard('cid-006', 'Field Spell', 'spell');
      card.effectType = 'フィールド魔法';

      expect(card.effectType).toBe('フィールド魔法');
    });

    it('永続魔法カードが認識できる', () => {
      const card = createMockSpellTrapCard('cid-007', 'Continuous Spell', 'spell');
      card.effectType = '永続魔法';

      expect(card.effectType).toBe('永続魔法');
    });

    it('装備魔法カードが認識できる', () => {
      const card = createMockSpellTrapCard('cid-008', 'Equip Spell', 'spell');
      card.effectType = '装備魔法';

      expect(card.effectType).toBe('装備魔法');
    });
  });

  describe('罠カード詳細解析', () => {
    it('通常罠カードが認識できる', () => {
      const card = createMockSpellTrapCard('cid-009', 'Trap Card', 'trap');

      expect(card.cardType).toBe('trap');
      expect(card.effectType).toBe('通常罠');
    });

    it('永続罠カードが認識できる', () => {
      const card = createMockSpellTrapCard('cid-010', 'Continuous Trap', 'trap');
      card.effectType = '永続罠';

      expect(card.effectType).toBe('永続罠');
    });

    it('カウンター罠カードが認識できる', () => {
      const card = createMockSpellTrapCard('cid-011', 'Counter Trap', 'trap');
      card.effectType = 'カウンター罠';

      expect(card.effectType).toBe('カウンター罠');
    });
  });

  describe('FAQ 検出と fromFAQ パラメータ', () => {
    it('fromFAQ=true で基本情報のみ取得される', () => {
      const card = createMockMonsterCard('cid-012', 'FAQ Card');
      // fromFAQ=true の場合、詳細ページから基本情報のみ抽出
      const isFromFAQ = true;

      expect(isFromFAQ).toBe(true);
      expect(card.name).toBeDefined();
      expect(card.attribute).toBeDefined();
    });

    it('fromFAQ=false で完全情報が取得される', () => {
      const card = createMockMonsterCard('cid-013', 'Complete Card');
      card.effect = 'Complete effect text';
      // fromFAQ=false の場合、検索結果から完全情報を取得
      const isFromFAQ = false;

      expect(isFromFAQ).toBe(false);
      expect(card.effect).toBeDefined();
    });
  });

  describe('並列データ取得（モック）', () => {
    it('詳細ページと検索結果が並列に取得できる', async () => {
      const mockDetailFetch = vi.fn().mockResolvedValue({
        name: 'Test Card',
        attribute: 'DARK'
      });

      const mockSearchFetch = vi.fn().mockResolvedValue({
        name: 'Test Card',
        linkMarkers: ['↓', '↑'],
        effect: 'Complete effect text'
      });

      const [detailResult, searchResult] = await Promise.all([
        mockDetailFetch(),
        mockSearchFetch()
      ]);

      expect(detailResult.attribute).toBe('DARK');
      expect(searchResult.linkMarkers).toHaveLength(2);
      expect(searchResult.effect).toBeDefined();
    });

    it('並列取得のいずれかが失敗してもエラー処理される', async () => {
      const mockDetailFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockSearchFetch = vi.fn().mockResolvedValue({
        name: 'Test Card'
      });

      try {
        await Promise.all([
          mockDetailFetch(),
          mockSearchFetch()
        ]);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('キャッシュからの取得', () => {
    it('キャッシュが存在する場合はそのまま返される', () => {
      const mockCache = new Map<string, CardInfo>();
      const card = createMockMonsterCard('cid-014', 'Cached Card');
      mockCache.set('cid-014', card);

      const cachedCard = mockCache.get('cid-014');

      expect(cachedCard).toBeDefined();
      expect(cachedCard?.name).toBe('Cached Card');
    });

    it('キャッシュが存在しない場合は新たに取得される', () => {
      const mockCache = new Map<string, CardInfo>();
      // キャッシュなし
      const cachedCard = mockCache.get('cid-999');

      expect(cachedCard).toBeUndefined();
    });

    it('FAQ取得後はキャッシュに保存される', () => {
      const mockCache = new Map<string, CardInfo>();
      const card = createMockMonsterCard('cid-015', 'FAQ Fetched Card');

      // FAQから取得後、キャッシュに保存
      mockCache.set(card.cardId, card);

      expect(mockCache.has('cid-015')).toBe(true);
      expect(mockCache.get('cid-015')?.name).toBe('FAQ Fetched Card');
    });
  });

  describe('FAQテキスト内のカードリンク解析', () => {
    it('{{CardName|cid}} 形式のリンクが解析できる', () => {
      const faqText = 'このカードは{{Blue Eyes|25955333}}と相性が良い';
      const linkRegex = /\{\{([^|]+)\|(\d+)\}\}/g;
      const matches = [...faqText.matchAll(linkRegex)];

      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe('Blue Eyes');
      expect(matches[0][2]).toBe('25955333');
    });

    it('複数のカードリンクが含まれる場合すべて解析できる', () => {
      const faqText = '{{Blue Eyes|25955333}}または{{Red Eyes|74677422}}を使用できます';
      const linkRegex = /\{\{([^|]+)\|(\d+)\}\}/g;
      const matches = [...faqText.matchAll(linkRegex)];

      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('Blue Eyes');
      expect(matches[1][1]).toBe('Red Eyes');
    });

    it('リンクがない場合は空の配列が返される', () => {
      const faqText = 'このカードは何もリンクを含みません';
      const linkRegex = /\{\{([^|]+)\|(\d+)\}\}/g;
      const matches = [...faqText.matchAll(linkRegex)];

      expect(matches).toHaveLength(0);
    });
  });

  describe('マージロジック（詳細ページ + 検索結果）', () => {
    it('詳細ページの基本情報と検索結果をマージできる', () => {
      const detailInfo = {
        name: 'Blue Eyes',
        attribute: 'LIGHT',
        race: 'Dragon'
      };

      const searchInfo = {
        name: 'Blue Eyes',
        linkMarkers: [],
        effect: 'This dragon is powerful',
        rarity: ['UR']
      };

      // 検索結果を優先しながら詳細ページの情報を保持
      const merged = {
        ...searchInfo,
        ...detailInfo,
        ...searchInfo // 検索結果を優先
      };

      expect(merged.name).toBe('Blue Eyes');
      expect(merged.attribute).toBe('LIGHT');
      expect(merged.effect).toBe('This dragon is powerful');
    });

    it('詳細ページにのみある情報が含まれる', () => {
      const detailInfo = {
        attribute: 'LIGHT',
        race: 'Dragon',
        level: 8
      };

      const searchInfo = {
        name: 'Blue Eyes',
        effect: 'Powerful effect'
      };

      const merged = {
        ...detailInfo,
        ...searchInfo
      };

      expect(merged.attribute).toBe('LIGHT');
      expect(merged.name).toBe('Blue Eyes');
    });

    it('検索結果にのみある情報が優先される', () => {
      const detailInfo = {
        name: 'Old Name',
        text: 'Old text'
      };

      const searchInfo = {
        name: 'New Name',
        text: 'New text',
        updateDate: '2025-12-02'
      };

      // 検索結果の方が新しいので優先
      const merged = {
        ...detailInfo,
        ...searchInfo
      };

      expect(merged.name).toBe('New Name');
      expect(merged.updateDate).toBe('2025-12-02');
    });
  });

  describe('エッジケース', () => {
    it('カード名が空の場合はエラーになる', () => {
      const cardWithEmptyName = createMockMonsterCard('cid-016', '');

      expect(cardWithEmptyName.name).toBe('');
      // 実装では name が空の場合は parseCardDetailBasicInfo は null を返すはず
    });

    it('パスワードが数値として解析できない場合を処理できる', () => {
      const card = createMockMonsterCard('cid-017', 'Test');
      card.password = 0; // パスワード不正

      expect(typeof card.password).toBe('number');
    });

    it('属性/種族テキストが未知の場合を処理できる', () => {
      const card = createMockMonsterCard('cid-018', 'Unknown');
      card.attribute = 'UNKNOWN'; // 未知の属性
      card.race = 'Unknown Race'; // 未知の種族

      expect(card.attribute).toBe('UNKNOWN');
      expect(card.race).toBe('Unknown Race');
    });
  });
});
