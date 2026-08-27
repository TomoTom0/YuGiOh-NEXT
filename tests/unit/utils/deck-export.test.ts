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
import type { CardInfo } from '@/types/card';

// TempCacheDBをシンプルなMapでモック
const mockCardDB = new Map<string, CardInfo>();
vi.mock('@/utils/temp-cache-db', () => ({
  getTempCacheDB: () => ({
    get: (cid: string) => mockCardDB.get(cid),
    set: (cid: string, card: CardInfo, force?: boolean) => { mockCardDB.set(cid, card); return true; },
    clear: () => mockCardDB.clear(),
  }),
  recordDeckOpen: vi.fn(),
}));

describe('deck-export', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clickSpy?.mockRestore();
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

    mockCardDB.clear();
    mockCards.forEach(card => {
      mockCardDB.set(card.cid, card);
    });
  });

  const setupDownloadSpies = () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    return { appendChildSpy, removeChildSpy, createObjectURLSpy, revokeObjectURLSpy };
  };

  const getCreatedBlob = (createObjectURLSpy: ReturnType<typeof vi.spyOn>) => {
    return createObjectURLSpy.mock.calls[0]?.[0] as Blob;
  };

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
    it('[covers:export_csv.data_row_format] [covers:export_csv.raw_name_without_special_chars] [covers:generate_rows.main_card_found] [covers:generate_rows.extra_card_found] [covers:generate_rows.side_default_included] 基本的なCSV形式でエクスポートできる', () => {
      const deckInfo = createDeckInfo();
      const csv = exportToCSV(deckInfo);

      expect(csv).toContain('section,name,cid,ciid,enc,quantity');
      expect(csv).toContain('main,Blue-Eyes White Dragon,12345,ciid1,hash1,3');
      expect(csv).toContain('main,Dark Magician,67890,ciid3,hash3,2');
      expect(csv).toContain('extra,Polymerization,11111,ciid4,hash4,1');
      expect(csv).toContain('side,Mirror Force,22222,ciid5,hash5,2');
    });

    it('[covers:export_csv.escape_name_when_special_chars] カンマとダブルクォートを含むカード名を正しくエスケープする', () => {
      const deckInfo = createDeckInfo();
      const csv = exportToCSV(deckInfo);

      expect(csv).toContain('"Test, ""Special"" Card"');
    });

    it('[covers:generate_rows.side_false_excluded] サイドデッキを除外できる', () => {
      const deckInfo = createDeckInfo();
      const options: ExportOptions = { includeSide: false };
      const csv = exportToCSV(deckInfo, options);

      expect(csv).toContain('main,Blue-Eyes White Dragon');
      expect(csv).toContain('extra,Polymerization');
      expect(csv).not.toContain('side,Mirror Force');
    });

    it('[covers:generate_rows.missing_card_skipped] 存在しないカードIDは無視される', () => {
      const deckInfo = createDeckInfo();
      deckInfo.mainDeck.push({ cid: 'invalid', ciid: 'ciid999', quantity: 1 });
      const csv = exportToCSV(deckInfo);

      // invalid カードは出力されない
      expect(csv.split('\n').filter(line => line.includes('invalid'))).toHaveLength(0);
    });

    it('[covers:generate_rows.enc_matching_img_hash] ciidに一致するimgHashを使用する', () => {
      const deckInfo = createDeckInfo();
      deckInfo.mainDeck[0] = { cid: '12345', ciid: 'ciid2', quantity: 3 };
      const csv = exportToCSV(deckInfo);

      expect(csv).toContain('main,Blue-Eyes White Dragon,12345,ciid2,hash2,3');
    });

    it('[covers:generate_rows.enc_empty_fallback] imgHashが見つからない場合は空文字列を使用する', () => {
      const deckInfo = createDeckInfo();
      deckInfo.mainDeck[0] = { cid: '12345', ciid: 'missing-ciid', quantity: 3 };
      const csv = exportToCSV(deckInfo);

      expect(csv).toContain('main,Blue-Eyes White Dragon,12345,missing-ciid,,3');
    });

    it('[covers:export_csv.escape_name_when_special_chars] 改行を含むカード名をダブルクォートで囲む', () => {
      mockCardDB.set('44444', {
        cid: '44444',
        name: 'Line\nBreak',
        cardType: '1',
        imgs: [{ ciid: 'ciid7', imgHash: 'hash7' }]
      } as any);
      const deckInfo = createDeckInfo();
      deckInfo.mainDeck = [{ cid: '44444', ciid: 'ciid7', quantity: 1 }];
      deckInfo.extraDeck = [];
      deckInfo.sideDeck = [];

      const csv = exportToCSV(deckInfo);

      expect(csv).toBe('section,name,cid,ciid,enc,quantity\nmain,"Line\nBreak",44444,ciid7,hash7,1');
    });

    it('[covers:export_csv.header_only_when_no_rows] 行が生成されない場合はヘッダーのみを返す', () => {
      const deckInfo: DeckInfo = {
        ...createDeckInfo(),
        mainDeck: [],
        extraDeck: [],
        sideDeck: []
      };

      expect(exportToCSV(deckInfo)).toBe('section,name,cid,ciid,enc,quantity');
    });
  });

  describe('exportToTXT', () => {
    it('[covers:export_txt.main_section_present] [covers:export_txt.extra_section_present] [covers:export_txt.side_section_present] 基本的なTXT形式でエクスポートできる', () => {
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

    it('[covers:export_txt.side_section_absent] サイドデッキを除外できる', () => {
      const deckInfo = createDeckInfo();
      const options: ExportOptions = { includeSide: false };
      const txt = exportToTXT(deckInfo, options);

      expect(txt).toContain('=== Main Deck');
      expect(txt).toContain('=== Extra Deck');
      expect(txt).not.toContain('=== Side Deck');
    });

    it('[covers:export_txt.extra_section_absent] [covers:export_txt.side_section_absent] 空のデッキセクションは表示されない', () => {
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

    it('[covers:export_txt.main_section_present] [covers:export_txt.extra_section_present] [covers:export_txt.side_section_present] カード枚数の合計が正しく表示される', () => {
      const deckInfo = createDeckInfo();
      const txt = exportToTXT(deckInfo);

      expect(txt).toContain('=== Main Deck (6 cards) ==='); // 3 + 2 + 1
      expect(txt).toContain('=== Extra Deck (1 cards) ===');
      expect(txt).toContain('=== Side Deck (2 cards) ===');
    });

    it('[covers:export_txt.empty_returns_empty_string] [covers:export_txt.main_section_absent] 全セクションが空なら空文字列を返す', () => {
      const deckInfo: DeckInfo = {
        ...createDeckInfo(),
        mainDeck: [],
        extraDeck: [],
        sideDeck: []
      };

      expect(exportToTXT(deckInfo)).toBe('');
    });
  });

  describe('downloadFile', () => {
    it('[covers:download_file.custom_mime_and_filename] [covers:download_file.append_click_remove_revoke] ファイルをダウンロードできる', async () => {
      const { appendChildSpy, removeChildSpy, createObjectURLSpy, revokeObjectURLSpy } = setupDownloadSpies();
      const content = 'test content';
      const filename = 'test.txt';
      const mimeType = 'text/plain';

      downloadFile(content, filename, mimeType);

      const blob = getCreatedBlob(createObjectURLSpy);
      const link = appendChildSpy.mock.calls[0]?.[0] as HTMLAnchorElement;

      expect(await blob.text()).toBe(content);
      expect(blob.type).toBe('text/plain;charset=utf-8');
      expect(link.download).toBe(filename);
      expect(link.href).toBe('blob:mock-url');
      expect(appendChildSpy).toHaveBeenCalledWith(link);
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(link);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('[covers:download_file.default_mime] デフォルトのMIMEタイプを使用できる', () => {
      const { createObjectURLSpy } = setupDownloadSpies();
      const content = 'test content';
      const filename = 'test.txt';

      downloadFile(content, filename);

      expect(getCreatedBlob(createObjectURLSpy).type).toBe('text/plain;charset=utf-8');
    });
  });

  describe('downloadDeckAsCSV', () => {
    it('[covers:download_deck_csv.default_filename] CSVファイルとしてダウンロードできる', async () => {
      const { appendChildSpy, createObjectURLSpy } = setupDownloadSpies();
      const deckInfo = createDeckInfo();
      downloadDeckAsCSV(deckInfo);

      const blob = getCreatedBlob(createObjectURLSpy);
      const link = appendChildSpy.mock.calls[0]?.[0] as HTMLAnchorElement;
      expect(blob.type).toBe('text/csv;charset=utf-8');
      expect(await blob.text()).toContain('section,name,cid,ciid,enc,quantity');
      expect(link.download).toBe('deck.csv');
    });

    it('[covers:download_deck_csv.custom_filename_and_options] カスタムファイル名とエクスポートオプションを指定できる', async () => {
      const { appendChildSpy, createObjectURLSpy } = setupDownloadSpies();
      const deckInfo = createDeckInfo();
      const options: ExportOptions = { includeSide: false };
      downloadDeckAsCSV(deckInfo, 'custom-deck.csv', options);

      const blobText = await getCreatedBlob(createObjectURLSpy).text();
      const link = appendChildSpy.mock.calls[0]?.[0] as HTMLAnchorElement;
      expect(link.download).toBe('custom-deck.csv');
      expect(blobText).not.toContain('side,Mirror Force');
    });
  });

  describe('downloadDeckAsTXT', () => {
    it('[covers:download_deck_txt.default_filename] TXTファイルとしてダウンロードできる', async () => {
      const { appendChildSpy, createObjectURLSpy } = setupDownloadSpies();
      const deckInfo = createDeckInfo();
      downloadDeckAsTXT(deckInfo);

      const blob = getCreatedBlob(createObjectURLSpy);
      const link = appendChildSpy.mock.calls[0]?.[0] as HTMLAnchorElement;
      expect(blob.type).toBe('text/plain;charset=utf-8');
      expect(await blob.text()).toContain('=== Main Deck (6 cards) ===');
      expect(link.download).toBe('deck.txt');
    });

    it('[covers:download_deck_txt.custom_filename_and_options] カスタムファイル名とエクスポートオプションを指定できる', async () => {
      const { appendChildSpy, createObjectURLSpy } = setupDownloadSpies();
      const deckInfo = createDeckInfo();
      const options: ExportOptions = { includeSide: false };
      downloadDeckAsTXT(deckInfo, 'custom-deck.txt', options);

      const blobText = await getCreatedBlob(createObjectURLSpy).text();
      const link = appendChildSpy.mock.calls[0]?.[0] as HTMLAnchorElement;
      expect(link.download).toBe('custom-deck.txt');
      expect(blobText).not.toContain('=== Side Deck');
    });
  });
});
