/**
 * extractIssuedDeckCode() のテスト
 *
 * PR #82で追加された発行済みデッキコード抽出機能のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { extractIssuedDeckCode } from '@/content/parser/deck-detail-parser';
import { JSDOM } from 'jsdom';

describe('extractIssuedDeckCode', () => {
  let doc: Document;

  beforeEach(() => {
    const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    doc = window.document;
  });

  it('シングルクォートで囲まれたデッキコードを抽出する', () => {
    const html = `
      <html>
        <body>
          <script>
            $('#copy-code').click(function () {
              navigator.clipboard.writeText('ABC123DEF456');
            });
          </script>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractIssuedDeckCode(doc);
    expect(result).toBe('ABC123DEF456');
  });

  it('ダブルクォートで囲まれたデッキコードを抽出する', () => {
    const html = `
      <html>
        <body>
          <script>
            $('#copy-code').click(function () {
              navigator.clipboard.writeText("XYZ789GHI012");
            });
          </script>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractIssuedDeckCode(doc);
    expect(result).toBe('XYZ789GHI012');
  });

  it('改行とインデントを含むスクリプトからデッキコードを抽出する', () => {
    const html = `
      <html>
        <body>
          <script>
            $('#copy-code').click(function () {
              console.log('About to copy');
              navigator.clipboard.writeText(
                'LONG123CODE456'
              );
            });
          </script>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractIssuedDeckCode(doc);
    expect(result).toBe('LONG123CODE456');
  });

  it('複数のスクリプトがある場合、最初にマッチするものを返す', () => {
    const html = `
      <html>
        <body>
          <script>console.log('dummy');</script>
          <script>
            $('#copy-code').click(function () {
              navigator.clipboard.writeText('FIRST123');
            });
          </script>
          <script>
            $('#copy-code').click(function () {
              navigator.clipboard.writeText('SECOND456');
            });
          </script>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractIssuedDeckCode(doc);
    expect(result).toBe('FIRST123');
  });

  it('デッキコードが発行されていない場合は空文字列を返す', () => {
    const html = `
      <html>
        <body>
          <script>console.log('No deck code here');</script>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractIssuedDeckCode(doc);
    expect(result).toBe('');
  });

  it('scriptタグがない場合は空文字列を返す', () => {
    doc.documentElement.innerHTML = '<html><body></body></html>';

    const result = extractIssuedDeckCode(doc);
    expect(result).toBe('');
  });

  it('空のscriptタグは無視される', () => {
    const html = `
      <html>
        <body>
          <script></script>
          <script>
            $('#copy-code').click(function () {
              navigator.clipboard.writeText('VALID123');
            });
          </script>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractIssuedDeckCode(doc);
    expect(result).toBe('VALID123');
  });

  it('特殊文字を含むデッキコードを抽出する', () => {
    const html = `
      <html>
        <body>
          <script>
            $('#copy-code').click(function () {
              navigator.clipboard.writeText('ABC-123_XYZ');
            });
          </script>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractIssuedDeckCode(doc);
    expect(result).toBe('ABC-123_XYZ');
  });

  it('navigator.clipboard.writeText()のパラメータが括弧で囲まれている場合も対応', () => {
    const html = `
      <html>
        <body>
          <script>
            $('#copy-code').click(function () {
              navigator.clipboard.writeText(  'SPACED123'  );
            });
          </script>
        </body>
      </html>
    `;
    doc.documentElement.innerHTML = html;

    const result = extractIssuedDeckCode(doc);
    expect(result).toBe('SPACED123');
  });
});
