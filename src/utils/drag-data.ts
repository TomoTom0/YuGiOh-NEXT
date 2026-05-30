/**
 * ドラッグ＆ドロップデータのシリアライズ/パースユーティリティ
 *
 * デッキ編集・Practiceの両システムで共通して使用する
 * ドラッグデータの型安全な読み書きを提供する
 */

/**
 * デッキ編集用ドラッグデータ
 */
export type SectionType = 'main' | 'extra' | 'side' | 'trash' | 'search';

export interface DeckDragData {
  sectionType: SectionType;
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  card: any;
  uuid: string;
}

/**
 * Practice用ドラッグデータ
 */
export interface PracticeDragData {
  cardId: string;
  zone: string;
  slotIndex?: number;
}

/**
 * ドロップ位置（zone内の1/4分割）
 * insertIndex: 手札など横並びゾーンでの具体的な挿入インデックス
 */
export interface DropPosition {
  isRight: boolean;
  isTop: boolean;
  insertIndex?: number;
}

/**
 * EventがDragEventかつdataTransferが存在するか判定
 */
export function isDragEvent(event: Event): event is DragEvent {
  return event instanceof DragEvent && event.dataTransfer !== null;
}

/**
 * ドラッグデータをdataTransferに設定
 */
export function setDragData(event: DragEvent, data: unknown): void {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData('text/plain', JSON.stringify(data));
}

/**
 * dataTransferからドラッグデータをパース
 * パース失敗時はnullを返す
 *
 * @typeParam T - 期待するデータ型（省略時はRecord<string, unknown>）
 */
export function parseDragData<T = Record<string, unknown>>(event: DragEvent): T | null {
  if (!event.dataTransfer) return null;
  try {
    const raw = event.dataTransfer.getData('text/plain');
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Practice系ドラッグデータの型ガード
 */
export function isPracticeDragData(data: unknown): data is PracticeDragData {
  if (typeof data !== 'object' || data === null) return false;
  const record = data as Record<string, unknown>;
  return typeof record.cardId === 'string' && typeof record.zone === 'string';
}

/**
 * Deck系ドラッグデータの型ガード
 */
export function isDeckDragData(data: unknown): data is DeckDragData {
  if (typeof data !== 'object' || data === null) return false;
  const record = data as Record<string, unknown>;
  return typeof record.sectionType === 'string' && record.card != null;
}
