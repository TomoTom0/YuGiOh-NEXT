/**
 * cgidのキャッシュ（セッション全体で共通）
 */
let cachedCgid: string | null = null;

/**
 * cgid（ユーザー識別子）を取得する
 *
 * cgidはページ内のリンク（href属性）に含まれている。
 * 現在のページのDOMから直接抽出する。
 *
 * @returns cgid（32文字hex）、存在しない場合はnull
 */
export async function getCgid(): Promise<string | null> {
  // キャッシュがあれば返す
  if (cachedCgid) {
    console.log('[getCgid] Using cached cgid:', cachedCgid.substring(0, 16) + '...');
    return cachedCgid;
  }

  try {
    console.log('[getCgid] Searching for cgid in page...');

    // フッターの「マイデッキ」リンクからcgidを取得
    const mydeckLink = document.querySelector<HTMLAnchorElement>('a[href*="member_deck.action"][href*="cgid="]');

    if (mydeckLink) {
      const match = mydeckLink.href.match(/cgid=([a-f0-9]{32})/);
      if (match && match[1]) {
        cachedCgid = match[1];
        console.log('[getCgid] ✅ cgid found from footer link:', cachedCgid.substring(0, 16) + '...');
        return cachedCgid;
      }
    }

    // フッター以外の任意のcgidリンクからも取得を試みる
    const anyLink = document.querySelector<HTMLAnchorElement>('a[href*="cgid="]');
    if (anyLink) {
      const match = anyLink.href.match(/cgid=([a-f0-9]{32})/);
      if (match && match[1]) {
        cachedCgid = match[1];
        console.log('[getCgid] ✅ cgid found from page link:', cachedCgid.substring(0, 16) + '...');
        return cachedCgid;
      }
    }

    console.log('[getCgid] ❌ cgid not found in page');
    return null;
  } catch (error) {
    console.error('[getCgid] Exception:', error);
    return null;
  }
}

/**
 * サーバーからytkn（CSRFトークン）を取得する
 *
 * デッキ編集ページをfetchしてHTMLから抽出する。
 * ページ遷移ごとに変わる64文字のhexトークン。
 *
 * **重要**: デッキ編集ページへのアクセスにはcgidパラメータが必須。
 *
 * @param dno デッキ番号
 * @returns ytkn（64文字hex）、存在しない場合はnull
 */
export async function getYtkn(dno: number): Promise<string | null> {
  try {
    console.log('[getYtkn] Starting ytkn fetch for dno:', dno);

    // まずcgidを取得（デッキ編集ページへのアクセスに必須）
    const cgid = await getCgid();
    if (!cgid) {
      console.error('[getYtkn] Failed to get cgid, cannot access deck edit page');
      return null;
    }

    console.log('[getYtkn] Got cgid:', cgid.substring(0, 16) + '...');

    // デッキ編集ページをfetch（cgidパラメータ付き）
    const url = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&dno=${dno}&cgid=${cgid}&request_locale=ja`;
    console.log('[getYtkn] Fetching URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    console.log('[getYtkn] Fetch complete, status:', response.ok, response.status);

    if (!response.ok) {
      console.error('Failed to fetch deck edit page:', response.status);
      return null;
    }

    const html = await response.text();
    console.log('[getYtkn] HTML length:', html.length, 'first 100 chars:', html.substring(0, 100));

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const input = doc.querySelector('input[name="ytkn"]') as HTMLInputElement;
    console.log('[getYtkn] ytkn input found:', !!input, 'value:', input?.value?.substring(0, 16) + '...');

    if (!input) {
      console.log('[getYtkn] ❌ ytkn input not found');
      return null;
    }

    const value = input.value.trim();
    if (value !== '') {
      console.log('[getYtkn] ✅ ytkn found:', value.substring(0, 16) + '...');
      return value;
    } else {
      console.log('[getYtkn] ❌ ytkn input is empty');
      return null;
    }
  } catch (error) {
    console.error('[getYtkn] Exception:', error);
    return null;
  }
}
