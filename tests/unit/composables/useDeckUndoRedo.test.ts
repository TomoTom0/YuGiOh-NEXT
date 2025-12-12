/**
 * useDeckUndoRedo composable のユニットテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDeckUndoRedo, type Command, MAX_COMMAND_HISTORY } from '@/composables/deck/useDeckUndoRedo';

describe('useDeckUndoRedo', () => {
  let undoRedo: ReturnType<typeof useDeckUndoRedo>;
  let executionLog: string[];

  beforeEach(() => {
    undoRedo = useDeckUndoRedo();
    executionLog = [];
  });

  /**
   * テスト用コマンドを作成
   */
  function createTestCommand(id: string): Command {
    return {
      execute: () => {
        executionLog.push(`execute:${id}`);
      },
      undo: () => {
        executionLog.push(`undo:${id}`);
      }
    };
  }

  describe('初期状態', () => {
    it('履歴が空である', () => {
      expect(undoRedo.getHistorySize()).toBe(0);
    });

    it('現在のインデックスが-1である', () => {
      expect(undoRedo.getCurrentIndex()).toBe(-1);
    });

    it('Undo/Redoができない', () => {
      expect(undoRedo.canUndo.value).toBe(false);
      expect(undoRedo.canRedo.value).toBe(false);
    });
  });

  describe('pushCommand', () => {
    it('コマンドを追加できる', () => {
      const cmd = createTestCommand('A');
      undoRedo.pushCommand(cmd);

      expect(undoRedo.getHistorySize()).toBe(1);
      expect(undoRedo.getCurrentIndex()).toBe(0);
    });

    it('複数のコマンドを追加できる', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand(createTestCommand('C'));

      expect(undoRedo.getHistorySize()).toBe(3);
      expect(undoRedo.getCurrentIndex()).toBe(2);
    });

    it('Undo後に新しいコマンドを追加すると、以降の履歴が削除される', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand(createTestCommand('C'));

      // 1回Undoする（C → B）
      undoRedo.undo();
      expect(undoRedo.getCurrentIndex()).toBe(1);

      // 新しいコマンドDを追加
      undoRedo.pushCommand(createTestCommand('D'));

      // 履歴は [A, B, D] になる（Cは削除）
      expect(undoRedo.getHistorySize()).toBe(3);
      expect(undoRedo.getCurrentIndex()).toBe(2);
    });

    it('最大履歴数を超えると古い履歴が削除される', () => {
      // MAX_COMMAND_HISTORY + 10 個のコマンドを追加
      for (let i = 0; i < MAX_COMMAND_HISTORY + 10; i++) {
        undoRedo.pushCommand(createTestCommand(`cmd${i}`));
      }

      // 履歴サイズはMAX_COMMAND_HISTORYに制限される
      expect(undoRedo.getHistorySize()).toBe(MAX_COMMAND_HISTORY);
      expect(undoRedo.getCurrentIndex()).toBe(MAX_COMMAND_HISTORY - 1);
    });
  });

  describe('undo', () => {
    it('コマンドがない場合、undoしても何も起こらない', () => {
      undoRedo.undo();
      expect(executionLog).toEqual([]);
    });

    it('1つのコマンドをundoできる', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      executionLog = []; // ログをリセット

      undoRedo.undo();

      expect(executionLog).toEqual(['undo:A']);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
      expect(undoRedo.canUndo.value).toBe(false);
      expect(undoRedo.canRedo.value).toBe(true);
    });

    it('複数のコマンドを順番にundoできる', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand(createTestCommand('C'));
      executionLog = [];

      undoRedo.undo(); // C をundo
      undoRedo.undo(); // B をundo
      undoRedo.undo(); // A をundo

      expect(executionLog).toEqual(['undo:C', 'undo:B', 'undo:A']);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
      expect(undoRedo.canUndo.value).toBe(false);
      expect(undoRedo.canRedo.value).toBe(true);
    });

    it('既にundo済みの場合、undoしても何も起こらない', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.undo();
      executionLog = [];

      undoRedo.undo(); // もう一度undo

      expect(executionLog).toEqual([]);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
    });
  });

  describe('redo', () => {
    it('コマンドがない場合、redoしても何も起こらない', () => {
      undoRedo.redo();
      expect(executionLog).toEqual([]);
    });

    it('undo後にredoできる', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.undo();
      executionLog = [];

      undoRedo.redo();

      expect(executionLog).toEqual(['execute:A']);
      expect(undoRedo.getCurrentIndex()).toBe(0);
      expect(undoRedo.canUndo.value).toBe(true);
      expect(undoRedo.canRedo.value).toBe(false);
    });

    it('複数のコマンドをundo後、redoできる', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand(createTestCommand('C'));
      undoRedo.undo(); // C をundo
      undoRedo.undo(); // B をundo
      executionLog = [];

      undoRedo.redo(); // B をredo
      undoRedo.redo(); // C をredo

      expect(executionLog).toEqual(['execute:B', 'execute:C']);
      expect(undoRedo.getCurrentIndex()).toBe(2);
      expect(undoRedo.canUndo.value).toBe(true);
      expect(undoRedo.canRedo.value).toBe(false);
    });

    it('既にredo済みの場合、redoしても何も起こらない', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.undo();
      undoRedo.redo();
      executionLog = [];

      undoRedo.redo(); // もう一度redo

      expect(executionLog).toEqual([]);
      expect(undoRedo.getCurrentIndex()).toBe(0);
    });
  });

  describe('clearHistory', () => {
    it('履歴をクリアできる', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand(createTestCommand('C'));

      undoRedo.clearHistory();

      expect(undoRedo.getHistorySize()).toBe(0);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
      expect(undoRedo.canUndo.value).toBe(false);
      expect(undoRedo.canRedo.value).toBe(false);
    });

    it('空の履歴をクリアしても問題ない', () => {
      undoRedo.clearHistory();

      expect(undoRedo.getHistorySize()).toBe(0);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
    });
  });

  describe('統合テスト', () => {
    it('複雑なundo/redo操作が正しく動作する', () => {
      // 3つのコマンドを追加
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand(createTestCommand('C'));
      executionLog = [];

      // 2回undo
      undoRedo.undo(); // C → B
      undoRedo.undo(); // B → A
      expect(executionLog).toEqual(['undo:C', 'undo:B']);
      expect(undoRedo.getCurrentIndex()).toBe(0);

      // 1回redo
      executionLog = [];
      undoRedo.redo(); // A → B
      expect(executionLog).toEqual(['execute:B']);
      expect(undoRedo.getCurrentIndex()).toBe(1);

      // 新しいコマンドを追加（Cは削除される）
      executionLog = [];
      undoRedo.pushCommand(createTestCommand('D'));
      expect(undoRedo.getHistorySize()).toBe(3); // [A, B, D]
      expect(undoRedo.getCurrentIndex()).toBe(2);

      // 全てundo
      executionLog = [];
      undoRedo.undo(); // D → B
      undoRedo.undo(); // B → A
      undoRedo.undo(); // A → 初期状態
      expect(executionLog).toEqual(['undo:D', 'undo:B', 'undo:A']);
      expect(undoRedo.getCurrentIndex()).toBe(-1);

      // 全てredo
      executionLog = [];
      undoRedo.redo(); // 初期状態 → A
      undoRedo.redo(); // A → B
      undoRedo.redo(); // B → D
      expect(executionLog).toEqual(['execute:A', 'execute:B', 'execute:D']);
      expect(undoRedo.getCurrentIndex()).toBe(2);
    });
  });
});
