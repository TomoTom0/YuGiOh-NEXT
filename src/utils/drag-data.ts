/**
 * ドラッグ＆ドロップデータのシリアライズ/パースユーティリティ
 *
 * デッキ編集・Practiceの両システムで共通して使用する
 * ドラッグデータの型安全な読み書きを提供する
 */

import type { CardInfo } from '@/types/card';
import { isRecord } from './type-guards';

/**
 * デッキ編集用ドラッグデータ
 */
export type SectionType = 'main' | 'extra' | 'side' | 'trash' | 'search' | 'info';

export interface DeckDragData {
  sectionType: SectionType;
  index: number;
  /**
   * ドラッグ中のカード
   * 本体は CardInfo。供給元によっては cid（DeckCardRef 形式）や
   * empty（空スロットのプレースホルダ）を持つ場合がある
   */
  card: CardInfo & { cid?: string; empty?: boolean };
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
 * isDeckDragData が保証する、Deck系ドラッグデータのカード部分の最小形。
 *
 * ガードが保証するのは、カードの識別子（cardId または cid）と ciid が
 * 識別子として使える値で存在することのみ。CardInfo 全体の完全性は
 * 保証しない（デッキ編集側の消費は parseDragData<DeckDragData> の
 * 表明で扱う）。
 *
 * 識別子が cardId / cid のどちらか一方でよいのは、DeckCardRef 形式
 * （cid のみ）のペイロードを受容するのが既存の振る舞いであるため。
 * 識別子・ciid は文字列のほか数値も受容する（文字列化は消費側の責務）。
 * どちらも欠けるペイロードは、消費側で String(undefined) が識別子として
 * 送出されてしまうため、ガードで弾く。
 *
 * empty は型に含めるが検証はしない。消費側（PracticeSlot /
 * PracticeHandArea）が真偽値として参照し、不正な値でもドロップが
 * 無視される側に倒れるためである。DeckDragDataRef の index / uuid も
 * 同様に検証しない（ガードの消費側は参照しない）。
 */
export interface DeckDragCardRef {
  /** カードID（CardInfo 形式で供給される場合） */
  cardId?: string | number;
  /** カードID（DeckCardRef 形式で供給される場合） */
  cid?: string | number;
  /** 画像識別子 */
  ciid: string | number;
  /** 空スロットのプレースホルダかどうか */
  empty?: boolean;
}

/**
 * isDeckDragData が保証する Deck系ドラッグデータの最小形
 */
export interface DeckDragDataRef {
  sectionType: string;
  index?: number;
  uuid?: string;
  card: DeckDragCardRef;
}

function isDragCardId(value: unknown): value is string | number {
  return (
    (typeof value === 'string' && value !== '') ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

/**
 * Deck系ドラッグデータの型ガード
 *
 * sectionType が文字列であること、card がオブジェクトであること、
 * カードの識別子と ciid が空でない文字列または有限の数値として
 * 存在することを検証する。
 *
 * 識別子の選択は消費側の `cardId ?? cid` に合わせる。?? は
 * null / undefined でしか cid へ進まないため、cardId が存在するが
 * 識別子として使えない値の場合は、cid が有効でも弾く。
 */
export function isDeckDragData(data: unknown): data is DeckDragDataRef {
  if (!isRecord(data)) return false;
  if (typeof data.sectionType !== 'string') return false;
  const card = data.card;
  if (!isRecord(card)) return false;
  if (!isDragCardId(card.cardId) && !(card.cardId == null && isDragCardId(card.cid))) {
    return false;
  }
  return isDragCardId(card.ciid);
}
