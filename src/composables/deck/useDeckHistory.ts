/**
 * デッキレシピ履歴管理
 *
 * 公式保存の成功時と、履歴が無いデッキの読み込み時に、レシピの版を
 * localStorage へ記録する。編集のたびの記録はしない
 * （編集中の巻き戻しは Undo/Redo が担当）。
 *
 * 設計: TASK-538（単位1: デッキレシピ履歴の記録）
 * 条件書: tests/design/use-deck-history/conditions.toml
 */

import type { DeckInfo } from "@/types/deck";
import { STORAGE_KEY_DECK_HISTORY } from "@/constants/storage-keys";
import { isRecordOfStringKeys, isString, isNumber } from "@/utils/type-guards";
import {
  captureDeckSnapshot,
  captureDeckSnapshotWithoutOrder
} from "./useDeckSnapshot";

/** 1デッキあたりの保持上限 */
export const MAX_DECK_HISTORY_VERSIONS = 30;

/** 記録の契機 */
export type DeckHistorySource = "save" | "load";

/**
 * レシピ履歴の1版
 */
export interface DeckHistoryEntry {
  /** 版ID */
  id: string;
  /** 記録時刻 (epoch ms) */
  recordedAt: number;
  /** 記録の契機 */
  source: DeckHistorySource;
  /** captureDeckSnapshot の JSON 文字列（並び順を含む完全なスナップショット） */
  snapshot: string;
  /** 並び順を除いた正規化スナップショット（重複判定用） */
  normalized: string;
}

/** localStorage に保存する全体の形状（キーはデッキ番号の文字列） */
type DeckHistoryStorage = Record<string, DeckHistoryEntry[]>;

function isDeckHistoryEntry(value: unknown): value is DeckHistoryEntry {
  if (!isRecordOfStringKeys(value)) {
    return false;
  }
  return (
    isString(value.id) &&
    isNumber(value.recordedAt) &&
    (value.source === "save" || value.source === "load") &&
    isString(value.snapshot) &&
    isString(value.normalized)
  );
}

function isDeckHistoryStorage(value: unknown): value is DeckHistoryStorage {
  if (!isRecordOfStringKeys(value)) {
    return false;
  }
  return Object.values(value).every(
    (entries) => Array.isArray(entries) && entries.every(isDeckHistoryEntry)
  );
}

/**
 * 保存済みの履歴全体を読み取る
 *
 * 壊れたデータ・想定外の形状の場合は空として扱う（例外を投げない）。
 */
function readDeckHistoryStorage(): DeckHistoryStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DECK_HISTORY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isDeckHistoryStorage(parsed)) {
      return {};
    }
    return parsed;
  } catch (error) {
    console.error("Failed to read deck history:", error);
    return {};
  }
}

/**
 * 履歴全体を書き込む
 *
 * @returns 成功時は true、失敗時は false（例外を投げない）
 */
function writeDeckHistoryStorage(storage: DeckHistoryStorage): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_DECK_HISTORY, JSON.stringify(storage));
    return true;
  } catch (error) {
    console.error("Failed to write deck history:", error);
    return false;
  }
}

/**
 * 指定デッキの履歴を取得する（古い順）
 *
 * @param dno デッキ番号
 * @returns 履歴の配列（無い場合は空配列）
 */
export function getDeckHistory(dno: number): DeckHistoryEntry[] {
  const entries = readDeckHistoryStorage()[String(dno)];
  return entries ? [...entries] : [];
}

/**
 * レシピの版を記録する
 *
 * 並び順を除いた構成が直近の版と同一なら記録しない。
 * 上限（MAX_DECK_HISTORY_VERSIONS）を超える場合は古い順に削除する。
 * 記録に失敗しても例外は投げない（保存・読込フロー本体を壊さないため）。
 *
 * @param deckInfo 記録するデッキ情報
 * @param source 記録の契機
 * @returns 記録した場合は true、記録しなかった・失敗した場合は false
 */
export function recordDeckHistory(
  deckInfo: DeckInfo,
  source: DeckHistorySource
): boolean {
  try {
    const storage = readDeckHistoryStorage();
    const key = String(deckInfo.dno);
    const entries = storage[key] ?? [];

    const normalized = captureDeckSnapshotWithoutOrder(deckInfo);
    const latest = entries[entries.length - 1];
    if (latest && latest.normalized === normalized) {
      return false;
    }

    const entry: DeckHistoryEntry = {
      id: crypto.randomUUID(),
      recordedAt: Date.now(),
      source,
      snapshot: captureDeckSnapshot(deckInfo),
      normalized
    };

    storage[key] = [...entries, entry].slice(-MAX_DECK_HISTORY_VERSIONS);
    return writeDeckHistoryStorage(storage);
  } catch (error) {
    console.error("Failed to record deck history:", error);
    return false;
  }
}

/**
 * 起点の版を記録する（読み込み時用）
 *
 * そのデッキの履歴が無い場合のみ、読み込んだ版を起点として記録する。
 *
 * @param deckInfo 読み込んだデッキ情報
 * @returns 記録した場合は true
 */
export function recordDeckHistoryOrigin(deckInfo: DeckInfo): boolean {
  const existing = readDeckHistoryStorage()[String(deckInfo.dno)];
  if (existing && existing.length > 0) {
    return false;
  }
  return recordDeckHistory(deckInfo, "load");
}

/**
 * 指定デッキの履歴を削除する（デッキ削除時に呼ぶ）
 *
 * 履歴が無い場合もエラーにしない。例外は投げない。
 *
 * @param dno デッキ番号
 */
export function removeDeckHistory(dno: number): void {
  try {
    const storage = readDeckHistoryStorage();
    const key = String(dno);
    if (!(key in storage)) {
      return;
    }
    delete storage[key];
    writeDeckHistoryStorage(storage);
  } catch (error) {
    console.error("Failed to remove deck history:", error);
  }
}
