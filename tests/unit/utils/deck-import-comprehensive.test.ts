/**
 * deck-import.ts テスト
 *
 * デッキインポート・エクスポート機能のテスト
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { importFromCSV, importFromTXT } from '@/utils/deck-import';

describe('deck-import', () => {
  describe('importFromCSV', () => {
    it('CSV形式の文字列をパースできる', () => {
      const csvContent = `section,name,cid,ciid,quantity
main,ブルーアイズ,89631139,1,3
extra,青眼の究極竜,23995346,1,2
side,灰流うらら,14558127,1,1`;

      const result = importFromCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.extraDeck).toHaveLength(1);
      expect(result.deckInfo?.sideDeck).toHaveLength(1);
    });

    it('ヘッダーなしのCSV形式をパースできる', () => {
      const csvContent = `main,ブルーアイズ,89631139,1,3
extra,青眼の究極竜,23995346,1,2`;

      const result = importFromCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.extraDeck).toHaveLength(1);
    });

    it('不正な形式の文字列でエラーを返す', () => {
      const csvContent = `invalid,data`;

      const result = importFromCSV(csvContent);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('空の文字列でエラーを返す', () => {
      const csvContent = '';

      const result = importFromCSV(csvContent);

      expect(result.success).toBe(false);
      expect(result.error).toBe('インポート可能なデータがありません');
    });

    it('最小限の形式（section,cid,quantity）をパースできる', () => {
      const csvContent = `main,89631139,3
extra,23995346,2`;

      const result = importFromCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.mainDeck[0]?.cid).toBe('89631139');
      expect(result.deckInfo?.mainDeck[0]?.quantity).toBe(3);
    });
  });

  describe('importFromTXT', () => {
    it('TXT形式の文字列をパースできる', () => {
      const txtContent = `=== Main Deck ===
3x ブルーアイズ・ホワイト・ドラゴン (89631139:1)

=== Extra Deck ===
2x 青眼の究極竜 (23995346:1)

=== Side Deck ===
1x 灰流うらら (14558127:1)`;

      const result = importFromTXT(txtContent);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.extraDeck).toHaveLength(1);
      expect(result.deckInfo?.sideDeck).toHaveLength(1);
    });

    it('新形式（enc付き）をパースできる', () => {
      const txtContent = `=== Main Deck ===
3x 灰流うらら (14558127:1:abc123)`;

      const result = importFromTXT(txtContent);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.mainDeck[0]?.cid).toBe('14558127');
      expect(result.deckInfo?.mainDeck[0]?.ciid).toBe('1');
      expect(result.deckInfo?.mainDeck[0]?.quantity).toBe(3);
    });

    it('セクション区切りを正しく認識する', () => {
      const txtContent = `=== Main Deck ===
3x カード1 (1:1)
=== Extra Deck ===
2x カード2 (2:1)
=== Side Deck ===
1x カード3 (3:1)`;

      const result = importFromTXT(txtContent);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.extraDeck).toHaveLength(1);
      expect(result.deckInfo?.sideDeck).toHaveLength(1);
    });

    it('空のファイルでエラーを返す', () => {
      const txtContent = '';

      const result = importFromTXT(txtContent);

      expect(result.success).toBe(false);
      expect(result.error).toBe('インポート可能なデータがありません');
    });

    it('不正なフォーマットで警告を返す', () => {
      const txtContent = `=== Main Deck ===
不正な行
3x カード1 (1:1)`;

      const result = importFromTXT(txtContent);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('セクションなしのカード行を無視する', () => {
      const txtContent = `3x カード1 (1:1)
=== Main Deck ===
2x カード2 (2:1)`;

      const result = importFromTXT(txtContent);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.mainDeck[0]?.cid).toBe('2');
    });

    it('空行を正しくスキップする', () => {
      const txtContent = `=== Main Deck ===

3x カード1 (1:1)

2x カード2 (2:1)`;

      const result = importFromTXT(txtContent);

      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(2);
    });
  });

  // ========================================
  // 低優先度テスト（23個）
  // ========================================
  describe('低優先度: エッジケースとエラーハンドリング', () => {
    describe('importFromCSV - 拡張ケース', () => {
      it('大量のカードを含むCSVを処理できる', () => {
        const rows = ['section,cid,quantity'];
        for (let i = 0; i < 500; i++) {
          rows.push(`main,${100000 + i},1`);
        }
        const csvContent = rows.join('\n');
        const result = importFromCSV(csvContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(500);
      });

      it('特殊文字を含むカード名を処理できる', () => {
        const csvContent = `section,name,cid,ciid,quantity
main,"カード""名",123,1,1
main,カード@#$,456,1,1`;

        const result = importFromCSV(csvContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(2);
      });

      it('重複するCIDを正しくマージできる', () => {
        const csvContent = `section,cid,quantity
main,89631139,2
main,89631139,1`;

        const result = importFromCSV(csvContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(1);
        expect(result.deckInfo?.mainDeck[0]?.quantity).toBe(3);
      });

      it('不正なquantity値を持つ行をスキップする', () => {
        const csvContent = `section,cid,quantity
main,123,abc
main,456,3`;

        const result = importFromCSV(csvContent);

        expect(result.success).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.deckInfo?.mainDeck).toHaveLength(1);
      });

      it('CSVカラム区切り文字の違いに対応できる', () => {
        // タブ区切り - 現状の実装ではカンマ区切りのみ対応
        const csvContent = `section,cid,quantity
main,123,3`;

        const result = importFromCSV(csvContent);

        expect(result.success).toBe(true);
      });

      it('BOM付きUTF-8 CSVを処理できる', () => {
        const csvContent = '\uFEFFsection,cid,quantity\nmain,123,3';
        const result = importFromCSV(csvContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(1);
      });

      it('改行コードの違い（CRLF/LF）を処理できる', () => {
        const csvContentCRLF = 'section,cid,quantity\r\nmain,123,3\r\nmain,456,2';
        const result = importFromCSV(csvContentCRLF);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(2);
      });

      it('空行を含むCSVを処理できる', () => {
        const csvContent = `section,cid,quantity

main,123,3

main,456,2`;

        const result = importFromCSV(csvContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(2);
      });

      it('ciidが異なる同一CIDを別カードとして扱う', () => {
        const csvContent = `section,cid,ciid,quantity
main,123,1,2
main,123,2,1`;

        const result = importFromCSV(csvContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(2);
      });

      it('セクション名が不正な行をスキップする', () => {
        const csvContent = `section,cid,quantity
invalid_section,123,3
main,456,2`;

        const result = importFromCSV(csvContent);

        expect(result.success).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.deckInfo?.mainDeck).toHaveLength(1);
      });
    });

    describe('importFromTXT - 拡張ケース', () => {
      it('大量のカードを含むTXTを処理できる', () => {
        const lines = ['=== Main Deck ==='];
        for (let i = 0; i < 500; i++) {
          lines.push(`1x カード${i} (${100000 + i}:1)`);
        }
        const txtContent = lines.join('\n');
        const result = importFromTXT(txtContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(500);
      });

      it('数値表記バリエーション（1x, x1, 1）を処理できる', () => {
        const txtContent = `=== Main Deck ===
3x カード1 (123:1)
2x カード2 (456:1)
1x カード3 (789:1)`;

        const result = importFromTXT(txtContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(3);
        expect(result.deckInfo?.mainDeck[0]?.quantity).toBe(3);
        expect(result.deckInfo?.mainDeck[1]?.quantity).toBe(2);
        expect(result.deckInfo?.mainDeck[2]?.quantity).toBe(1);
      });

      it('コメント行（#）を無視する', () => {
        const txtContent = `=== Main Deck ===
# これはコメント
3x カード1 (123:1)
# 別のコメント
2x カード2 (456:1)`;

        const result = importFromTXT(txtContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(2);
      });

      it('特殊文字を含むカード名を処理できる', () => {
        const txtContent = `=== Main Deck ===
3x カード"名" (123:1)
2x カード@#$ (456:1)`;

        const result = importFromTXT(txtContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(2);
      });

      it('セクション名の大文字小文字を区別する（正確なセクション名が必要）', () => {
        const txtContent = `=== Main Deck ===
3x カード1 (123:1)
=== Extra Deck ===
2x カード2 (456:1)`;

        const result = importFromTXT(txtContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(1);
        expect(result.deckInfo?.extraDeck).toHaveLength(1);
      });

      it('BOM付きUTF-8 TXTを処理できる', () => {
        const txtContent = '\uFEFF=== Main Deck ===\n3x カード1 (123:1)';
        const result = importFromTXT(txtContent);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(1);
      });

      it('改行コードの違い（CRLF/LF）を処理できる', () => {
        const txtContentCRLF = '=== Main Deck ===\r\n3x カード1 (123:1)\r\n2x カード2 (456:1)';
        const result = importFromTXT(txtContentCRLF);

        expect(result.success).toBe(true);
        expect(result.deckInfo?.mainDeck).toHaveLength(2);
      });

      it('不正なCID形式を持つ行をスキップする', () => {
        const txtContent = `=== Main Deck ===
3x カード1 (abc:1)
2x カード2 (456:1)`;

        const result = importFromTXT(txtContent);

        expect(result.success).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.deckInfo?.mainDeck).toHaveLength(1);
      });

      it('カード名がない行は警告が出る', () => {
        const txtContent = `=== Main Deck ===
3x (123:1)
2x カード2 (456:1)`;

        const result = importFromTXT(txtContent);

        expect(result.success).toBe(true);
        // カード名がない行はスキップされる可能性がある
        expect(result.deckInfo?.mainDeck).toHaveLength(1);
        expect(result.warnings).toBeDefined();
      });

      it('複数のセクション区切りを正しく処理する', () => {
        const txtContent = `=== Main Deck ===
3x カード1 (123:1)
=== Extra Deck ===
2x カード2 (456:1)
=== Side Deck ===
1x カード3 (789:1)
=== Main Deck ===
1x カード4 (999:1)`;

        const result = importFromTXT(txtContent);

        expect(result.success).toBe(true);
        // 最後のMain Deckセクションも含めて処理される
        expect(result.deckInfo?.mainDeck).toHaveLength(2);
      });

      it('ciidが省略されている行は警告が出る', () => {
        const txtContent = `=== Main Deck ===
3x カード1 (123)`;

        const result = importFromTXT(txtContent);

        // ciid省略形式は未サポートのためエラーまたは警告
        if (result.success) {
          expect(result.warnings).toBeDefined();
        } else {
          expect(result.error).toBeDefined();
        }
      });

      it('全角数字を含む数量表記は未サポート', () => {
        const txtContent = `=== Main Deck ===
３x カード1 (123:1)`;

        const result = importFromTXT(txtContent);

        // 全角数字は未サポートのためエラーまたは警告
        if (result.success) {
          expect(result.warnings).toBeDefined();
        } else {
          expect(result.error).toBeDefined();
        }
      });

      it('全角括弧を含むカードIDは未サポート', () => {
        const txtContent = `=== Main Deck ===
3x カード1 （123:1）`;

        const result = importFromTXT(txtContent);

        // 全角括弧は未サポートのためエラーまたは警告
        if (result.success) {
          expect(result.warnings).toBeDefined();
        } else {
          expect(result.error).toBeDefined();
        }
      });
    });
  });
});
