/**
 * デッキUndoRedoコマンド履歴管理
 *
 * deck-edit.ts のコマンド履歴管理ロジックを抽出した composable
 */

import { ref, computed, type Ref } from 'vue';

/**
 * コマンドパターンのインターフェース
 */
export interface Command {
  execute: () => void;
  undo: () => void;
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
    getCurrentIndex
  };
}
