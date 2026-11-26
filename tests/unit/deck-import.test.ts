import { afterEach, describe, it, expect, vi } from 'vitest';
// import { readFileSync } from 'fs';
// import * as path from 'path';
import { importFromCSV, importFromTXT, importFromPNG, importDeckFromFile } from '@/utils/deck-import';
import type { ImportResult } from '@/utils/deck-import';
import { embedDeckInfoToPNG } from '@/utils/png-metadata';
import type { DeckInfo } from '@/types/deck';

const { mockTempCacheSet, mockTempCacheGet } = vi.hoisted(() => ({
  mockTempCacheSet: vi.fn(() => true),
  mockTempCacheGet: vi.fn(() => undefined)
}));

vi.mock('@/utils/temp-cache-db', () => ({
  getTempCacheDB: () => ({
    get: mockTempCacheGet,
    set: mockTempCacheSet
  })
}));

const originalFileReader = globalThis.FileReader;

// テストフィクスチャディレクトリ（未使用）
// const fixturesDir = path.join(__dirname, '../fixtures');

// Test fixtures (inline data because happy-dom doesn't support fs module)
const validCSV = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,2
main,増殖するG,4861,2,1
extra,PSYフレームロード・Λ,9753,1,1
side,屋敷わらし,14558,1,3`;

const csvNoName = `section,cid,ciid,quantity
main,12950,1,2
extra,9753,1,1`;

const emptyCSV = `section,name,cid,ciid,quantity`;

const validTXT = `=== Main Deck ===
2x 灰流うらら (12950:1)
1x 増殖するG (4861:2)

=== Extra Deck ===
1x PSYフレームロード・Λ (9753:1)

=== Side Deck ===
3x 屋敷わらし (14558:1)`;

// English card names test
const validTXTEnglish = `=== Main Deck ===
2x Dark Grepher (12950:1)
1x Dimensional Eatos (4861:2)

=== Extra Deck ===
1x PSY-Framegear Λ (9753:1)

=== Side Deck ===
3x Ghost Belle & Haunted Mansion (14558:1)`;

describe('deck-import', () => {
  afterEach(() => {
    // vitest 4+ は restoreAllMocks が vi.fn の実装を復元しないため、
    // mockImplementation のテスト間リークを防ぐには resetAllMocks が必要
    vi.resetAllMocks();
    Object.defineProperty(globalThis, 'FileReader', {
      value: originalFileReader,
      configurable: true,
      writable: true
    });
  });

  describe('importFromCSV', () => {
    it('should import valid CSV with all fields [covers:import-csv.header-detected] [covers:convert-rows.section-classification] [covers:convert-rows.deck-info-fixed-defaults] [covers:convert-rows.enc-absent-empty-imgs] [covers:convert-rows.temp-cache-registration]', () => {
      const csv = validCSV;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
      expect(result.deckInfo!.sideDeck).toHaveLength(1);

      const firstMain = result.deckInfo!.mainDeck[0];
      expect(firstMain.cid).toBe('12950');
      expect(firstMain.ciid).toBe('1');
      expect(firstMain.quantity).toBe(2);
      expect(result.deckInfo!.dno).toBe(0);
      expect(result.deckInfo!.name).toBe('');
      expect(result.deckInfo!.category).toEqual([]);
      expect(result.deckInfo!.tags).toEqual([]);
      expect(result.deckInfo!.comment).toBe('');
      expect(result.deckInfo!.deckCode).toBe('');
      expect(mockTempCacheSet).toHaveBeenCalledWith(
        '12950',
        expect.objectContaining({
          imgs: []
        })
      );
    });

    it('【TASK-355】同cidでイラスト違い(ciid違い)の複数行をインポートした場合、imgsがciid単位でマージされる', () => {
      const mockCardCache = new Map();
      // 実際のUnifiedCacheDB.setCardInfoFullはforceUpdate未指定かつ既存エントリがTTL内の場合
      // 書き込みをスキップするため、その挙動を再現する（forceUpdate漏れを検出するため）
      mockTempCacheSet.mockImplementation(
        (cid: string, card: { imgs: Array<{ ciid: string }> }, forceUpdate = false) => {
          if (mockCardCache.has(cid) && !forceUpdate) {
            return false;
          }
          mockCardCache.set(cid, card);
          return true;
        }
      );
      mockTempCacheGet.mockImplementation((cid: string) => mockCardCache.get(cid));

      const csv = [
        'section,name,cid,ciid,enc,quantity',
        'main,イラスト違いカード,5555,1,5555_1_1_1,1',
        'main,イラスト違いカード,5555,2,5555_2_1_1,2'
      ].join('\n');

      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
      // ciid違いは別エントリとして保持
      expect(result.deckInfo!.mainDeck.map(dc => `${dc.cid}:${dc.ciid}`)).toEqual(['5555:1', '5555:2']);

      // TempCacheDB の当該cidエントリは両ciidのimgsを持つ（後勝ち上書きされない）
      const cached = mockCardCache.get('5555');
      expect(cached).toBeDefined();
      expect(cached.imgs.map(img => img.ciid).sort()).toEqual(['1', '2']);
    });

    it('should import CSV without name column [covers:parse-import-row.fields4-numeric-is-cid-ciid]', () => {
      const csv = csvNoName;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
    });

    it('should return error for empty CSV [covers:import-csv.all-rows-invalid-error]', () => {
      const csv = emptyCSV;
      const result = importFromCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle CSV without header [covers:import-csv.header-absent]', () => {
      const csv = 'main,灰流うらら,12950,1,2\nextra,PSYフレームロード・Λ,9753,1,1';
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
    });

    it('ヘッダーの列が並び替えられていても正しくインポートできる（TASK-412: Exportのカラム並び替え機能との整合性）', () => {
      const csv = `name,section,quantity,cid,ciid
灰流うらら,main,2,12950,1
PSYフレームロード・Λ,extra,1,9753,1`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck).toEqual([
        expect.objectContaining({ cid: '12950', ciid: '1', quantity: 2 })
      ]);
      expect(result.deckInfo!.extraDeck).toEqual([
        expect.objectContaining({ cid: '9753', ciid: '1', quantity: 1 })
      ]);
    });

    it('ヘッダーの列が間引かれていても（enc省略）正しくインポートできる（TASK-412）', () => {
      const csv = `section,name,cid,quantity
main,灰流うらら,12950,2`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck[0]).toEqual(
        expect.objectContaining({ cid: '12950', ciid: '1', quantity: 2 })
      );
    });

    it('ヘッダーに必須列(cid)が欠けている場合はエラーになる（TASK-412）', () => {
      const csv = `section,name,quantity
main,灰流うらら,2`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toContain('必須列');
    });

    it('should skip invalid lines and add warnings [covers:import-csv.success-with-warnings] [covers:import-csv.row-null-skip] [covers:parse-import-row.invalid-section]', () => {
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,2
invalid,line,here
extra,PSYフレームロード・Λ,9753,1,1`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
    });

    it('should handle quoted fields with commas [covers:parse-csv-line.quote-toggle] [covers:parse-csv-line.comma-outside-quotes-splits-field] [covers:parse-csv-line.other-chars-accumulate] [covers:parse-import-row.fields5-non-numeric-is-name-cid-ciid]', () => {
      const csv = `section,name,cid,ciid,quantity
main,"Card, Name",12950,1,2`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck[0].cid).toBe('12950');
      expect(mockTempCacheSet).toHaveBeenCalledWith(
        '12950',
        expect.objectContaining({
          name: 'Card, Name',
          cardId: '12950',
          ciid: '1'
        })
      );
    });

    it('should skip empty CSV data lines without warnings [covers:import-csv.empty-line-skipped]', () => {
      const csv = `section,cid,quantity

main,12950,2

extra,9753,1`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeUndefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
    });

    it('should parse section,name,cid,quantity form [covers:parse-import-row.fields4-non-numeric-is-name-cid]', () => {
      const csv = `section,name,cid,quantity
main,Named Card,12950,2`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck[0]).toMatchObject({
        cid: '12950',
        ciid: '1',
        quantity: 2
      });
      expect(mockTempCacheSet).toHaveBeenCalledWith(
        '12950',
        expect.objectContaining({
          name: 'Named Card'
        })
      );
    });

    it('should parse section,cid,ciid,enc,quantity form [covers:parse-import-row.fields5-numeric-is-cid-ciid-enc] [covers:convert-rows.enc-present-sets-imgs]', () => {
      const csv = `section,cid,ciid,enc,quantity
main,12950,2,abc123,3`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck[0]).toMatchObject({
        cid: '12950',
        ciid: '2',
        quantity: 3
      });
      expect(mockTempCacheSet).toHaveBeenCalledWith(
        '12950',
        expect.objectContaining({
          imgs: [{ ciid: '2', imgHash: 'abc123' }]
        })
      );
    });

    it('should parse full form and ignore extra columns [covers:parse-import-row.fields6plus-full-form]', () => {
      const csv = `section,name,cid,ciid,enc,quantity,unused
side,Full Form Card,12950,3,hash999,4,ignored`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.sideDeck[0]).toMatchObject({
        cid: '12950',
        ciid: '3',
        quantity: 4
      });
      expect(mockTempCacheSet).toHaveBeenCalledWith(
        '12950',
        expect.objectContaining({
          name: 'Full Form Card',
          imgs: [{ ciid: '3', imgHash: 'hash999' }]
        })
      );
    });

    it('should reject non-numeric ciid [covers:parse-import-row.ciid-non-numeric-invalid]', () => {
      const csv = `section,name,cid,ciid,quantity
main,Invalid CIID,12950,abc,2`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toBe('インポート可能なデータがありません');
      expect(result.warnings).toBeUndefined();
    });

    it('should create placeholder card values and fallback names [covers:convert-rows.fake-card-placeholder-values] [covers:convert-rows.name-fallback-when-missing]', () => {
      const csv = `section,cid,quantity
main,12950,2`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(mockTempCacheSet).toHaveBeenCalledWith(
        '12950',
        expect.objectContaining({
          cardType: 'monster',
          attribute: 'light',
          levelType: 'level',
          levelValue: 0,
          types: [],
          race: 'warrior',
          atk: 0,
          def: 0,
          cardId: '12950',
          ciid: '1',
          name: 'Card 12950',
          imageUrl: '',
          effect: '',
          isExtraDeck: false
        })
      );
    });

    it('should validate section values [covers:parse-import-row.invalid-section]', () => {
      const csv = `section,name,cid,ciid,quantity
invalid,灰流うらら,12950,1,2`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toBe('インポート可能なデータがありません');
    });

    it('不正なCSV入力でもcatch節のエラーにはならない [covers:import-csv.catch-error]', () => {
      // この条件はverified=false（検証不能）のため、その前提を固定する:
      // parseCSVLineはパース失敗時にnullを返し、行単位の異常は警告として処理されるため、
      // 文字列入力の範囲では内側の処理が例外を投げず、外側のcatchには到達しない
      const malformedInputs = [
        '',
        '   ',
        '"閉じていないクォート,main,12950,1,2',
        'section,name,cid,ciid,quantity',
        'section,name,cid,ciid,quantity\nmain,灰流うらら,not-a-number,xyz,abc',
        ',,,,\n,,,,',
        'main,灰流うらら,12950,1,2\n"a""b",x,y,z,w'
      ];
      for (const input of malformedInputs) {
        const result = importFromCSV(input);
        expect(result.error ?? '').not.toContain('CSV読み込みエラー');
      }
    });
  });

  describe('importFromTXT', () => {
    it('should import valid TXT format [covers:import-txt.match-old-no-enc] [covers:import-txt.section-header-switches-current-section]', () => {
      const txt = validTXT;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
      expect(result.deckInfo!.sideDeck).toHaveLength(1);
    });

    it('should handle TXT with enc field [covers:import-txt.match-with-enc]', () => {
      const txt = `=== Main Deck ===
2x 灰流うらら (12950:1:abc123)

=== Extra Deck ===
1x PSYフレームロード・Λ (9753:1:xyz789)`;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
    });

    it('should treat an empty enc as absent and register the card with empty imgs [covers:import-txt.match-with-empty-enc]', () => {
      // エクスポート側は imgHash を取得できないカードに enc を空で書き出す
      // (deck-export の generate_rows.enc_empty_fallback)
      const txt = `=== Main Deck ===
2x 灰流うらら (12950:1:)`;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeUndefined();
      expect(result.deckInfo!.mainDeck[0]).toMatchObject({
        cid: '12950',
        ciid: '1',
        quantity: 2
      });
      // enc 未設定として扱うため、プレースホルダの imgs は空になる（convert-rows.enc-absent-empty-imgs と同じ）
      expect(mockTempCacheSet).toHaveBeenCalledWith(
        '12950',
        expect.objectContaining({
          imgs: []
        })
      );
    });

    it('should return error for empty TXT [covers:import-txt.all-rows-invalid-error]', () => {
      const txt = '';
      const result = importFromTXT(txt);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should skip invalid lines and add warnings [covers:import-txt.no-match-with-section-warning] [covers:import-txt.success-with-warnings]', () => {
      const txt = `=== Main Deck ===
2x 灰流うらら (12950:1)
invalid line format
1x 増殖するG (4861:2)`;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should handle empty lines [covers:import-txt.empty-line-skipped]', () => {
      const txt = `=== Main Deck ===

2x 灰流うらら (12950:1)


1x 増殖するG (4861:2)

=== Extra Deck ===`;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
    });

    it('不正なTXT入力でもcatch節のエラーにはならない [covers:import-txt.catch-error]', () => {
      // この条件はverified=false（検証不能）のため、その前提を固定する:
      // 行のパースは正規表現マッチの成否で処理され、不一致行は警告として処理されるため、
      // 文字列入力の範囲では内側の処理が例外を投げず、外側のcatchには到達しない
      const malformedInputs = [
        '',
        '   ',
        '=== Main Deck ===',
        '=== Main Deck ===\n行の形式が全く違う',
        '=== Main Deck ===\n2x 灰流うらら (abc:def)',
        '2x 灰流うらら (12950:1)',
        '=== Side Deck ===\n0x 増殖するG (4861:2:enc!)'
      ];
      for (const input of malformedInputs) {
        const result = importFromTXT(input);
        expect(result.error ?? '').not.toContain('TXT読み込みエラー');
      }
    });
  });

  describe('importFromPNG', () => {
    // 最小限の有効な1x1 PNG画像
    const validPNG = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
      0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00,
      0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);

    it('should import deck info from PNG with embedded data [covers:import-png.rows-from-sections] [covers:import-png.success-no-warnings-field]', async () => {
      // サンプルデッキ情報
      const sampleDeck: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [{ cid: '12950', ciid: '1', quantity: 2 }],
        extraDeck: [{ cid: '9753', ciid: '1', quantity: 1 }],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      // PNG画像にデッキ情報を埋め込む
      const pngBlob = new Blob([validPNG], { type: 'image/png' });
      const embeddedBlob = await embedDeckInfoToPNG(pngBlob, sampleDeck);

      // Fileオブジェクトを作成
      const file = new File([embeddedBlob], 'deck.png', { type: 'image/png' });

      // インポート
      const result = await importFromPNG(file);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
      expect(result.deckInfo!.mainDeck[0].cid).toBe('12950');
    });

    it('should return error for PNG without embedded data [covers:import-png.extract-fail]', async () => {
      const file = new File([validPNG], 'deck.png', { type: 'image/png' });

      const result = await importFromPNG(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('デッキ情報を抽出できませんでした');
    });

    it('should handle invalid PNG file [covers:import-png.extract-fail]', async () => {
      const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const file = new File([invalidBuffer], 'invalid.png', { type: 'image/png' });

      const result = await importFromPNG(file);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty deck in PNG [covers:import-png.all-sections-empty-error]', async () => {
      const emptyDeck: DeckInfo = {
        dno: 1,
        name: 'Empty',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const pngBlob = new Blob([validPNG], { type: 'image/png' });
      const embeddedBlob = await embedDeckInfoToPNG(pngBlob, emptyDeck);

      const file = new File([embeddedBlob], 'empty-deck.png', { type: 'image/png' });

      const result = await importFromPNG(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('インポート可能なデータがありません');
    });

    it('PNGでないファイルでもcatch節のエラーにはならない [covers:import-png.catch-error]', async () => {
      // この条件はverified=false（検証不能）のため、その前提を固定する:
      // extractDeckInfoFromPNGはシグネチャ不一致等の異常を自身のcatchで処理してnullを返すため、
      // importFromPNG側のcatchには到達せず、抽出失敗として処理される
      const notPng = new File([new Uint8Array([0x00, 0x01, 0x02, 0x03])], 'not-png.png', {
        type: 'image/png'
      });
      const result = await importFromPNG(notPng);

      expect(result.success).toBe(false);
      expect(result.error).toContain('PNG画像からデッキ情報を抽出できませんでした');
      expect(result.error ?? '').not.toContain('PNG読み込みエラー');
    });
  });

  describe('format detection and validation', () => {
    it('should handle Rush Duel format markers', () => {
      // Rush Duel detection logic would go here
      // Currently not implemented in deck-import.ts
      const csv = `section,name,cid,ciid,quantity
main,セブンスロード・マジシャン,15259,1,3`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
    });

    it('should validate card ID format [covers:parse-import-row.cid-non-numeric-invalid]', () => {
      const csv = `section,name,cid,ciid,quantity
main,Test Card,invalid_id,1,2`;
      const result = importFromCSV(csv);

      // Should handle gracefully or produce warnings
      expect(result.success).toBe(false);
    });

    it('should validate quantity range - allow up to 3 for normal cards', () => {
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,3`;
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.mainDeck[0]?.quantity).toBe(3);
    });

    it('should allow quantity over 3 with warning (intentional for special formats)', () => {
      // Note: 通常カードは3枚制限だが、インポート時は99枚まで許容（デッキチェックは別処理）
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,10`;
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck[0]?.quantity).toBe(10);
      // Note: 枚数制限チェックは card-limit.ts で別途実施される
    });

    it('should reject invalid quantity - zero [covers:parse-import-row.quantity-below-1-invalid]', () => {
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,0`;
      const result = importFromCSV(csv);
      
      // Invalid quantity causes row to be skipped, resulting in "no importable data"
      expect(result.success).toBe(false);
      expect(result.error).toContain('インポート可能なデータがありません');
    });

    it('should reject invalid quantity - negative', () => {
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,-1`;
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('インポート可能なデータがありません');
    });

    it('should reject invalid quantity - over 99 [covers:parse-import-row.quantity-over-99-invalid]', () => {
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,100`;
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('インポート可能なデータがありません');
    });
  });

  describe('importDeckFromFile', () => {
    it('拡張子.pngの場合はimportFromPNGに委譲される [covers:import-file.ext-png-delegates]', async () => {
      // PNG形式でないバイト列を渡し、importFromPNG固有のエラーメッセージが返ることで委譲を確認する
      const file = new File([new Uint8Array([0x00, 0x01])], 'deck.png', { type: 'image/png' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('デッキ情報を抽出できませんでした');
    });

    it('拡張子.csvの場合はテキストとして読み込みimportFromCSVに委譲される [covers:import-file.ext-csv-reads-then-delegates] [covers:read-file-as-text.success]', async () => {
      const csvContent = 'main,12950,2';
      const file = new File([csvContent], 'deck.csv', { type: 'text/csv' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.mainDeck[0]?.cid).toBe('12950');
    });

    it('拡張子.txtの場合はテキストとして読み込みimportFromTXTに委譲される [covers:import-file.ext-txt-reads-then-delegates]', async () => {
      const txtContent = '=== Main Deck ===\n2x 灰流うらら (12950:1)';
      const file = new File([txtContent], 'deck.txt', { type: 'text/plain' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.mainDeck[0]?.cid).toBe('12950');
    });

    it('拡張子が無く内容の1行目に"section"を含む場合はCSVとして処理される [covers:import-file.ext-unknown-content-has-section]', async () => {
      const csvContent = 'section,cid,quantity\nmain,12950,2';
      const file = new File([csvContent], 'deck', { type: '' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
    });

    it('拡張子が無く内容の1行目に"==="を含む場合はTXTとして処理される [covers:import-file.ext-unknown-content-has-marker]', async () => {
      const txtContent = '=== Main Deck ===\n2x 灰流うらら (12950:1)';
      const file = new File([txtContent], 'deck', { type: '' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
    });

    it('拡張子が無く内容がCSV/TXTいずれの形式にも合致しない場合はサポート外エラーを返す [covers:import-file.ext-unknown-content-unsupported]', async () => {
      const file = new File(['random garbage content'], 'deck', { type: '' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('サポートされていないファイル形式です（.csv、.txt、または .png を使用してください）');
    });

    it('FileReader onloadでresultがfalsyならファイル読み込みエラーを返す [covers:read-file-as-text.onload-no-result-rejects] [covers:import-file.catch-error]', async () => {
      class NoResultFileReader {
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        onerror: (() => void) | null = null;
        error: DOMException | null = null;

        readAsText(): void {
          this.onload?.({ target: { result: null } } as unknown as ProgressEvent<FileReader>);
        }
      }

      Object.defineProperty(globalThis, 'FileReader', {
        value: NoResultFileReader,
        configurable: true,
        writable: true
      });

      const file = new File(['main,12950,2'], 'deck.csv', { type: 'text/csv' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ファイル読み込みエラー: Error: ファイルの読み込みに失敗しました');
    });

    it('FileReader onerrorならreader.errorでファイル読み込みエラーを返す [covers:read-file-as-text.onerror-rejects] [covers:import-file.catch-error]', async () => {
      const readError = new DOMException('stub read failure', 'NotReadableError');

      class ErrorFileReader {
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        onerror: (() => void) | null = null;
        error: DOMException | null = readError;

        readAsText(): void {
          this.onerror?.();
        }
      }

      Object.defineProperty(globalThis, 'FileReader', {
        value: ErrorFileReader,
        configurable: true,
        writable: true
      });

      const file = new File(['main,12950,2'], 'deck.csv', { type: 'text/csv' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ファイル読み込みエラー: NotReadableError: stub read failure');
    });
  });
});
