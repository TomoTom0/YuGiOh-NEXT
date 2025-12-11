/**
 * 型安全性を確保するための型ガード関数
 *
 * 'as' キャストの代わりに使用してください。
 * 実行時に型をチェックし、型の安全性を保証します。
 */

/**
 * 要素が HTMLElement かどうかをチェック
 *
 * @param element 対象要素
 * @returns HTMLElement である場合は true
 *
 * @example
 * const elem = document.querySelector('div');
 * if (isHTMLElement(elem)) {
 *   elem.textContent = 'Safe operation';
 * }
 */
export function isHTMLElement(element: any): element is HTMLElement {
  return element instanceof HTMLElement;
}

/**
 * 要素が HTMLInputElement かどうかをチェック
 *
 * @param element 対象要素
 * @returns HTMLInputElement である場合は true
 *
 * @example
 * const input = document.querySelector('input');
 * if (isHTMLInputElement(input)) {
 *   const value = input.value;
 * }
 */
export function isHTMLInputElement(element: any): element is HTMLInputElement {
  return element instanceof HTMLInputElement;
}

/**
 * 要素が HTMLImageElement かどうかをチェック
 *
 * @param element 対象要素
 * @returns HTMLImageElement である場合は true
 *
 * @example
 * const img = document.querySelector('img');
 * if (isHTMLImageElement(img)) {
 *   const src = img.src;
 * }
 */
export function isHTMLImageElement(element: any): element is HTMLImageElement {
  return element instanceof HTMLImageElement;
}

/**
 * 要素が HTMLSelectElement かどうかをチェック
 *
 * @param element 対象要素
 * @returns HTMLSelectElement である場合は true
 */
export function isHTMLSelectElement(element: any): element is HTMLSelectElement {
  return element instanceof HTMLSelectElement;
}

/**
 * 要素が HTMLButtonElement かどうかをチェック
 *
 * @param element 対象要素
 * @returns HTMLButtonElement である場合は true
 */
export function isHTMLButtonElement(element: any): element is HTMLButtonElement {
  return element instanceof HTMLButtonElement;
}

/**
 * 要素が HTMLAnchorElement かどうかをチェック
 *
 * @param element 対象要素
 * @returns HTMLAnchorElement である場合は true
 */
export function isHTMLAnchorElement(element: any): element is HTMLAnchorElement {
  return element instanceof HTMLAnchorElement;
}

/**
 * 要素が HTMLOptionElement かどうかをチェック
 *
 * @param element 対象要素
 * @returns HTMLOptionElement である場合は true
 */
export function isHTMLOptionElement(element: any): element is HTMLOptionElement {
  return element instanceof HTMLOptionElement;
}

/**
 * 要素が HTMLTextAreaElement かどうかをチェック
 *
 * @param element 対象要素
 * @returns HTMLTextAreaElement である場合は true
 */
export function isHTMLTextAreaElement(element: any): element is HTMLTextAreaElement {
  return element instanceof HTMLTextAreaElement;
}

/**
 * オブジェクトが Record<string, T> かどうかをチェック
 *
 * @param obj 対象オブジェクト
 * @returns Record<string, any> である場合は true
 *
 * @example
 * const obj = someValue;
 * if (isRecord(obj)) {
 *   const value = obj['key'];
 * }
 */
export function isRecord(obj: any): obj is Record<string, any> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * オブジェクトがプロパティを持つかチェック
 *
 * @param obj 対象オブジェクト
 * @param key 確認するキー
 * @returns キーが存在する場合は true
 *
 * @example
 * const obj = { name: 'test' };
 * if (hasProperty(obj, 'name')) {
 *   console.log(obj.name); // Type-safe
 * }
 */
export function hasProperty<K extends PropertyKey>(
  obj: any,
  key: K
): obj is Record<K, any> {
  return isRecord(obj) && key in obj;
}

/**
 * 値が null または undefined ではないかチェック
 *
 * @param value 対象値
 * @returns null でも undefined でもない場合は true
 *
 * @example
 * const value: string | null = getValue();
 * if (isDefined(value)) {
 *   console.log(value); // value は string 型
 * }
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 値が string かどうかをチェック
 *
 * @param value 対象値
 * @returns string である場合は true
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * 値が number かどうかをチェック
 *
 * @param value 対象値
 * @returns number である場合は true
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 値が boolean かどうかをチェック
 *
 * @param value 対象値
 * @returns boolean である場合は true
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 値が配列かどうかをチェック
 *
 * @param value 対象値
 * @returns 配列である場合は true
 */
export function isArray<T = any>(value: any): value is T[] {
  return Array.isArray(value);
}

/**
 * 値が特定の enum 値かどうかをチェック
 *
 * @param value 対象値
 * @param enumObject enum オブジェクト
 * @returns enum メンバーである場合は true
 *
 * @example
 * enum Status { Active = 'active', Inactive = 'inactive' }
 * const value: string = 'active';
 * if (isEnumMember(value, Status)) {
 *   // value は Status の型
 * }
 */
export function isEnumMember<T extends Record<string, string | number>>(
  value: any,
  enumObject: T
): value is T[keyof T] {
  return Object.values(enumObject).includes(value);
}

/**
 * querySelector 結果を特定の型でアサートする
 *
 * @param selector セレクタ
 * @param typeGuard 型ガード関数
 * @param parent 検索対象の親要素（省略時は document）
 * @returns 見つかり、型ガードを通過した場合は要素。それ以外は null
 *
 * @example
 * const input = safeQueryAs(
 *   'input[type="text"]',
 *   isHTMLInputElement,
 *   element
 * );
 * if (input) {
 *   const value = input.value; // Type-safe
 * }
 */
export function safeQueryAs<T extends Element>(
  selector: string,
  typeGuard: (element: any) => element is T,
  parent?: Document | Element
): T | null {
  const searchTarget = parent || document;
  const element = searchTarget.querySelector(selector);

  if (element && typeGuard(element)) {
    return element;
  }

  return null;
}

/**
 * オブジェクトを特定の型にキャストする
 *
 * @param obj 対象オブジェクト
 * @param typeGuard 型ガード関数
 * @returns 型ガードを通過した場合はオブジェクト。それ以外は null
 *
 * @example
 * const data: unknown = someValue;
 * const record = safeCastAs(data, isRecord);
 * if (record) {
 *   const value = record['key']; // Type-safe
 * }
 */
export function safeCastAs<T>(
  obj: any,
  typeGuard: (value: any) => value is T
): T | null {
  return typeGuard(obj) ? obj : null;
}

/**
 * 複数の型ガード条件を AND で結合
 *
 * @param value 対象値
 * @param guards 複数の型ガード関数
 * @returns 全ての型ガードを通過した場合は true
 *
 * @example
 * if (allGuards(value, isRecord, (v) => hasProperty(v, 'name'))) {
 *   // value は Record で 'name' プロパティを持つ
 * }
 */
export function allGuards<T>(
  value: any,
  ...guards: Array<(value: any) => boolean>
): value is T {
  return guards.every(guard => guard(value));
}

/**
 * 複数の型ガード条件を OR で結合
 *
 * @param value 対象値
 * @param guards 複数の型ガード関数
 * @returns 少なくとも1つの型ガードを通過した場合は true
 *
 * @example
 * if (anyGuard(value, isString, isNumber)) {
 *   // value は string または number
 * }
 */
export function anyGuard<T>(
  value: any,
  ...guards: Array<(value: any) => boolean>
): value is T {
  return guards.some(guard => guard(value));
}

/**
 * デッキタイプの有効な値かどうかをチェック
 *
 * @param value チェック対象の値
 * @returns DeckTypeValue である場合は true
 *
 * @example
 * if (isDeckTypeValue(value)) {
 *   deckType = value;  // 安全に代入可能
 * }
 */
export function isDeckTypeValue(value: any): value is '0' | '1' | '2' | '3' {
  return typeof value === 'string' && ['0', '1', '2', '3'].includes(value);
}

/**
 * デッキスタイルの有効な値かどうかをチェック
 *
 * @param value チェック対象の値
 * @returns DeckStyleValue である場合は true
 *
 * @example
 * if (isDeckStyleValue(value)) {
 *   deckStyle = value;  // 安全に代入可能
 * }
 */
export function isDeckStyleValue(value: any): value is '-1' | '0' | '1' | '2' {
  return typeof value === 'string' && ['-1', '0', '1', '2'].includes(value);
}
