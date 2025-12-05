/**
 * querySelector の null チェック一貫性を確保するためのセーフユーティリティ
 *
 * このモジュールは、querySelector/querySelectorAll の安全な使用を促進します。
 * 次の方針に基づいています：
 * 1. null チェックは必ず実施する
 * 2. チェーン操作の前に null を確認する
 * 3. Optional chaining (?.

) を活用する
 */

/**
 * querySelector の結果を安全に取得し、存在チェック付きで返す
 *
 * @param selector CSS セレクタ
 * @param parent 検索対象の親要素（省略時は document）
 * @returns 見つかった要素、または null
 *
 * @example
 * const elem = safeQuery('#myElement');
 * if (elem) {
 *   elem.textContent = 'Hello';
 * }
 */
export function safeQuery<T extends Element = Element>(
  selector: string,
  parent?: Document | Element
): T | null {
  const searchTarget = parent || document;
  const result = searchTarget.querySelector<T>(selector);
  return result || null;
}

/**
 * querySelector を実行し、見つからない場合は警告を出す
 *
 * @param selector CSS セレクタ
 * @param errorMessage カスタムエラーメッセージ（省略時は自動生成）
 * @param parent 検索対象の親要素（省略時は document）
 * @returns 見つかった要素、または null
 *
 * @example
 * const elem = safeQueryWithWarn('#required-element', 'Required element not found');
 */
export function safeQueryWithWarn<T extends Element = Element>(
  selector: string,
  errorMessage?: string,
  parent?: Document | Element
): T | null {
  const searchTarget = parent || document;
  const result = searchTarget.querySelector<T>(selector);

  if (!result) {
    console.warn(
      errorMessage || `[safeQueryWithWarn] Element not found: "${selector}"`
    );
  }

  return result || null;
}

/**
 * querySelectorAll の結果を安全に配列に変換して返す
 *
 * @param selector CSS セレクタ
 * @param parent 検索対象の親要素（省略時は document）
 * @returns 見つかった要素の配列（見つからない場合は空配列）
 *
 * @example
 * const elements = safeQueryAll('.item');
 * elements.forEach(el => {
 *   console.log(el.textContent);
 * });
 */
export function safeQueryAll<T extends Element = Element>(
  selector: string,
  parent?: Document | Element
): T[] {
  const searchTarget = parent || document;
  const nodeList = searchTarget.querySelectorAll<T>(selector);
  return Array.from(nodeList);
}

/**
 * querySelector でチェーン操作を行う場合の安全なヘルパー
 *
 * @param selector CSS セレクタ
 * @param callback 見つかった場合の処理
 * @param parent 検索対象の親要素（省略時は document）
 *
 * @example
 * safeQueryAndRun('#element', (elem) => {
 *   elem.textContent = 'Found!';
 * });
 */
export function safeQueryAndRun<T extends Element = Element>(
  selector: string,
  callback: (element: T) => void,
  parent?: Document | Element
): void {
  const element = safeQuery<T>(selector, parent);
  if (element) {
    callback(element);
  }
}

/**
 * getAttribute を安全に取得する（null チェック済み）
 *
 * @param selector CSS セレクタ
 * @param attr 属性名
 * @param parent 検索対象の親要素（省略時は document）
 * @returns 属性値、または null
 *
 * @example
 * const href = safeGetAttribute('a#my-link', 'href');
 * if (href) {
 *   window.location.href = href;
 * }
 */
export function safeGetAttribute(
  selector: string,
  attr: string,
  parent?: Document | Element
): string | null {
  const element = safeQuery(selector, parent);
  return element?.getAttribute(attr) ?? null;
}

/**
 * textContent を安全に取得する（null チェック済み）
 *
 * @param selector CSS セレクタ
 * @param parent 検索対象の親要素（省略時は document）
 * @returns テキスト内容、または null
 *
 * @example
 * const title = safeGetText('h1');
 * console.log(title);
 */
export function safeGetText(
  selector: string,
  parent?: Document | Element
): string | null {
  const element = safeQuery(selector, parent);
  return element?.textContent?.trim() ?? null;
}

/**
 * innerHTML を安全に設定する（チェーン操作なし）
 *
 * 注意：innerHTML は XSS リスクを持つため、動的コンテンツの設定時は注意が必要です
 *
 * @param selector CSS セレクタ
 * @param html 設定する HTML
 * @param parent 検索対象の親要素（省略時は document）
 * @returns 成功した場合は true、見つからない場合は false
 *
 * @example
 * const success = safeSetHTML('#container', '<p>Hello</p>');
 */
export function safeSetHTML(
  selector: string,
  html: string,
  parent?: Document | Element
): boolean {
  const element = safeQuery(selector, parent);
  if (element) {
    element.innerHTML = html;
    return true;
  }
  return false;
}

/**
 * setAttribute を安全に設定する（チェーン操作なし）
 *
 * @param selector CSS セレクタ
 * @param attr 属性名
 * @param value 属性値
 * @param parent 検索対象の親要素（省略時は document）
 * @returns 成功した場合は true、見つからない場合は false
 *
 * @example
 * const success = safeSetAttribute('#link', 'href', 'https://example.com');
 */
export function safeSetAttribute(
  selector: string,
  attr: string,
  value: string,
  parent?: Document | Element
): boolean {
  const element = safeQuery(selector, parent);
  if (element) {
    element.setAttribute(attr, value);
    return true;
  }
  return false;
}

/**
 * classList.add を安全に実行する（チェーン操作なし）
 *
 * @param selector CSS セレクタ
 * @param className クラス名
 * @param parent 検索対象の親要素（省略時は document）
 * @returns 成功した場合は true、見つからない場合は false
 *
 * @example
 * safeAddClass('#btn', 'active');
 */
export function safeAddClass(
  selector: string,
  className: string,
  parent?: Document | Element
): boolean {
  const element = safeQuery(selector, parent);
  if (element) {
    element.classList.add(className);
    return true;
  }
  return false;
}

/**
 * classList.remove を安全に実行する（チェーン操作なし）
 *
 * @param selector CSS セレクタ
 * @param className クラス名
 * @param parent 検索対象の親要素（省略時は document）
 * @returns 成功した場合は true、見つからない場合は false
 *
 * @example
 * safeRemoveClass('#btn', 'active');
 */
export function safeRemoveClass(
  selector: string,
  className: string,
  parent?: Document | Element
): boolean {
  const element = safeQuery(selector, parent);
  if (element) {
    element.classList.remove(className);
    return true;
  }
  return false;
}

/**
 * イベントリスナーを安全に追加する（チェーン操作なし）
 *
 * @param selector CSS セレクタ
 * @param event イベント名
 * @param handler イベントハンドラ
 * @param parent 検索対象の親要素（省略時は document）
 * @returns 成功した場合は true、見つからない場合は false
 *
 * @example
 * safeAddEventListener('#btn', 'click', () => {
 *   console.log('Clicked!');
 * });
 */
export function safeAddEventListener<K extends keyof HTMLElementEventMap>(
  selector: string,
  event: K,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  parent?: Document | Element
): boolean {
  const element = safeQuery<HTMLElement>(selector, parent);
  if (element) {
    element.addEventListener(event, handler);
    return true;
  }
  return false;
}
