import { describe, it, expect } from 'vitest';
import { convertCardLinksToTemplate } from '@/utils/card-link-template';

describe('utils/card-link-template', () => {
  it('<br>要素を改行に変換する', () => {
    const div = document.createElement('div');
    div.innerHTML = 'テキスト1<br>テキスト2<br>テキスト3';

    expect(convertCardLinksToTemplate(div)).toBe('テキスト1\nテキスト2\nテキスト3');
  });

  it('cid付きのカードリンクを{{カード名|cid}}形式に変換する', () => {
    const div = document.createElement('div');
    div.innerHTML = '「<a href="card_search.action?ope=2&cid=5533">王家の眠る谷－ネクロバレー</a>」を発動する。';

    expect(convertCardLinksToTemplate(div)).toBe('「{{王家の眠る谷－ネクロバレー|5533}}」を発動する。');
  });

  it('cidを含まないリンクは変換せずテキストのまま残す', () => {
    const div = document.createElement('div');
    div.innerHTML = '<a href="card_search.action?acid=999">置換されないカード</a>';

    expect(convertCardLinksToTemplate(div)).toBe('置換されないカード');
  });

  it('[covers:literal_br_entity] HTML実体参照としてエスケープされた"&lt;br&gt;"がtextContentに文字列として残る場合も改行に変換する', () => {
    const div = document.createElement('div');
    // 公式サイトの一部カードは <br> がHTMLエンティティとして二重にエスケープされたまま
    // 登録されており、ブラウザはこれを実要素化せず文字列 "<br>" として保持する。
    div.innerHTML = '効果1&lt;br&gt;効果2';

    expect(div.textContent).toBe('効果1<br>効果2');
    expect(convertCardLinksToTemplate(div)).toBe('効果1\n効果2');
  });

  it('[covers:literal_br_entity] 大文字/自己終了タグ表記の"<BR/>"文字列も改行に変換する', () => {
    const div = document.createElement('div');
    div.innerHTML = '効果1&lt;BR/&gt;効果2';

    expect(convertCardLinksToTemplate(div)).toBe('効果1\n効果2');
  });

  it('[covers:literal_anchor_entity] HTML実体参照としてエスケープされた"<a>"タグがtextContentに文字列として残る場合も{{カード名|cid}}形式に変換する', () => {
    const div = document.createElement('div');
    // 公式サイトのFAQ補足情報の一部は、<a>タグもHTMLエンティティとして二重に
    // エスケープされたまま登録されており、ブラウザはこれを実要素化せず
    // 文字列 '<a href="...">カード名</a>' として保持する。
    div.innerHTML = '手札から「&lt;a href=&quot;faq_search.action?ope=4&amp;cid=22976&quot;&gt;黒き混沌の魔術師ブラック・カオス&lt;/a&gt;」を儀式召喚する。';

    expect(convertCardLinksToTemplate(div)).toBe(
      '手札から「{{黒き混沌の魔術師ブラック・カオス|22976}}」を儀式召喚する。'
    );
  });

  it('[covers:literal_anchor_entity] 文字列としてのcidなしリンクは変換せずテキストのまま残す', () => {
    const div = document.createElement('div');
    div.innerHTML = '&lt;a href=&quot;faq_search.action?ope=4&quot;&gt;置換されないカード&lt;/a&gt;';

    expect(convertCardLinksToTemplate(div)).toBe('置換されないカード');
  });

  it('前後の空白をトリムする', () => {
    const div = document.createElement('div');
    div.innerHTML = '  テキスト  ';

    expect(convertCardLinksToTemplate(div)).toBe('テキスト');
  });

  it('テキストが空の場合は空文字を返す', () => {
    const div = document.createElement('div');

    expect(convertCardLinksToTemplate(div)).toBe('');
  });
});
