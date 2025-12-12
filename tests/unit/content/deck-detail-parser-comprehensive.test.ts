/**
 * deck-detail-parser.ts テスト
 *
 * Yu-Gi-Oh デッキ詳細ページのパーサーテスト
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { convertCategoryLabelsToIds, convertTagLabelsToIds } from '@/content/parser/deck-detail-parser';

describe('deck-detail-parser', () => {
  describe('convertCategoryLabelsToIds', () => {
    describe('基本的なパース機能', () => {
      it('カテゴリラベルをIDに正しく変換できる', () => {
        const metadata = {
          categories: [
            { label: 'カテゴリA', value: 'cat-a' },
            { label: 'カテゴリB', value: 'cat-b' },
            { label: 'カテゴリC', value: 'cat-c' }
          ]
        };
        const labels = ['カテゴリA', 'カテゴリC'];
        const result = convertCategoryLabelsToIds(labels, metadata);

        expect(result).toEqual(['cat-a', 'cat-c']);
      });

      it('存在しないカテゴリラベルを除外できる', () => {
        const metadata = {
          categories: [
            { label: 'カテゴリA', value: 'cat-a' },
            { label: 'カテゴリB', value: 'cat-b' }
          ]
        };
        const labels = ['カテゴリA', '存在しないカテゴリ', 'カテゴリB'];
        const result = convertCategoryLabelsToIds(labels, metadata);

        expect(result).toEqual(['cat-a', 'cat-b']);
      });

      it('空の配列を正しく処理できる', () => {
        const metadata = {
          categories: [
            { label: 'カテゴリA', value: 'cat-a' }
          ]
        };
        const labels: string[] = [];
        const result = convertCategoryLabelsToIds(labels, metadata);

        expect(result).toEqual([]);
      });

      it('メタデータがnullの場合に空配列を返す', () => {
        const labels = ['カテゴリA'];
        const result = convertCategoryLabelsToIds(labels, null);

        expect(result).toEqual([]);
      });

      it('メタデータにcategoriesがない場合に空配列を返す', () => {
        const metadata = {};
        const labels = ['カテゴリA'];
        const result = convertCategoryLabelsToIds(labels, metadata);

        expect(result).toEqual([]);
      });

      it('複数のカテゴリラベルを正しく変換できる', () => {
        const metadata = {
          categories: [
            { label: 'ドラゴン族', value: 'dragon' },
            { label: '戦士族', value: 'warrior' },
            { label: '魔法使い族', value: 'spellcaster' }
          ]
        };
        const labels = ['ドラゴン族', '魔法使い族'];
        const result = convertCategoryLabelsToIds(labels, metadata);

        expect(result).toEqual(['dragon', 'spellcaster']);
      });
    });
  });

  describe('convertTagLabelsToIds', () => {
    describe('カード情報の抽出', () => {
      it('タグラベルをIDに正しく変換できる', () => {
        const metadata = {
          tags: {
            'tag-a': 'タグA',
            'tag-b': 'タグB',
            'tag-c': 'タグC'
          }
        };
        const labels = ['タグA', 'タグC'];
        const result = convertTagLabelsToIds(labels, metadata);

        expect(result).toEqual(['tag-a', 'tag-c']);
      });

      it('存在しないタグラベルを除外できる', () => {
        const metadata = {
          tags: {
            'tag-a': 'タグA',
            'tag-b': 'タグB'
          }
        };
        const labels = ['タグA', '存在しないタグ', 'タグB'];
        const result = convertTagLabelsToIds(labels, metadata);

        expect(result).toEqual(['tag-a', 'tag-b']);
      });

      it('空の配列を正しく処理できる', () => {
        const metadata = {
          tags: {
            'tag-a': 'タグA'
          }
        };
        const labels: string[] = [];
        const result = convertTagLabelsToIds(labels, metadata);

        expect(result).toEqual([]);
      });

      it('メタデータがnullの場合に空配列を返す', () => {
        const labels = ['タグA'];
        const result = convertTagLabelsToIds(labels, null);

        expect(result).toEqual([]);
      });
    });

    describe('メタデータの抽出', () => {
      it('メタデータにtagsがない場合に空配列を返す', () => {
        const metadata = {};
        const labels = ['タグA'];
        const result = convertTagLabelsToIds(labels, metadata);

        expect(result).toEqual([]);
      });

      it('複数のタグラベルを正しく変換できる', () => {
        const metadata = {
          tags: {
            'speed': 'スピード',
            'control': 'コントロール',
            'combo': 'コンボ'
          }
        };
        const labels = ['スピード', 'コンボ'];
        const result = convertTagLabelsToIds(labels, metadata);

        expect(result).toEqual(['speed', 'combo']);
      });
    });
  });

  // ========================================
  // 低優先度テスト（10個）
  // ========================================
  describe('低優先度: エッジケースとエラーハンドリング', () => {
    describe('convertCategoryLabelsToIds - 拡張ケース', () => {
      it('重複するカテゴリラベルを処理できる', () => {
        const metadata = {
          categories: [
            { label: 'カテゴリA', value: 'cat-a' },
            { label: 'カテゴリB', value: 'cat-b' }
          ]
        };
        const labels = ['カテゴリA', 'カテゴリA', 'カテゴリB'];
        const result = convertCategoryLabelsToIds(labels, metadata);

        expect(result).toEqual(['cat-a', 'cat-a', 'cat-b']);
      });

      it('大文字小文字が異なるカテゴリラベルを区別できる', () => {
        const metadata = {
          categories: [
            { label: 'カテゴリa', value: 'cat-lower' },
            { label: 'カテゴリA', value: 'cat-upper' }
          ]
        };
        const labels = ['カテゴリa', 'カテゴリA'];
        const result = convertCategoryLabelsToIds(labels, metadata);

        expect(result).toEqual(['cat-lower', 'cat-upper']);
      });

      it('特殊文字を含むカテゴリラベルを処理できる', () => {
        const metadata = {
          categories: [
            { label: 'カテゴリ@#$', value: 'cat-special' },
            { label: 'カテゴリ　全角', value: 'cat-fullwidth' }
          ]
        };
        const labels = ['カテゴリ@#$', 'カテゴリ　全角'];
        const result = convertCategoryLabelsToIds(labels, metadata);

        expect(result).toEqual(['cat-special', 'cat-fullwidth']);
      });

      it('undefinedを含むカテゴリ配列を処理できる', () => {
        const metadata = {
          categories: [
            { label: 'カテゴリA', value: 'cat-a' }
          ]
        };
        const labels = ['カテゴリA', undefined as any, 'カテゴリB'];
        const result = convertCategoryLabelsToIds(labels, metadata);

        // undefinedは除外される
        expect(result).toEqual(['cat-a']);
      });

      it('大量のカテゴリラベルを処理できる', () => {
        const categories = Array.from({ length: 100 }, (_, i) => ({
          label: `カテゴリ${i}`,
          value: `cat-${i}`
        }));
        const metadata = { categories };
        const labels = Array.from({ length: 100 }, (_, i) => `カテゴリ${i}`);
        const result = convertCategoryLabelsToIds(labels, metadata);

        expect(result).toHaveLength(100);
        expect(result[0]).toBe('cat-0');
        expect(result[99]).toBe('cat-99');
      });
    });

    describe('convertTagLabelsToIds - 拡張ケース', () => {
      it('重複するタグラベルを処理できる', () => {
        const metadata = {
          tags: {
            'tag-a': 'タグA',
            'tag-b': 'タグB'
          }
        };
        const labels = ['タグA', 'タグA', 'タグB'];
        const result = convertTagLabelsToIds(labels, metadata);

        expect(result).toEqual(['tag-a', 'tag-a', 'tag-b']);
      });

      it('特殊文字を含むタグラベルを処理できる', () => {
        const metadata = {
          tags: {
            'tag-special': 'タグ@#$',
            'tag-fullwidth': 'タグ　全角'
          }
        };
        const labels = ['タグ@#$', 'タグ　全角'];
        const result = convertTagLabelsToIds(labels, metadata);

        expect(result).toEqual(['tag-special', 'tag-fullwidth']);
      });

      it('undefinedを含むタグ配列を処理できる', () => {
        const metadata = {
          tags: {
            'tag-a': 'タグA'
          }
        };
        const labels = ['タグA', undefined as any, 'タグB'];
        const result = convertTagLabelsToIds(labels, metadata);

        // undefinedは除外される
        expect(result).toEqual(['tag-a']);
      });

      it('大量のタグラベルを処理できる', () => {
        const tags: Record<string, string> = {};
        Array.from({ length: 100 }, (_, i) => {
          tags[`tag-${i}`] = `タグ${i}`;
        });
        const metadata = { tags };
        const labels = Array.from({ length: 100 }, (_, i) => `タグ${i}`);
        const result = convertTagLabelsToIds(labels, metadata);

        expect(result).toHaveLength(100);
        expect(result[0]).toBe('tag-0');
        expect(result[99]).toBe('tag-99');
      });

      it('メタデータのtagsが空オブジェクトの場合に空配列を返す', () => {
        const metadata = { tags: {} };
        const labels = ['タグA'];
        const result = convertTagLabelsToIds(labels, metadata);

        expect(result).toEqual([]);
      });
    });
  });
});
