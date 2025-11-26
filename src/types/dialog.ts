/**
 * ダイアログコンポーネントの型定義
 */

import type { TagGroup } from '../constants/tag-master-data';

/**
 * カテゴリエントリ
 */
export interface CategoryEntry {
  value: string;        // 内部値（例: "4", "517"）
  label: string;        // 表示名（例: "アクアアクトレス"）
  originalIndex: number; // オリジナルの並び順
  group: string[];      // 所属グループ（複数可）例: ["ruby_ア"] or ["ruby_レ", "ruby_ロ", "ruby_ワ"]
}

/**
 * タグエントリ
 */
export interface TagEntry {
  value: string;   // タグID
  label: string;   // タグ名
  group: TagGroup; // グループ（自動分類される）
  internalKey?: string; // 内部キー（属性・種族の英語キー）
}
