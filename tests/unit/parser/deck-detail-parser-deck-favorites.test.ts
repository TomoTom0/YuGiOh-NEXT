/**
 * extractFavoriteCount() と extractDeckLikes() のテスト
 *
 * PR #82で追加されたお気に入り数・いいね数抽出機能のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractFavoriteCount, extractDeckLikes } from '@/content/parser/deck-detail-parser';
import { JSDOM } from 'jsdom';
import * as domSelectors from '@/utils/dom-selectors';

vi.mock('@/utils/dom-selectors');

describe('extractFavoriteCount', () => {
  let doc: Document;

  beforeEach(() => {
    const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    doc = window.document;

    // OFFICIAL_SITE_SELECTORSをモック
    vi.mocked(domSelectors.OFFICIAL_SITE_SELECTORS).deckDisplay = {
      favoriteCount: '.favorite-count',
    } as any;
  });

  it('お気に入り数を正常に抽出する', () => {
    const html = `
      <html>
        <body>
          <span class="favorite-count">42</span>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractFavoriteCount(doc);
    expect(result).toBe(42);
  });

  it('お気に入り数が0の場合', () => {
    const html = `
      <html>
        <body>
          <span class="favorite-count">0</span>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractFavoriteCount(doc);
    expect(result).toBe(0);
  });

  it('要素が見つからない場合は0を返す', () => {
    doc.documentElement.innerHTML = '<html><body></body></html>';

    const result = extractFavoriteCount(doc);
    expect(result).toBe(0);
  });

  it('テキストコンテンツが空の場合は0を返す', () => {
    const html = `
      <html>
        <body>
          <span class="favorite-count"></span>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractFavoriteCount(doc);
    expect(result).toBe(0);
  });

  it('数値以外のテキストが含まれている場合は0を返す', () => {
    const html = `
      <html>
        <body>
          <span class="favorite-count">not a number</span>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractFavoriteCount(doc);
    expect(result).toBe(0);
  });

  it('空白を含むテキストから数値を抽出する', () => {
    const html = `
      <html>
        <body>
          <span class="favorite-count">  123  </span>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractFavoriteCount(doc);
    expect(result).toBe(123);
  });

  it('大きな数値を抽出する', () => {
    const html = `
      <html>
        <body>
          <span class="favorite-count">999999</span>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractFavoriteCount(doc);
    expect(result).toBe(999999);
  });

  it('負の数値を返す場合がある', () => {
    const html = `
      <html>
        <body>
          <span class="favorite-count">-5</span>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractFavoriteCount(doc);
    expect(result).toBe(-5);
  });
});

describe('extractDeckLikes', () => {
  let doc: Document;

  beforeEach(() => {
    const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    doc = window.document;
  });

  it('常に0を返す（未実装）', () => {
    const html = `
      <html>
        <body>
          <div class="likes">999</div>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractDeckLikes(doc);
    expect(result).toBe(0);
  });

  it('どのようなHTMLでも常に0を返す', () => {
    doc.documentElement.innerHTML = '<html><body></body></html>';

    const result = extractDeckLikes(doc);
    expect(result).toBe(0);
  });

  it('複数回呼び出しても常に0を返す', () => {
    const html = `
      <html>
        <body>
          <div class="likes">100</div>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result1 = extractDeckLikes(doc);
    const result2 = extractDeckLikes(doc);

    expect(result1).toBe(0);
    expect(result2).toBe(0);
  });
});
