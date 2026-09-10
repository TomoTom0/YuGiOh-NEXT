import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractDnoFromPage,
  extractDeckNameFromMeta,
  extractIsPublicFromTitle,
  extractCgidFromPage,
  extractDeckType,
  extractDeckStyle,
  extractCategory,
  extractTags,
  extractComment,
  extractDeckCode
} from '@/content/parser/deck-detail-parser';
import { JSDOM } from 'jsdom';

/**
 * deck-detail-parser.ts の extract 関数群のテスト
 *
 * デッキ詳細ページからメタデータを抽出する各関数をテスト
 */

describe('deck-detail-parser extract functions', () => {
  let doc: Document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    doc = dom.window.document;
  });

  describe('extractDnoFromPage', () => {
    it('[covers:extract_dno.script_pattern] JavaScriptコードからdnoを抽出できる', () => {
      const html = `<script>$('#dno').val('42')</script>`;
      doc.body.innerHTML = html;

      const result = extractDnoFromPage(doc);
      expect(result).toBe(42);
    });

    it('[covers:extract_dno.not_found] デッキ番号がない場合は0を返す', () => {
      const html = `<script>console.log('test')</script>`;
      doc.body.innerHTML = html;

      const result = extractDnoFromPage(doc);
      expect(result).toBe(0);
    });

    it('[covers:extract_dno.script_pattern] 複数桁のデッキ番号を抽出できる', () => {
      const html = `<script>$('#dno').val('9999')</script>`;
      doc.body.innerHTML = html;

      const result = extractDnoFromPage(doc);
      expect(result).toBe(9999);
    });

    it('[covers:extract_dno.url_pattern_fallback] URLパラメータからdnoを抽出できる', () => {
      const html = `<a href="/page?dno=123">Link</a>`;
      doc.body.innerHTML = html;

      const result = extractDnoFromPage(doc);
      expect(result).toBe(123);
    });

    it('[covers:extract_dno.script_pattern_priority] JavaScriptパターンがURLパターンより優先される', () => {
      const html = `
        <script>$('#dno').val('42')</script>
        <a href="/page?dno=999">Link</a>
      `;
      doc.body.innerHTML = html;

      const result = extractDnoFromPage(doc);
      expect(result).toBe(42);
    });
  });

  describe('extractDeckNameFromMeta', () => {
    it('[covers:extract_name.description_meta] meta[name="description"]からデッキ名を抽出できる', () => {
      const html = `
        <meta name="description" content="完全版テスト成功/">
      `;
      doc.head.innerHTML = html;

      const result = extractDeckNameFromMeta(doc);
      expect(result).toBe('完全版テスト成功');
    });

    it('[covers:extract_name.og_description_fallback] meta[property="og:description"]からデッキ名を抽出できる', () => {
      const html = `
        <meta property="og:description" content="テストデッキ | 遊戯王ニューロン">
      `;
      doc.head.innerHTML = html;

      const result = extractDeckNameFromMeta(doc);
      expect(result).toBe('テストデッキ');
    });

    it('[covers:extract_name.default] 両方のメタタグがない場合は「デッキ」を返す', () => {
      const result = extractDeckNameFromMeta(doc);
      expect(result).toBe('デッキ');
    });

    it('[covers:extract_name.description_meta_empty_falls_through] meta[name="description"]が空の場合はog:descriptionから取得', () => {
      const html = `
        <meta name="description" content="">
        <meta property="og:description" content="フォールバック | サイト">
      `;
      doc.head.innerHTML = html;

      const result = extractDeckNameFromMeta(doc);
      expect(result).toBe('フォールバック');
    });

    it('[covers:extract_name.description_meta] 特殊文字を含むデッキ名を抽出できる', () => {
      const html = `
        <meta name="description" content="テスト＆デッキ v2.0/">
      `;
      doc.head.innerHTML = html;

      const result = extractDeckNameFromMeta(doc);
      expect(result).toBe('テスト＆デッキ v2.0');
    });
  });

  describe('extractIsPublicFromTitle', () => {
    it('[covers:is_public.public_h1] h1に「公開」を含む場合はtrueを返す', () => {
      const html = `<h1>【 公開 】テストデッキ</h1>`;
      doc.body.innerHTML = html;

      const result = extractIsPublicFromTitle(doc);
      expect(result).toBe(true);
    });

    it('[covers:is_public.non_public_h1] h1に「非公開」を含む場合はfalseを返す', () => {
      const html = `<h1>【 非公開 】テストデッキ</h1>`;
      doc.body.innerHTML = html;

      const result = extractIsPublicFromTitle(doc);
      expect(result).toBe(false);
    });

    it('[covers:is_public.public_h1] h1が複数存在する場合は最初にマッチするものを使用', () => {
      const html = `
        <h1>何か別のテキスト</h1>
        <h1>【 公開 】実際のデッキ</h1>
      `;
      doc.body.innerHTML = html;

      const result = extractIsPublicFromTitle(doc);
      expect(result).toBe(true);
    });

    it('[covers:is_public.no_match_default] h1に「公開」「非公開」がない場合はfalseを返す', () => {
      const html = `<h1>テストデッキ</h1>`;
      doc.body.innerHTML = html;

      const result = extractIsPublicFromTitle(doc);
      expect(result).toBe(false);
    });

    it('[covers:is_public.no_h1] h1がない場合はfalseを返す', () => {
      const result = extractIsPublicFromTitle(doc);
      expect(result).toBe(false);
    });
  });

  describe('extractCgidFromPage', () => {
    it('[covers:extract_cgid.found] URLパラメータからcgidを抽出できる', () => {
      const html = `<a href="/page?cgid=a1b2c3d4e5f6">Link</a>`;
      doc.body.innerHTML = html;

      const result = extractCgidFromPage(doc);
      expect(result).toBe('a1b2c3d4e5f6');
    });

    it('[covers:extract_cgid.not_found] cgidがない場合は undefined を返す', () => {
      const html = `<a href="/page?dno=123">Link</a>`;
      doc.body.innerHTML = html;

      const result = extractCgidFromPage(doc);
      expect(result).toBeUndefined();
    });

    it('[covers:extract_cgid.found] 16進数形式（a-f0-9のみ）のcgidを抽出できる', () => {
      const html = `<a href="/page?cgid=abcdef1234567890">Link</a>`;
      doc.body.innerHTML = html;

      const result = extractCgidFromPage(doc);
      expect(result).toBe('abcdef1234567890');
    });

    it('[covers:extract_cgid.first_match_when_multiple] 複数のcgidパラメータがある場合は最初にマッチするものを返す', () => {
      const html = `<a href="/page?cgid=abc123">Link</a><a href="/page?cgid=def456">Link2</a>`;
      doc.body.innerHTML = html;

      const result = extractCgidFromPage(doc);
      expect(result).toBe('abc123');
    });
  });

  describe('extractDeckType', () => {
    it('[covers:extract_deck_type.found] dt/ddからデッキタイプを抽出できる', () => {
      const html = `
        <dt><span>デッキタイプ</span></dt>
        <dd class="text_set"><span>OCG（マスタールール）</span></dd>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckType(doc);
      expect(result).toBe('0');
    });

    it('[covers:extract_deck_type.found] 複数のdt要素の中からマッチするものを抽出', () => {
      const html = `
        <dt><span>その他の項目</span></dt>
        <dd class="text_set"><span>値1</span></dd>
        <dt><span>デッキタイプ</span></dt>
        <dd class="text_set"><span>デュエルリンクス</span></dd>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckType(doc);
      expect(result).toBe('2');
    });

    it('[covers:extract_deck_type.dt_not_found] デッキタイプが存在しない場合は undefined を返す', () => {
      const result = extractDeckType(doc);
      expect(result).toBeUndefined();
    });

    it('[covers:extract_deck_type.dd_wrong_class] デッキタイプのddがtext_setでない場合は undefined', () => {
      const html = `
        <dt><span>デッキタイプ</span></dt>
        <dd><span>OCG（マスタールール）</span></dd>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckType(doc);
      expect(result).toBeUndefined();
    });

    it('[covers:extract_deck_type.found] マスターデュエルのデッキタイプを抽出できる', () => {
      const html = `
        <dt><span>デッキタイプ</span></dt>
        <dd class="text_set"><span>マスターデュエル</span></dd>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckType(doc);
      expect(result).toBe('3');
    });
  });

  describe('extractDeckStyle', () => {
    it('[covers:extract_deck_style.found] dl.MD_deck_styleからデッキスタイルを抽出できる', () => {
      const html = `
        <dl class="MD_deck_style">
          <dt><span>デッキスタイル</span></dt>
          <dd class="text_set"><span>トーナメント</span></dd>
        </dl>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckStyle(doc);
      expect(result).toBe('1');
    });

    it('[covers:extract_deck_style.found] 複数のスタイルラベルから正しく変換される', () => {
      const html = `
        <dl class="MD_deck_style">
          <dt><span>デッキスタイル</span></dt>
          <dd class="text_set"><span>コンセプト</span></dd>
        </dl>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckStyle(doc);
      expect(result).toBe('2');
    });

    it('[covers:extract_deck_style.dl_not_found] MD_deck_styleが存在しない場合は undefined を返す', () => {
      const result = extractDeckStyle(doc);
      expect(result).toBeUndefined();
    });

    it('[covers:extract_deck_style.dd_text_set_not_found] text_setクラスのddが存在しない場合は undefined', () => {
      const html = `
        <dl class="MD_deck_style">
          <dt><span>デッキスタイル</span></dt>
          <dd><span>トーナメント</span></dd>
        </dl>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckStyle(doc);
      expect(result).toBeUndefined();
    });

    it('[covers:extract_deck_style.found] キャラクタースタイルを抽出できる', () => {
      const html = `
        <dl class="MD_deck_style">
          <dt><span>デッキスタイル</span></dt>
          <dd class="text_set"><span>キャラクター</span></dd>
        </dl>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckStyle(doc);
      expect(result).toBe('0');
    });
  });

  describe('extractCategory', () => {
    it('[covers:extract_category.found] dd.regist_categoryからカテゴリを抽出できる', () => {
      const html = `
        <dd class="regist_category">
          <span>マジェスペクター</span>
          <span>竜剣士</span>
        </dd>
      `;
      doc.body.innerHTML = html;

      const result = extractCategory(doc);
      expect(result).toEqual(['マジェスペクター', '竜剣士']);
    });

    it('[covers:extract_category.dd_not_found] カテゴリがない場合は空配列を返す', () => {
      const result = extractCategory(doc);
      expect(result).toEqual([]);
    });

    it('[covers:extract_category.found] 1つのカテゴリのみが存在する場合', () => {
      const html = `
        <dd class="regist_category">
          <span>シンクロ</span>
        </dd>
      `;
      doc.body.innerHTML = html;

      const result = extractCategory(doc);
      expect(result).toEqual(['シンクロ']);
    });

    it('[covers:extract_category.empty_span_text_filtered] 複数のspanがあるが空のものは含まない', () => {
      const html = `
        <dd class="regist_category">
          <span>カテゴリA</span>
          <span></span>
          <span>カテゴリB</span>
        </dd>
      `;
      doc.body.innerHTML = html;

      const result = extractCategory(doc);
      expect(result).toEqual(['カテゴリA', 'カテゴリB']);
    });
  });

  describe('extractTags', () => {
    it('[covers:extract_tags.found] dd.regist_tagからタグを抽出できる', () => {
      const html = `
        <dd class="regist_tag">
          <span>大会優勝デッキ</span>
          <span>実戦向け</span>
        </dd>
      `;
      doc.body.innerHTML = html;

      const result = extractTags(doc);
      expect(result).toEqual(['大会優勝デッキ', '実戦向け']);
      expect(result).toHaveLength(2);
    });

    it('[covers:extract_tags.dd_not_found] タグがない場合は空配列を返す', () => {
      const result = extractTags(doc);
      expect(result).toEqual([]);
    });

    it('[covers:extract_tags.found] 複数のタグが存在する場合', () => {
      const html = `
        <dd class="regist_tag">
          <span>戦士族</span>
          <span>ドラゴン族</span>
          <span>魔法使い族</span>
        </dd>
      `;
      doc.body.innerHTML = html;

      const result = extractTags(doc);
      expect(result).toHaveLength(3);
      expect(result).toContain('戦士族');
      expect(result).toContain('ドラゴン族');
      expect(result).toContain('魔法使い族');
    });

    it('[covers:extract_tags.empty_span_text_filtered] 空のspanは含まない', () => {
      const html = `
        <dd class="regist_tag">
          <span>タグA</span>
          <span></span>
          <span>タグB</span>
        </dd>
      `;
      doc.body.innerHTML = html;

      const result = extractTags(doc);
      expect(result).toEqual(['タグA', 'タグB']);
    });
  });

  describe('extractComment', () => {
    it('[covers:extract_comment.found] dt/ddからコメントを抽出できる', () => {
      const html = `
        <dt><span>コメント</span></dt>
        <dd class="text_set"><span class="biko">これはテストコメントです</span></dd>
      `;
      doc.body.innerHTML = html;

      const result = extractComment(doc);
      expect(result).toBe('これはテストコメントです');
    });

    it('[covers:extract_comment.span_present_empty_text] コメントが空の場合は空文字を返す', () => {
      const html = `
        <dt><span>コメント</span></dt>
        <dd class="text_set"><span class="biko"></span></dd>
      `;
      doc.body.innerHTML = html;

      const result = extractComment(doc);
      expect(result).toBe('');
    });

    it('[covers:extract_comment.found] 複数行のコメントを抽出できる', () => {
      const html = `
        <dt><span>コメント</span></dt>
        <dd class="text_set"><span class="biko">1行目
2行目
3行目</span></dd>
      `;
      doc.body.innerHTML = html;

      const result = extractComment(doc);
      expect(result).toContain('1行目');
      expect(result).toContain('2行目');
      expect(result).toContain('3行目');
    });

    it('[covers:extract_comment.found] 特殊文字を含むコメントを抽出できる', () => {
      const html = `
        <dt><span>コメント</span></dt>
        <dd class="text_set"><span class="biko">テスト＆デッキ v2.0</span></dd>
      `;
      doc.body.innerHTML = html;

      const result = extractComment(doc);
      expect(typeof result).toBe('string');
      expect(result).toContain('テスト');
    });

    it('[covers:extract_comment.dt_not_found] コメントフィールドがない場合は空文字を返す', () => {
      const result = extractComment(doc);
      expect(result).toBe('');
    });

    it('[covers:extract_comment.found] 複数のdt要素の中からコメントを検索', () => {
      const html = `
        <dt><span>その他</span></dt>
        <dd class="text_set"><span class="biko">値1</span></dd>
        <dt><span>コメント</span></dt>
        <dd class="text_set"><span class="biko">実際のコメント</span></dd>
      `;
      doc.body.innerHTML = html;

      const result = extractComment(doc);
      expect(result).toBe('実際のコメント');
    });
  });

  describe('extractDeckCode', () => {
    it('[covers:extract_deck_code.found] dt/ddからデッキコードを抽出できる', () => {
      const html = `
        <dt><span>デッキコード</span></dt>
        <dd class="a_set">abcd1234efgh5678ijkl9012mnop3456</dd>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckCode(doc);
      expect(result).toBe('abcd1234efgh5678ijkl9012mnop3456');
    });

    it('[covers:extract_deck_code.dt_not_found] デッキコードがない場合は空文字を返す', () => {
      const result = extractDeckCode(doc);
      expect(result).toBe('');
    });

    it('[covers:extract_deck_code.not_issued_yet] デッキコード「発行」ボタンの場合は空文字を返す', () => {
      const html = `
        <dt><span>デッキコード</span></dt>
        <dd class="a_set">デッキコードを発行</dd>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckCode(doc);
      expect(result).toBe('');
    });

    it('[covers:extract_deck_code.found] 複数のdt要素の中からデッキコードを検索', () => {
      const html = `
        <dt><span>その他</span></dt>
        <dd class="a_set">値1</dd>
        <dt><span>デッキコード</span></dt>
        <dd class="a_set">code123456789</dd>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckCode(doc);
      expect(result).toBe('code123456789');
    });

    it('[covers:extract_deck_code.text_trimmed] whitespaceがあっても抽出できる', () => {
      const html = `
        <dt><span>デッキコード</span></dt>
        <dd class="a_set">  abc123def456  </dd>
      `;
      doc.body.innerHTML = html;

      const result = extractDeckCode(doc);
      expect(result).toBe('abc123def456');
    });
  });

  describe('複合テスト', () => {
    it('[covers:extract_dno.script_pattern] [covers:extract_name.description_meta] [covers:is_public.public_h1] [covers:extract_cgid.found] [covers:extract_deck_type.found] [covers:extract_deck_style.found] [covers:extract_category.found] [covers:extract_tags.found] [covers:extract_comment.found] [covers:extract_deck_code.found] 複数の extract 関数を組み合わせて使用できる', () => {
      const html = `
        <head>
          <meta name="description" content="完全版テスト成功/">
        </head>
        <body>
          <h1>【 公開 】テストデッキ</h1>
          <script>$('#dno').val('10')</script>
          <a href="/page?cgid=abc123def456">Link</a>
          <dt><span>デッキタイプ</span></dt>
          <dd class="text_set"><span>OCG（マスタールール）</span></dd>
          <dl class="MD_deck_style">
            <dt><span>デッキスタイル</span></dt>
            <dd class="text_set"><span>トーナメント</span></dd>
          </dl>
          <dd class="regist_category">
            <span>カテゴリ1</span>
          </dd>
          <dd class="regist_tag">
            <span>タグ1</span>
          </dd>
          <dt><span>コメント</span></dt>
          <dd class="text_set"><span class="biko">テストコメント</span></dd>
          <dt><span>デッキコード</span></dt>
          <dd class="a_set">deckcodeABC123</dd>
        </body>
      `;
      doc.documentElement.innerHTML = html;

      const dno = extractDnoFromPage(doc);
      const name = extractDeckNameFromMeta(doc);
      const isPublic = extractIsPublicFromTitle(doc);
      const cgid = extractCgidFromPage(doc);
      const deckType = extractDeckType(doc);
      const deckStyle = extractDeckStyle(doc);
      const category = extractCategory(doc);
      const tags = extractTags(doc);
      const comment = extractComment(doc);
      const deckCode = extractDeckCode(doc);

      expect(dno).toBe(10);
      expect(name).toBe('完全版テスト成功');
      expect(isPublic).toBe(true);
      expect(cgid).toBe('abc123def456');
      expect(deckType).toBe('0');
      expect(deckStyle).toBe('1');
      expect(category).toEqual(['カテゴリ1']);
      expect(tags).toEqual(['タグ1']);
      expect(comment).toBe('テストコメント');
      expect(deckCode).toBe('deckcodeABC123');
    });
  });
});
