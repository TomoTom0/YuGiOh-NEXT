/**
 * DOMからcgid（ユーザー識別子）を取得する
 *
 * cgidはHttpOnly属性付きcookieなのでJavaScriptから読めない。
 * 代わりに、ページ内のリンクやフォーム要素から抽出する。
 *
 * @returns cgid（32文字hex）、存在しない場合はnull
 */
export function getCgid(): string | null {
  // 1. hidden inputから取得を試みる
  const hiddenInput = document.querySelector('input[name="cgid"]') as HTMLInputElement;
  if (hiddenInput && hiddenInput.value) {
    return hiddenInput.value.trim();
  }

  // 2. ページ内のリンクから取得を試みる
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="cgid="]');
  for (const link of links) {
    const match = link.href.match(/cgid=([a-f0-9]{32})/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * DOMからytkn（CSRFトークン）を取得する
 *
 * ページ遷移ごとに変わる64文字のhexトークン
 * input[name="ytkn"]要素から取得
 *
 * @returns ytkn（64文字hex）、存在しない場合はnull
 */
export function getYtkn(): string | null {
  const input = document.querySelector('input[name="ytkn"]') as HTMLInputElement;

  if (!input) {
    return null;
  }

  const value = input.value.trim();
  return value !== '' ? value : null;
}
