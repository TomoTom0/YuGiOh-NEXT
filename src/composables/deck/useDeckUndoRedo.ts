/**
 * デッキUndoRedoコマンド履歴管理
 *
 * deck-edit.ts のコマンド履歴管理ロジックを抽出した composable
 */

import { ref, computed, type Ref } from 'vue';

/**
 * コマンドの操作タイプ
 */
export type CommandType = 'add' | 'remove' | 'move' | 'reorder';

/**
 * コマンドパターンのインターフェース
 */
export interface Command {
  execute: () => void;
  undo: () => void;
  /** 操作の説明（例: "追加: ブルーアイズ → メインデッキ"） */
  description?: string;
  /** 操作日時（タイムスタンプ） */
  timestamp?: number;
  /** 操作タイプ（色分け用） */
  type?: CommandType;
}

/**
 * コマンド履歴の最大サイズ（メモリ使用量制限）
 */
export const MAX_COMMAND_HISTORY = 100;

/**
 * デッキUndoRedoコマンド履歴管理
 *
 * @returns Undo/Redoの状態と操作
 */
export function useDeckUndoRedo() {
  // コマンド履歴
  const commandHistory: Ref<Command[]> = ref([]);

  // 現在のコマンドインデックス（-1は履歴なし）
  const commandIndex: Ref<number> = ref(-1);

  // Undo可能かどうか
  const canUndo = computed(() => commandIndex.value >= 0);

  // Redo可能かどうか
  const canRedo = computed(() => commandIndex.value < commandHistory.value.length - 1);

  /**
   * コマンドを履歴に追加
   *
   * @param command - 追加するコマンド
   */
  function pushCommand(command: Command): void {
    // 現在の位置より後ろのコマンドを削除（分岐履歴を破棄）
    if (commandIndex.value < commandHistory.value.length - 1) {
      commandHistory.value.splice(commandIndex.value + 1);
    }

    // timestampが未設定の場合は自動設定
    if (command.timestamp === undefined) {
      command.timestamp = Date.now();
    }

    // 新しいコマンドを追加
    commandHistory.value.push(command);
    commandIndex.value = commandHistory.value.length - 1;

    // 履歴の上限を超えたら古い履歴を削除（メモリ使用量を制限）
    if (commandHistory.value.length > MAX_COMMAND_HISTORY) {
      const deleteCount = commandHistory.value.length - MAX_COMMAND_HISTORY;
      commandHistory.value.splice(0, deleteCount);
      commandIndex.value -= deleteCount;
    }
  }

  /**
   * 操作を取り消す（Undo）
   */
  function undo(): void {
    if (!canUndo.value) {
      console.warn('[useDeckUndoRedo] Cannot undo: no more commands in history');
      return;
    }

    const command = commandHistory.value[commandIndex.value];
    if (command) {
      command.undo();
    }
    commandIndex.value--;
  }

  /**
   * 操作をやり直す（Redo）
   */
  function redo(): void {
    if (!canRedo.value) {
      console.warn('[useDeckUndoRedo] Cannot redo: already at the latest state');
      return;
    }

    commandIndex.value++;
    const command = commandHistory.value[commandIndex.value];
    if (command) {
      command.execute();
    }
  }

  /**
   * コマンド履歴をクリア
   */
  function clearHistory(): void {
    commandHistory.value = [];
    commandIndex.value = -1;
  }

  /**
   * 現在の履歴サイズを取得
   *
   * @returns 履歴の要素数
   */
  function getHistorySize(): number {
    return commandHistory.value.length;
  }

  /**
   * 現在のインデックスを取得
   *
   * @returns 現在のコマンドインデックス
   */
  function getCurrentIndex(): number {
    return commandIndex.value;
  }

  /**
   * 次にundoされる操作の説明を取得
   *
   * @returns 説明文字列（undo不可の場合はundefined）
   */
  function getUndoDescription(): string | undefined {
    if (!canUndo.value) return undefined;
    const command = commandHistory.value[commandIndex.value];
    return command?.description;
  }

  /**
   * 次にredoされる操作の説明を取得
   *
   * @returns 説明文字列（redo不可の場合はundefined）
   */
  function getRedoDescription(): string | undefined {
    if (!canRedo.value) return undefined;
    const command = commandHistory.value[commandIndex.value + 1];
    return command?.description;
  }

  /**
   * 次にundoされる操作のタイプを取得
   *
   * @returns 操作タイプ（undo不可の場合はundefined）
   */
  function getUndoType(): CommandType | undefined {
    if (!canUndo.value) return undefined;
    const command = commandHistory.value[commandIndex.value];
    return command?.type;
  }

  /**
   * 次にredoされる操作のタイプを取得
   *
   * @returns 操作タイプ（redo不可の場合はundefined）
   */
  function getRedoType(): CommandType | undefined {
    if (!canRedo.value) return undefined;
    const command = commandHistory.value[commandIndex.value + 1];
    return command?.type;
  }

  /**
   * 指定したインデックスまで履歴を移動（ジャンプ）
   * 現在位置より前ならundo、後ならredoを繰り返す
   *
   * @param targetIndex - 移動先のインデックス
   * @returns 移動に成功したかどうか
   */
  function jumpToIndex(targetIndex: number): boolean {
    // 範囲チェック
    if (targetIndex < -1 || targetIndex >= commandHistory.value.length) {
      console.warn('[useDeckUndoRedo] Invalid target index:', targetIndex);
      return false;
    }

    // 現在位置と同じなら何もしない
    if (targetIndex === commandIndex.value) {
      return true;
    }

    // 現在位置より前へ移動 = undo
    while (commandIndex.value > targetIndex) {
      const command = commandHistory.value[commandIndex.value];
      if (command) {
        command.undo();
      }
      commandIndex.value--;
    }

    // 現在位置より後ろへ移動 = redo
    while (commandIndex.value < targetIndex) {
      commandIndex.value++;
      const command = commandHistory.value[commandIndex.value];
      if (command) {
        command.execute();
      }
    }

    return true;
  }

  return {
    // 状態
    commandHistory,
    commandIndex,
    canUndo,
    canRedo,

    // 操作
    pushCommand,
    undo,
    redo,
    clearHistory,
    getHistorySize,
    getCurrentIndex,
    getUndoDescription,
    getRedoDescription,
    getUndoType,
    getRedoType,
    jumpToIndex
  };
}
