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
    vi.clearAllMocks();
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'FileReader', {
      value: originalFileReader,
      configurable: true,
      writable: true
    });
  });

  describe('importFromCSV', () => {
    it('should import valid CSV with all fields [covers:import_csv.header_detected] [covers:convert_rows.section_classification] [covers:convert_rows.deck_info_fixed_defaults] [covers:convert_rows.enc_absent_empty_imgs] [covers:convert_rows.temp_cache_registration]', () => {
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

    it('should import CSV without name column [covers:parse_import_row.fields4_numeric_is_cid_ciid]', () => {
      const csv = csvNoName;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
    });

    it('should return error for empty CSV [covers:import_csv.all_rows_invalid_error]', () => {
      const csv = emptyCSV;
      const result = importFromCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle CSV without header [covers:import_csv.header_absent]', () => {
      const csv = 'main,灰流うらら,12950,1,2\nextra,PSYフレームロード・Λ,9753,1,1';
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
    });

    it('should skip invalid lines and add warnings [covers:import_csv.success_with_warnings] [covers:import_csv.row_null_skip] [covers:parse_import_row.invalid_section]', () => {
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

    it('should handle quoted fields with commas [covers:parse_csv_line.quote_toggle] [covers:parse_csv_line.comma_outside_quotes_splits_field] [covers:parse_csv_line.other_chars_accumulate] [covers:parse_import_row.fields5_non_numeric_is_name_cid_ciid]', () => {
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

    it('should skip empty CSV data lines without warnings [covers:import_csv.empty_line_skipped]', () => {
      const csv = `section,cid,quantity

main,12950,2

extra,9753,1`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeUndefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
    });

    it('should parse section,name,cid,quantity form [covers:parse_import_row.fields4_non_numeric_is_name_cid]', () => {
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

    it('should parse section,cid,ciid,enc,quantity form [covers:parse_import_row.fields5_numeric_is_cid_ciid_enc] [covers:convert_rows.enc_present_sets_imgs]', () => {
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

    it('should parse full form and ignore extra columns [covers:parse_import_row.fields6plus_full_form]', () => {
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

    it('should reject non-numeric ciid [covers:parse_import_row.ciid_non_numeric_invalid]', () => {
      const csv = `section,name,cid,ciid,quantity
main,Invalid CIID,12950,abc,2`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toBe('インポート可能なデータがありません');
      expect(result.warnings).toBeUndefined();
    });

    it('should create placeholder card values and fallback names [covers:convert_rows.fake_card_placeholder_values] [covers:convert_rows.name_fallback_when_missing]', () => {
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

    it('should validate section values [covers:parse_import_row.invalid_section]', () => {
      const csv = `section,name,cid,ciid,quantity
invalid,灰流うらら,12950,1,2`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toBe('インポート可能なデータがありません');
    });
  });

  describe('importFromTXT', () => {
    it('should import valid TXT format [covers:import_txt.match_old_no_enc] [covers:import_txt.section_header_switches_current_section]', () => {
      const txt = validTXT;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
      expect(result.deckInfo!.sideDeck).toHaveLength(1);
    });

    it('should handle TXT with enc field [covers:import_txt.match_with_enc]', () => {
      const txt = `=== Main Deck ===
2x 灰流うらら (12950:1:abc123)

=== Extra Deck ===
1x PSYフレームロード・Λ (9753:1:xyz789)`;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
    });

    it('should return error for empty TXT [covers:import_txt.all_rows_invalid_error]', () => {
      const txt = '';
      const result = importFromTXT(txt);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should skip invalid lines and add warnings [covers:import_txt.no_match_with_section_warning] [covers:import_txt.success_with_warnings]', () => {
      const txt = `=== Main Deck ===
2x 灰流うらら (12950:1)
invalid line format
1x 増殖するG (4861:2)`;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should handle empty lines [covers:import_txt.empty_line_skipped]', () => {
      const txt = `=== Main Deck ===

2x 灰流うらら (12950:1)


1x 増殖するG (4861:2)

=== Extra Deck ===`;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
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

    it('should import deck info from PNG with embedded data [covers:import_png.rows_from_sections] [covers:import_png.success_no_warnings_field]', async () => {
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

    it('should return error for PNG without embedded data [covers:import_png.extract_fail]', async () => {
      const file = new File([validPNG], 'deck.png', { type: 'image/png' });

      const result = await importFromPNG(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('デッキ情報を抽出できませんでした');
    });

    it('should handle invalid PNG file [covers:import_png.extract_fail]', async () => {
      const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const file = new File([invalidBuffer], 'invalid.png', { type: 'image/png' });

      const result = await importFromPNG(file);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty deck in PNG [covers:import_png.all_sections_empty_error]', async () => {
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

    it('should validate card ID format [covers:parse_import_row.cid_non_numeric_invalid]', () => {
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

    it('should reject invalid quantity - zero [covers:parse_import_row.quantity_below_1_invalid]', () => {
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

    it('should reject invalid quantity - over 99 [covers:parse_import_row.quantity_over_99_invalid]', () => {
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,100`;
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('インポート可能なデータがありません');
    });
  });

  describe('importDeckFromFile', () => {
    it('拡張子.pngの場合はimportFromPNGに委譲される [covers:import_file.ext_png_delegates]', async () => {
      // PNG形式でないバイト列を渡し、importFromPNG固有のエラーメッセージが返ることで委譲を確認する
      const file = new File([new Uint8Array([0x00, 0x01])], 'deck.png', { type: 'image/png' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('デッキ情報を抽出できませんでした');
    });

    it('拡張子.csvの場合はテキストとして読み込みimportFromCSVに委譲される [covers:import_file.ext_csv_reads_then_delegates] [covers:read_file_as_text.success]', async () => {
      const csvContent = 'main,12950,2';
      const file = new File([csvContent], 'deck.csv', { type: 'text/csv' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.mainDeck[0]?.cid).toBe('12950');
    });

    it('拡張子.txtの場合はテキストとして読み込みimportFromTXTに委譲される [covers:import_file.ext_txt_reads_then_delegates]', async () => {
      const txtContent = '=== Main Deck ===\n2x 灰流うらら (12950:1)';
      const file = new File([txtContent], 'deck.txt', { type: 'text/plain' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.mainDeck[0]?.cid).toBe('12950');
    });

    it('拡張子が無く内容の1行目に"section"を含む場合はCSVとして処理される [covers:import_file.ext_unknown_content_has_section]', async () => {
      const csvContent = 'section,cid,quantity\nmain,12950,2';
      const file = new File([csvContent], 'deck', { type: '' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
    });

    it('拡張子が無く内容の1行目に"==="を含む場合はTXTとして処理される [covers:import_file.ext_unknown_content_has_marker]', async () => {
      const txtContent = '=== Main Deck ===\n2x 灰流うらら (12950:1)';
      const file = new File([txtContent], 'deck', { type: '' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
    });

    it('拡張子が無く内容がCSV/TXTいずれの形式にも合致しない場合はサポート外エラーを返す [covers:import_file.ext_unknown_content_unsupported]', async () => {
      const file = new File(['random garbage content'], 'deck', { type: '' });
      const result = await importDeckFromFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('サポートされていないファイル形式です（.csv、.txt、または .png を使用してください）');
    });

    it('FileReader onloadでresultがfalsyならファイル読み込みエラーを返す [covers:read_file_as_text.onload_no_result_rejects] [covers:import_file.catch_error]', async () => {
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

    it('FileReader onerrorならreader.errorでファイル読み込みエラーを返す [covers:read_file_as_text.onerror_rejects] [covers:import_file.catch_error]', async () => {
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
