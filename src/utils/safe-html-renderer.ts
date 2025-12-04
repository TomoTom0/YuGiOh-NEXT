/**
 * innerHTML セキュリティ対応ユーティリティ
 *
 * このモジュールは、innerHTML の安全な使用を支援します。
 * HTML コンテンツの動的生成が必要な場合は、このモジュールのツールを使用してください。
 *
 * 重要なセキュリティ原則：
 * 1. ユーザー入力・API データはそのまま innerHTML に渡さない
 * 2. すべての動的コンテンツはエスケープするか、テキストノードとして挿入
 * 3. HTML 文字列の動的構築が必要な場合は escapeHtml() を使用
 * 4. 可能な限り textContent や DOM API を使用
 */

/**
 * HTML 特殊文字をエスケープ
 *
 * @param text エスケープする文字列
 * @returns エスケープされた文字列
 *
 * @example
 * const name = 'Product <img src=x onerror=alert(1)>';
 * const safe = escapeHtml(name); // 'Product &lt;img src=x onerror=alert(1)&gt;'
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] ?? char);
}

/**
 * HTML エスケープされた文字列（テンプレートリテラル用）
 *
 * バックティック内での動的テンプレートで使用してください。
 * ただし、複数の値がある場合は HTML 構築より DOM API の使用を推奨。
 *
 * @param value エスケープする値
 * @returns エスケープされた HTML 安全な文字列
 *
 * @example
 * const cardName = 'Blue-Eyes White Dragon';
 * const html = `<div class="card-name">${eSafe(cardName)}</div>`;
 */
export function eSafe(value: any): string {
  return escapeHtml(String(value));
}

/**
 * テキスト属性を安全にエスケープ
 *
 * @param text テキスト
 * @returns HTML 属性値として安全な文字列
 *
 * @example
 * const title = 'This is a "test"';
 * const html = `<div title="${escapeAttribute(title)}">...</div>`;
 */
export function escapeAttribute(text: string): string {
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * 安全な innerHTML 設定
 *
 * エスケープされた HTML を innerHTML に設定します。
 * すでにエスケープされている HTML のみに使用してください。
 *
 * @param element 対象要素
 * @param html 安全な HTML（すでにエスケープされている）
 * @returns 成功した場合 true
 *
 * @example
 * const escapedName = escapeHtml(apiData.cardName);
 * const html = `<div class="name">${escapedName}</div>`;
 * setSafeInnerHTML(element, html);
 */
export function setSafeInnerHTML(element: Element | null, html: string): boolean {
  if (!element) return false;
  element.innerHTML = html;
  return true;
}

/**
 * テキストコンテンツを安全に設定（推奨）
 *
 * テキストのみを設定する場合は innerHTML より textContent を使用。
 * これは自動的にエスケープされ、XSS から保護されます。
 *
 * @param element 対象要素
 * @param text テキストコンテンツ
 * @returns 成功した場合 true
 *
 * @example
 * setSafeTextContent(element, apiData.description);
 */
export function setSafeTextContent(element: Element | null, text: string): boolean {
  if (!element) return false;
  element.textContent = text;
  return true;
}

/**
 * 安全な HTML 構築ツール（オブジェクト形式）
 *
 * HTML 生成時のセキュリティチェックを支援します。
 * 複雑な HTML 構造が必要な場合は、DOM API または Vue テンプレートの使用を推奨。
 *
 * @example
 * const html = SafeHtmlBuilder.div({
 *   class: 'card-detail',
 *   attributes: { 'data-id': cardId },
 *   content: escapeHtml(cardName)
 * });
 */
export const SafeHtmlBuilder = {
  /**
   * div 要素を構築
   */
  div(options: {
    class?: string;
    attributes?: Record<string, string>;
    content?: string;
  }): string {
    const attrs = Object.entries(options.attributes || {})
      .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
      .join('');
    const classList = options.class ? ` class="${options.class}"` : '';
    const content = options.content || '';
    return `<div${classList}${attrs}>${content}</div>`;
  },

  /**
   * span 要素を構築
   */
  span(options: {
    class?: string;
    attributes?: Record<string, string>;
    content?: string;
  }): string {
    const attrs = Object.entries(options.attributes || {})
      .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
      .join('');
    const classList = options.class ? ` class="${options.class}"` : '';
    const content = options.content || '';
    return `<span${classList}${attrs}>${content}</span>`;
  },

  /**
   * p 要素を構築
   */
  p(options: {
    class?: string;
    attributes?: Record<string, string>;
    content?: string;
  }): string {
    const attrs = Object.entries(options.attributes || {})
      .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
      .join('');
    const classList = options.class ? ` class="${options.class}"` : '';
    const content = options.content || '';
    return `<p${classList}${attrs}>${content}</p>`;
  },

  /**
   * a（リンク）要素を構築
   */
  a(options: {
    href: string;
    class?: string;
    attributes?: Record<string, string>;
    content?: string;
  }): string {
    const href = escapeAttribute(options.href);
    const attrs = Object.entries(options.attributes || {})
      .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
      .join('');
    const classList = options.class ? ` class="${options.class}"` : '';
    const content = options.content || '';
    return `<a href="${href}"${classList}${attrs}>${content}</a>`;
  },
};

/**
 * innerHTML の危険パターン（参考）
 *
 * 以下のパターンは XSS 脆弱性を引き起こします：
 *
 * ```typescript
 * // ❌ 危険
 * element.innerHTML = `<div>${userInput}</div>`; // ユーザー入力をそのまま使用
 * element.innerHTML = `<div>${apiData.name}</div>`; // API データをそのまま使用
 * element.innerHTML = `<div title="${url}">Click</div>`; // URL 属性が未エスケープ
 *
 * // ✅ 安全
 * element.innerHTML = `<div>${escapeHtml(userInput)}</div>`;
 * element.innerHTML = `<div>${escapeHtml(apiData.name)}</div>`;
 * element.innerHTML = `<div title="${escapeAttribute(url)}">Click</div>`;
 *
 * // ✅ さらに安全（推奨）
 * element.textContent = userInput; // テキストのみなら textContent を使用
 * const div = document.createElement('div');
 * div.textContent = userInput; // DOM API で動的生成
 * element.appendChild(div);
 * ```
 */

/**
 * HTML コンテンツの安全性チェック
 *
 * 開発時にだけ使用する診断ツール
 * （本番環境では実装されていない可能性があります）
 *
 * @param html チェック対象の HTML
 * @returns 潜在的なセキュリティリスクのリスト
 *
 * @example
 * const issues = checkHTMLSafety(userProvidedHTML);
 * if (issues.length > 0) {
 *   console.warn('Potential XSS risks:', issues);
 * }
 */
export function checkHTMLSafety(html: string): string[] {
  const issues: string[] = [];
  const dangerousPatterns = [
    { pattern: /javascript:/i, message: 'javascript: プロトコルが検出されました' },
    { pattern: /on\w+\s*=/i, message: 'インラインイベントハンドラが検出されました' },
    { pattern: /<script/i, message: '<script> タグが検出されました' },
    { pattern: /<iframe/i, message: '<iframe> タグが検出されました' },
    { pattern: /<object|<embed/i, message: '<object>/<embed> タグが検出されました' },
  ];

  dangerousPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(html)) {
      issues.push(message);
    }
  });

  return issues;
}
