/**
 * HTMLElement内のカードリンクを {{カード名|cid}} 形式のテンプレートに変換
 *
 * @param element 変換対象のHTMLElement
 * @returns 変換後のテキスト
 *
 * @example
 * ```html
 * <div>「<a href="faq_search.action?ope=4&cid=5533">王家の眠る谷－ネクロバレー</a>」の効果</div>
 * ```
 * ↓
 * ```
 * 「{{王家の眠る谷－ネクロバレー|5533}}」の効果
 * ```
 */
export function convertCardLinksToTemplate(element: HTMLElement): string {
  const cloned = element.cloneNode(true) as HTMLElement;

  // <br>を改行に変換
  cloned.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n');
  });

  // カードリンク <a href="...?cid=5533">カード名</a> を {{カード名|5533}} に変換
  cloned.querySelectorAll('a[href*="cid="]').forEach(link => {
    const href = link.getAttribute('href') || '';
    const match = href.match(/[?&]cid=(\d+)/);
    if (match && match[1]) {
      const cardId = match[1];
      const cardName = link.textContent?.trim() || '';
      // {{カード名|cid}} 形式に変換
      link.replaceWith(`{{${cardName}|${cardId}}}`);
    }
  });

  let text = cloned.textContent?.trim() || '';

  // 公式サイトのカードテキストには、<br>タグがHTMLエンティティとしてエスケープされた
  // まま（&lt;br&gt;）データ登録されているカードが一定数存在する。この場合ブラウザの
  // HTMLパーサーは実要素化せず文字列 "<br>" のまま textContent に残すため、
  // querySelectorAll('br') では検出できない。ここで文字列としても改行に変換する。
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // 同様に、カードリンクの<a>タグもHTMLエンティティとしてエスケープされたまま
  // データ登録されている場合があり（例: FAQ補足情報で複数のカード名を列挙する箇所）、
  // 実要素化されず文字列 '<a href="...">カード名</a>' のまま残る。
  // querySelectorAll('a[href*="cid="]') では検出できないため、文字列としても変換する。
  text = text.replace(/<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, (_match, href: string, name: string) => {
    const match = href.match(/[?&]cid=(\d+)/);
    return match && match[1] ? `{{${name.trim()}|${match[1]}}}` : name;
  });

  return text;
}
