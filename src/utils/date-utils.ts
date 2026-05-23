/**
 * 日付関連のユーティリティ関数
 */

/**
 * 2つのタイムスタンプが同じ日付（YYYY-MM-DD）かどうかを判定
 * @param timestamp1 タイムスタンプ1（ミリ秒）
 * @param timestamp2 タイムスタンプ2（ミリ秒）
 * @returns 同じ日付ならtrue
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * タイムスタンプを YYYY-MM-DD 形式の文字列に変換
 * @param timestamp タイムスタンプ（ミリ秒）
 * @returns YYYY-MM-DD 形式の文字列
 */
export function toDateString(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 今日の0時0分0秒のタイムスタンプを取得
 * @returns タイムスタンプ（ミリ秒）
 */
export function getTodayStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/**
 * 今日の23時59分59秒のタイムスタンプを取得
 * @returns タイムスタンプ（ミリ秒）
 */
export function getTodayEnd(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
}
