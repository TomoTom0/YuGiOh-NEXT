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

  describe('timestamp', () => {
    it('pushCommand時にtimestampが自動設定される', () => {
      const before = Date.now();
      const cmd = createTestCommand('A');
      undoRedo.pushCommand(cmd);
      const after = Date.now();

      const history = undoRedo.commandHistory.value;
      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('明示的に設定したtimestampは上書きされない', () => {
      const cmd: Command = {
        ...createTestCommand('A'),
        timestamp: 12345
      };
      undoRedo.pushCommand(cmd);

      const history = undoRedo.commandHistory.value;
      expect(history[0].timestamp).toBe(12345);
    });
  });

  describe('getUndoDescription / getRedoDescription', () => {
    it('undo不可時はundefinedを返す', () => {
      expect(undoRedo.getUndoDescription()).toBeUndefined();
    });

    it('redo不可時はundefinedを返す', () => {
      expect(undoRedo.getRedoDescription()).toBeUndefined();
    });

    it('descriptionが設定されたコマンドの説明を取得できる', () => {
      const cmd: Command = {
        ...createTestCommand('A'),
        description: 'Add Blue-Eyes'
      };
      undoRedo.pushCommand(cmd);

      expect(undoRedo.getUndoDescription()).toBe('Add Blue-Eyes');
    });

    it('undo後にredoの説明を取得できる', () => {
      const cmd: Command = {
        ...createTestCommand('A'),
        description: 'Add Blue-Eyes'
      };
      undoRedo.pushCommand(cmd);
      undoRedo.undo();

      expect(undoRedo.getUndoDescription()).toBeUndefined();
      expect(undoRedo.getRedoDescription()).toBe('Add Blue-Eyes');
    });

    it('descriptionが未設定のコマンドはundefinedを返す', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      expect(undoRedo.getUndoDescription()).toBeUndefined();
    });
  });

  describe('getUndoType / getRedoType', () => {
    it('undo不可時はundefinedを返す', () => {
      expect(undoRedo.getUndoType()).toBeUndefined();
    });

    it('redo不可時はundefinedを返す', () => {
      expect(undoRedo.getRedoType()).toBeUndefined();
    });

    it('typeが設定されたコマンドのタイプを取得できる', () => {
      const cmd: Command = {
        ...createTestCommand('A'),
        type: 'add'
      };
      undoRedo.pushCommand(cmd);

      expect(undoRedo.getUndoType()).toBe('add');
    });

    it('undo後にredoのタイプを取得できる', () => {
      const cmd: Command = {
        ...createTestCommand('A'),
        type: 'remove'
      };
      undoRedo.pushCommand(cmd);
      undoRedo.undo();

      expect(undoRedo.getUndoType()).toBeUndefined();
      expect(undoRedo.getRedoType()).toBe('remove');
    });

    it('複数コマンドで正しいタイプを返す', () => {
      undoRedo.pushCommand({ ...createTestCommand('A'), type: 'add' });
      undoRedo.pushCommand({ ...createTestCommand('B'), type: 'move' });
      undoRedo.pushCommand({ ...createTestCommand('C'), type: 'reorder' });

      expect(undoRedo.getUndoType()).toBe('reorder');
      undoRedo.undo();
      expect(undoRedo.getUndoType()).toBe('move');
      expect(undoRedo.getRedoType()).toBe('reorder');
    });
  });

  describe('jumpToIndex', () => {
    it('範囲外のインデックスはfalseを返す', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      expect(undoRedo.jumpToIndex(-2)).toBe(false);
      expect(undoRedo.jumpToIndex(1)).toBe(false);
    });

    it('現在位置と同じインデックスはtrueを返し何もしない', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      executionLog = [];

      expect(undoRedo.jumpToIndex(0)).toBe(true);
      expect(executionLog).toEqual([]);
    });

    it('前方へジャンプ（undo）できる', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand(createTestCommand('C'));
      executionLog = [];

      // index 2 → index 0 (CとBをundo)
      expect(undoRedo.jumpToIndex(0)).toBe(true);
      expect(executionLog).toEqual(['undo:C', 'undo:B']);
      expect(undoRedo.getCurrentIndex()).toBe(0);
    });

    it('後方へジャンプ（redo）できる', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand(createTestCommand('C'));
      // 全てundo
      undoRedo.undo();
      undoRedo.undo();
      undoRedo.undo();
      executionLog = [];

      // index -1 → index 2 (A,B,Cをredo)
      expect(undoRedo.jumpToIndex(2)).toBe(true);
      expect(executionLog).toEqual(['execute:A', 'execute:B', 'execute:C']);
      expect(undoRedo.getCurrentIndex()).toBe(2);
    });

    it('index -1 へジャンプして初期状態に戻れる', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      executionLog = [];

      expect(undoRedo.jumpToIndex(-1)).toBe(true);
      expect(executionLog).toEqual(['undo:B', 'undo:A']);
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
