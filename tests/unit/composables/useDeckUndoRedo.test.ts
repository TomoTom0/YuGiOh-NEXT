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
    it('履歴が空である [covers:init.empty_history_index_minus_one] [covers:getters.return_current_size_and_index]', () => {
      expect(undoRedo.getHistorySize()).toBe(0);
    });

    it('現在のインデックスが-1である [covers:init.empty_history_index_minus_one] [covers:getters.return_current_size_and_index]', () => {
      expect(undoRedo.getCurrentIndex()).toBe(-1);
    });

    it('Undo/Redoができない [covers:init.empty_history_index_minus_one]', () => {
      expect(undoRedo.canUndo.value).toBe(false);
      expect(undoRedo.canRedo.value).toBe(false);
    });
  });

  describe('pushCommand', () => {
    it('コマンドを追加できる [covers:push.appends_and_sets_index_to_tail] [covers:getters.return_current_size_and_index]', () => {
      const cmd = createTestCommand('A');
      undoRedo.pushCommand(cmd);

      expect(undoRedo.getHistorySize()).toBe(1);
      expect(undoRedo.getCurrentIndex()).toBe(0);
    });

    it('複数のコマンドを追加できる [covers:push.appends_and_sets_index_to_tail] [covers:getters.return_current_size_and_index]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand({ ...createTestCommand('C'), description: 'C' });

      expect(undoRedo.getHistorySize()).toBe(3);
      expect(undoRedo.getCurrentIndex()).toBe(2);
    });

    it('Undo後に新しいコマンドを追加すると、以降の履歴が削除される [covers:push.truncates_redo_branch]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand(createTestCommand('C'));

      // 1回Undoする（C → B）
      undoRedo.undo();
      expect(undoRedo.getCurrentIndex()).toBe(1);

      // 新しいコマンドDを追加
      undoRedo.pushCommand({ ...createTestCommand('D'), description: 'D' });

      // 履歴は [A, B, D] になる（Cは削除）
      expect(undoRedo.getHistorySize()).toBe(3);
      expect(undoRedo.getCurrentIndex()).toBe(2);
      expect(undoRedo.commandHistory.value[2]?.description).toBe('D');
      expect(undoRedo.commandHistory.value).not.toContainEqual(expect.objectContaining({ description: 'C' }));
    });

    it('最大履歴数を超えると古い履歴が削除される [covers:push.max_history_trims_oldest_and_adjusts_index]', () => {
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
    it('コマンドがない場合、undoしても何も起こらない [covers:undo.cannot_undo_returns_without_change]', () => {
      undoRedo.undo();
      expect(executionLog).toEqual([]);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
    });

    it('1つのコマンドをundoできる [covers:undo.command_exists_calls_undo_then_decrements]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      executionLog = []; // ログをリセット

      undoRedo.undo();

      expect(executionLog).toEqual(['undo:A']);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
      expect(undoRedo.canUndo.value).toBe(false);
      expect(undoRedo.canRedo.value).toBe(true);
    });

    it('複数のコマンドを順番にundoできる [covers:undo.command_exists_calls_undo_then_decrements]', () => {
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

    it('既にundo済みの場合、undoしても何も起こらない [covers:undo.cannot_undo_returns_without_change]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.undo();
      executionLog = [];

      undoRedo.undo(); // もう一度undo

      expect(executionLog).toEqual([]);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
    });

    it('現在indexのコマンドが欠損している場合はundoを呼ばずindexだけ戻す [covers:undo.command_missing_skips_undo_but_decrements]', () => {
      undoRedo.commandHistory.value = [undefined as unknown as Command];
      undoRedo.commandIndex.value = 0;

      undoRedo.undo();

      expect(executionLog).toEqual([]);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
    });
  });

  describe('redo', () => {
    it('コマンドがない場合、redoしても何も起こらない [covers:redo.cannot_redo_returns_without_change]', () => {
      undoRedo.redo();
      expect(executionLog).toEqual([]);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
    });

    it('undo後にredoできる [covers:redo.command_exists_increments_then_executes]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.undo();
      executionLog = [];

      undoRedo.redo();

      expect(executionLog).toEqual(['execute:A']);
      expect(undoRedo.getCurrentIndex()).toBe(0);
      expect(undoRedo.canUndo.value).toBe(true);
      expect(undoRedo.canRedo.value).toBe(false);
    });

    it('複数のコマンドをundo後、redoできる [covers:redo.command_exists_increments_then_executes]', () => {
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

    it('既にredo済みの場合、redoしても何も起こらない [covers:redo.cannot_redo_returns_without_change]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.undo();
      undoRedo.redo();
      executionLog = [];

      undoRedo.redo(); // もう一度redo

      expect(executionLog).toEqual([]);
      expect(undoRedo.getCurrentIndex()).toBe(0);
    });

    it('次indexのコマンドが欠損している場合はexecuteを呼ばずindexだけ進める [covers:redo.command_missing_increments_without_execute]', () => {
      undoRedo.commandHistory.value = [createTestCommand('A'), undefined as unknown as Command];
      undoRedo.commandIndex.value = 0;

      undoRedo.redo();

      expect(executionLog).toEqual([]);
      expect(undoRedo.getCurrentIndex()).toBe(1);
    });
  });

  describe('clearHistory', () => {
    it('履歴をクリアできる [covers:clear.resets_history_and_index]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand(createTestCommand('C'));

      undoRedo.clearHistory();

      expect(undoRedo.getHistorySize()).toBe(0);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
      expect(undoRedo.canUndo.value).toBe(false);
      expect(undoRedo.canRedo.value).toBe(false);
    });

    it('空の履歴をクリアしても問題ない [covers:clear.resets_history_and_index]', () => {
      undoRedo.clearHistory();

      expect(undoRedo.getHistorySize()).toBe(0);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
    });
  });

  describe('timestamp', () => {
    it('pushCommand時にtimestampが自動設定される [covers:push.timestamp_undefined_sets_now]', () => {
      const before = Date.now();
      const cmd = createTestCommand('A');
      undoRedo.pushCommand(cmd);
      const after = Date.now();

      const history = undoRedo.commandHistory.value;
      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('明示的に設定したtimestampは上書きされない [covers:push.timestamp_existing_preserved]', () => {
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
    it('undo不可時はundefinedを返す [covers:undo_description.cannot_undo_returns_undefined]', () => {
      expect(undoRedo.getUndoDescription()).toBeUndefined();
    });

    it('redo不可時はundefinedを返す [covers:redo_description.cannot_redo_returns_undefined]', () => {
      expect(undoRedo.getRedoDescription()).toBeUndefined();
    });

    it('descriptionが設定されたコマンドの説明を取得できる [covers:undo_description.can_undo_returns_current_description]', () => {
      const cmd: Command = {
        ...createTestCommand('A'),
        description: 'Add Blue-Eyes'
      };
      undoRedo.pushCommand(cmd);

      expect(undoRedo.getUndoDescription()).toBe('Add Blue-Eyes');
    });

    it('undo後にredoの説明を取得できる [covers:redo_description.can_redo_returns_next_description]', () => {
      const cmd: Command = {
        ...createTestCommand('A'),
        description: 'Add Blue-Eyes'
      };
      undoRedo.pushCommand(cmd);
      undoRedo.undo();

      expect(undoRedo.getUndoDescription()).toBeUndefined();
      expect(undoRedo.getRedoDescription()).toBe('Add Blue-Eyes');
    });

    it('descriptionが未設定のコマンドはundefinedを返す [covers:undo_description.can_undo_returns_current_description]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      expect(undoRedo.getUndoDescription()).toBeUndefined();
    });
  });

  describe('getUndoType / getRedoType', () => {
    it('undo不可時はundefinedを返す [covers:undo_type.cannot_undo_returns_undefined]', () => {
      expect(undoRedo.getUndoType()).toBeUndefined();
    });

    it('redo不可時はundefinedを返す [covers:redo_type.cannot_redo_returns_undefined]', () => {
      expect(undoRedo.getRedoType()).toBeUndefined();
    });

    it('typeが設定されたコマンドのタイプを取得できる [covers:undo_type.can_undo_returns_current_type]', () => {
      const cmd: Command = {
        ...createTestCommand('A'),
        type: 'add'
      };
      undoRedo.pushCommand(cmd);

      expect(undoRedo.getUndoType()).toBe('add');
    });

    it('undo後にredoのタイプを取得できる [covers:redo_type.can_redo_returns_next_type] [covers:undo_type.cannot_undo_returns_undefined]', () => {
      const cmd: Command = {
        ...createTestCommand('A'),
        type: 'remove'
      };
      undoRedo.pushCommand(cmd);
      undoRedo.undo();

      expect(undoRedo.getUndoType()).toBeUndefined();
      expect(undoRedo.getRedoType()).toBe('remove');
    });

    it('複数コマンドで正しいタイプを返す [covers:undo_type.can_undo_returns_current_type] [covers:redo_type.can_redo_returns_next_type]', () => {
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
    it('範囲外のインデックスはfalseを返す [covers:jump.invalid_target_returns_false]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      expect(undoRedo.jumpToIndex(-2)).toBe(false);
      expect(undoRedo.jumpToIndex(1)).toBe(false);
      expect(undoRedo.getCurrentIndex()).toBe(0);
    });

    it('現在位置と同じインデックスはtrueを返し何もしない [covers:jump.same_index_returns_true_without_commands]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      executionLog = [];

      expect(undoRedo.jumpToIndex(0)).toBe(true);
      expect(executionLog).toEqual([]);
    });

    it('前方へジャンプ（undo）できる [covers:jump.backward_undo_each_existing_command] [covers:jump.valid_target_returns_true_after_movement]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      undoRedo.pushCommand(createTestCommand('C'));
      executionLog = [];

      // index 2 → index 0 (CとBをundo)
      expect(undoRedo.jumpToIndex(0)).toBe(true);
      expect(executionLog).toEqual(['undo:C', 'undo:B']);
      expect(undoRedo.getCurrentIndex()).toBe(0);
    });

    it('後方へジャンプ（redo）できる [covers:jump.forward_redo_each_existing_command] [covers:jump.valid_target_returns_true_after_movement]', () => {
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

    it('index -1 へジャンプして初期状態に戻れる [covers:jump.backward_undo_each_existing_command] [covers:jump.valid_target_returns_true_after_movement]', () => {
      undoRedo.pushCommand(createTestCommand('A'));
      undoRedo.pushCommand(createTestCommand('B'));
      executionLog = [];

      expect(undoRedo.jumpToIndex(-1)).toBe(true);
      expect(executionLog).toEqual(['undo:B', 'undo:A']);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
    });

    it('前方ジャンプ中の欠損コマンドはexecuteせずindexだけ進める [covers:jump.forward_missing_command_skips_execute_but_increments] [covers:jump.valid_target_returns_true_after_movement]', () => {
      undoRedo.commandHistory.value = [
        createTestCommand('A'),
        undefined as unknown as Command,
        createTestCommand('C')
      ];
      undoRedo.commandIndex.value = -1;

      expect(undoRedo.jumpToIndex(2)).toBe(true);

      expect(executionLog).toEqual(['execute:A', 'execute:C']);
      expect(undoRedo.getCurrentIndex()).toBe(2);
    });

    it('後方ジャンプ中の欠損コマンドはundoせずindexだけ戻す [covers:jump.backward_missing_command_skips_undo_but_decrements] [covers:jump.valid_target_returns_true_after_movement]', () => {
      undoRedo.commandHistory.value = [
        createTestCommand('A'),
        undefined as unknown as Command,
        createTestCommand('C')
      ];
      undoRedo.commandIndex.value = 2;

      expect(undoRedo.jumpToIndex(-1)).toBe(true);

      expect(executionLog).toEqual(['undo:C', 'undo:A']);
      expect(undoRedo.getCurrentIndex()).toBe(-1);
    });
  });

  describe('統合テスト', () => {
    it('複雑なundo/redo操作が正しく動作する [covers:push.truncates_redo_branch] [covers:undo.command_exists_calls_undo_then_decrements] [covers:redo.command_exists_increments_then_executes]', () => {
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
