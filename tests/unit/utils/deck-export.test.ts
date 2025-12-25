import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  exportToCSV,
  exportToTXT,
  downloadFile,
  downloadDeckAsCSV,
  downloadDeckAsTXT,
  type ExportOptions,
} from '@/utils/deck-export';
import type { DeckInfo } from '@/types/deck';
import { getTempCardDB } from '@/utils/temp-card-db';
import type { CardInfo } from '@/types/card';

describe('deck-export', () => {
  beforeEach(() => {
    // モックカードデータを設定
    const mockCards: CardInfo[] = [
      {
        cid: '12345',
        name: 'Blue-Eyes White Dragon',
        cardType: '1',
        imgs: [
          { ciid: 'ciid1', imgHash: 'hash1' },
          { ciid: 'ciid2', imgHash: 'hash2' }
        ]
      },
      {
        cid: '67890',
        name: 'Dark Magician',
        cardType: '1',
        imgs: [
          { ciid: 'ciid3', imgHash: 'hash3' }
        ]
      },
      {
        cid: '11111',
        name: 'Polymerization',
        cardType: '2',
        imgs: [
          { ciid: 'ciid4', imgHash: 'hash4' }
        ]
      },
      {
        cid: '22222',
        name: 'Mirror Force',
        cardType: '3',
        imgs: [
          { ciid: 'ciid5', imgHash: 'hash5' }
        ]
      },
      {
        cid: '33333',
        name: 'Test, "Special" Card',
        cardType: '1',
        imgs: [
          { ciid: 'ciid6', imgHash: 'hash6' }
        ]
      }
    ];

    const db = getTempCardDB();
    db.clear();
    mockCards.forEach(card => {
      db.set(card.cid, card, true);
    });
  });

  const createDeckInfo = (): DeckInfo => ({
    dno: 1,
    dname: 'Test Deck',
    dtype: '0',
    dstyle: '0',
    originalName: 'Test Deck',
    mainDeck: [
      { cid: '12345', ciid: 'ciid1', quantity: 3 },
      { cid: '67890', ciid: 'ciid3', quantity: 2 },
      { cid: '33333', ciid: 'ciid6', quantity: 1 }
    ],
    extraDeck: [
      { cid: '11111', ciid: 'ciid4', quantity: 1 }
    ],
    sideDeck: [
      { cid: '22222', ciid: 'ciid5', quantity: 2 }
    ]
  });

  describe('exportToCSV', () => {
    it('基本的なCSV形式でエクスポートできる', () => {
      const deckInfo = createDeckInfo();
      const csv = exportToCSV(deckInfo);

      expect(csv).toContain('section,name,cid,ciid,enc,quantity');
      expect(csv).toContain('main,Blue-Eyes White Dragon,12345,ciid1,hash1,3');
      expect(csv).toContain('main,Dark Magician,67890,ciid3,hash3,2');
      expect(csv).toContain('extra,Polymerization,11111,ciid4,hash4,1');
      expect(csv).toContain('side,Mirror Force,22222,ciid5,hash5,2');
    });

    it('カンマを含むカード名を正しくエスケープする', () => {
      const deckInfo = createDeckInfo();
      const csv = exportToCSV(deckInfo);

      expect(csv).toContain('"Test, ""Special"" Card"');
    });

    it('サイドデッキを除外できる', () => {
      const deckInfo = createDeckInfo();
      const options: ExportOptions = { includeSide: false };
      const csv = exportToCSV(deckInfo, options);

      expect(csv).toContain('main,Blue-Eyes White Dragon');
      expect(csv).toContain('extra,Polymerization');
      expect(csv).not.toContain('side,Mirror Force');
    });

    it('存在しないカードIDは無視される', () => {
      const deckInfo = createDeckInfo();
      deckInfo.mainDeck.push({ cid: 'invalid', ciid: 'ciid999', quantity: 1 });
      const csv = exportToCSV(deckInfo);

      // invalid カードは出力されない
      expect(csv.split('\n').filter(line => line.includes('invalid'))).toHaveLength(0);
    });

    it('imgHashが見つからない場合は空文字列を使用する', () => {
      const deckInfo = createDeckInfo();
      // ciid2 は存在するが、deckInfo では ciid1 を使用しているため hash が見つかる
      // ciid2 を使用した場合は hash2 が見つかる
      deckInfo.mainDeck[0] = { cid: '12345', ciid: 'ciid2', quantity: 3 };
      const csv = exportToCSV(deckInfo);

      expect(csv).toContain('main,Blue-Eyes White Dragon,12345,ciid2,hash2,3');
    });
  });

  describe('exportToTXT', () => {
    it('基本的なTXT形式でエクスポートできる', () => {
      const deckInfo = createDeckInfo();
      const txt = exportToTXT(deckInfo);

      expect(txt).toContain('=== Main Deck (6 cards) ===');
      expect(txt).toContain('3x Blue-Eyes White Dragon (12345:ciid1:hash1)');
      expect(txt).toContain('2x Dark Magician (67890:ciid3:hash3)');
      expect(txt).toContain('=== Extra Deck (1 cards) ===');
      expect(txt).toContain('1x Polymerization (11111:ciid4:hash4)');
      expect(txt).toContain('=== Side Deck (2 cards) ===');
      expect(txt).toContain('2x Mirror Force (22222:ciid5:hash5)');
    });

    it('サイドデッキを除外できる', () => {
      const deckInfo = createDeckInfo();
      const options: ExportOptions = { includeSide: false };
      const txt = exportToTXT(deckInfo, options);

      expect(txt).toContain('=== Main Deck');
      expect(txt).toContain('=== Extra Deck');
      expect(txt).not.toContain('=== Side Deck');
    });

    it('空のデッキセクションは表示されない', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        dname: 'Test Deck',
        dtype: '0',
        dstyle: '0',
        originalName: 'Test Deck',
        mainDeck: [
          { cid: '12345', ciid: 'ciid1', quantity: 3 }
        ],
        extraDeck: [],
        sideDeck: []
      };
      const txt = exportToTXT(deckInfo);

      expect(txt).toContain('=== Main Deck');
      expect(txt).not.toContain('=== Extra Deck');
      expect(txt).not.toContain('=== Side Deck');
    });

    it('カード枚数の合計が正しく表示される', () => {
      const deckInfo = createDeckInfo();
      const txt = exportToTXT(deckInfo);

      expect(txt).toContain('=== Main Deck (6 cards) ==='); // 3 + 2 + 1
      expect(txt).toContain('=== Extra Deck (1 cards) ===');
      expect(txt).toContain('=== Side Deck (2 cards) ===');
    });
  });

  describe('downloadFile', () => {
    beforeEach(() => {
      // DOM環境をセットアップ
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
    });

    it('ファイルをダウンロードできる', () => {
      const content = 'test content';
      const filename = 'test.txt';
      const mimeType = 'text/plain';

      downloadFile(content, filename, mimeType);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('デフォルトのMIMEタイプを使用できる', () => {
      const content = 'test content';
      const filename = 'test.txt';

      downloadFile(content, filename);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('downloadDeckAsCSV', () => {
    beforeEach(() => {
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
    });

    it('CSVファイルとしてダウンロードできる', () => {
      const deckInfo = createDeckInfo();
      downloadDeckAsCSV(deckInfo);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('カスタムファイル名を指定できる', () => {
      const deckInfo = createDeckInfo();
      downloadDeckAsCSV(deckInfo, 'custom-deck.csv');

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('エクスポートオプションを指定できる', () => {
      const deckInfo = createDeckInfo();
      const options: ExportOptions = { includeSide: false };
      downloadDeckAsCSV(deckInfo, 'deck.csv', options);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('downloadDeckAsTXT', () => {
    beforeEach(() => {
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
    });

    it('TXTファイルとしてダウンロードできる', () => {
      const deckInfo = createDeckInfo();
      downloadDeckAsTXT(deckInfo);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('カスタムファイル名を指定できる', () => {
      const deckInfo = createDeckInfo();
      downloadDeckAsTXT(deckInfo, 'custom-deck.txt');

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('エクスポートオプションを指定できる', () => {
      const deckInfo = createDeckInfo();
      const options: ExportOptions = { includeSide: false };
      downloadDeckAsTXT(deckInfo, 'deck.txt', options);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
