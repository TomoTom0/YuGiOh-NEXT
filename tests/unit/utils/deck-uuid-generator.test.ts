import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateDeckCardUUID,
  clearDeckUUIDState,
  __getDeckUUIDState
} from '@/utils/deck-uuid-generator';

// tests/design/deck-uuid-generator/conditions.toml の各[[condition]]をカバーするテスト。
// maxIndexMapはモジュールレベルの状態のため、各テスト前に必ずclearDeckUUIDState()で
// 初期化してからテストする（テスト間の状態リークを防ぐ）。
describe('deck-uuid-generator', () => {
  beforeEach(() => {
    clearDeckUUIDState();
  });

  describe('generateDeckCardUUID', () => {
    it('[covers:generate_deck_card_uuid.first_call_new_key_defaults_to_zero] 未登録のcid-ciidの組み合わせでは、インデックス0から始まるUUIDを返す', () => {
      const uuid = generateDeckCardUUID('12345', 0);
      expect(uuid).toBe('12345-0-0');
    });

    it('[covers:generate_deck_card_uuid.repeat_call_same_key_increments] 同じcid-ciidの組み合わせに対する2回目の呼び出しはインデックスが1つ進む', () => {
      const first = generateDeckCardUUID('12345', 0);
      const second = generateDeckCardUUID('12345', 0);
      expect(first).toBe('12345-0-0');
      expect(second).toBe('12345-0-1');
    });

    it('[covers:generate_deck_card_uuid.repeat_call_same_key_increments] 同じ組み合わせを3回呼ぶとインデックスが0,1,2と連番になる', () => {
      expect(generateDeckCardUUID('99', 1)).toBe('99-1-0');
      expect(generateDeckCardUUID('99', 1)).toBe('99-1-1');
      expect(generateDeckCardUUID('99', 1)).toBe('99-1-2');
    });

    it('[covers:generate_deck_card_uuid.different_keys_are_independent_counters] ciidが異なれば別カウンタとしてインデックス0から始まる', () => {
      expect(generateDeckCardUUID('12345', 0)).toBe('12345-0-0');
      expect(generateDeckCardUUID('12345', 1)).toBe('12345-1-0');
    });

    it('[covers:generate_deck_card_uuid.different_keys_are_independent_counters] cidが異なれば別カウンタとしてインデックス0から始まり、既存キーのインデックスに影響しない', () => {
      expect(generateDeckCardUUID('12345', 0)).toBe('12345-0-0');
      expect(generateDeckCardUUID('99999', 0)).toBe('99999-0-0');
      // 既存キー'12345-0'のカウンタは影響を受けず、次は1になる
      expect(generateDeckCardUUID('12345', 0)).toBe('12345-0-1');
    });
  });

  describe('clearDeckUUIDState', () => {
    it('[covers:clear_deck_uuid_state.resets_all_counters] クリア後は以前使用済みのキーもインデックス0から再開する', () => {
      generateDeckCardUUID('12345', 0);
      generateDeckCardUUID('12345', 0);
      expect(__getDeckUUIDState().get('12345-0')).toBe(1);

      clearDeckUUIDState();

      expect(__getDeckUUIDState().size).toBe(0);
      expect(generateDeckCardUUID('12345', 0)).toBe('12345-0-0');
    });
  });

  describe('__getDeckUUIDState', () => {
    it('[covers:get_deck_uuid_state.reflects_current_internal_state] 現在のmaxIndexMapの内容(最大インデックス)を反映したMapを返す', () => {
      generateDeckCardUUID('12345', 0);
      generateDeckCardUUID('12345', 0);

      const state = __getDeckUUIDState();
      expect(state).toBeInstanceOf(Map);
      expect(state.get('12345-0')).toBe(1);
      expect(state.size).toBe(1);
    });

    it('[covers:get_deck_uuid_state.returns_defensive_copy_not_live_reference] 返り値を変更しても内部状態(maxIndexMap)には影響しない', () => {
      const copy = __getDeckUUIDState();
      copy.set('99999-0', 999);

      // 返り値のコピーへの変更は内部stateを汚染しない
      const stateAfter = __getDeckUUIDState();
      expect(stateAfter.has('99999-0')).toBe(false);

      // 未登録キー扱いのままなので、インデックス0から始まる
      expect(generateDeckCardUUID('99999', 0)).toBe('99999-0-0');
    });
  });
});
