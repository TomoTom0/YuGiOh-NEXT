/**
 * scripts/type-check.mjs の単体テスト (TASK-543: vue-tsc 導入)
 *
 * 対象: vue-tsc 出力のパース (parseVueTscErrors) と、既知エラー一覧
 * (scripts/vue-tsc-known-errors.json) との照合 (matchKnownErrors)。
 * 照合の契約:
 * - 既知エラーは suppressed として許容される
 * - 一覧に無いエラーは unexpected (失敗要因)
 * - 一覧にあるのに発生しなかった分は stale (連動タスク解消時の除去漏れ検出)
 * - 照合キーは file + code + messageIncludes で、行番号には依存しない
 * - count を超えた同一シグネチャのエラーは unexpected になる
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error .mjs モジュールには型定義が無いため
import { matchKnownErrors, parseVueTscErrors } from '../../../scripts/type-check.mjs';

const SAMPLE_OUTPUT = [
  `src/components/DeckSection.vue(191,58): error TS2345: Argument of type '"info" | "main"' is not assignable to parameter of type '"main"'.`,
  `  Type '"info"' is not assignable to type '"main"'.`,
  `src/components/practice/PracticeZoneInfoPanel.vue(42,1): error TS6133: 'mdiClose' is declared but its value is never read.`,
  `Found 2 errors in 2 files.`,
].join('\n');

describe('parseVueTscErrors', () => {
  it('エラー行を file/line/col/code/message に分解し、継続行と要約行を無視する', () => {
    const errors = parseVueTscErrors(SAMPLE_OUTPUT);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({
      file: 'src/components/DeckSection.vue',
      line: 191,
      col: 58,
      code: 'TS2345',
      message: `Argument of type '"info" | "main"' is not assignable to parameter of type '"main"'.`,
    });
    expect(errors[1].code).toBe('TS6133');
  });

  it('エラーが無い出力では空配列を返す', () => {
    expect(parseVueTscErrors('')).toEqual([]);
    expect(parseVueTscErrors('no errors here')).toEqual([]);
  });
});

describe('matchKnownErrors', () => {
  const known = [
    {
      file: 'src/components/DeckSection.vue',
      code: 'TS2345',
      messageIncludes: `Argument of type '"info" | "main"' is not assignable`,
      count: 1,
      task: 'TASK-639',
      reason: 'test',
    },
    {
      file: 'src/components/practice/PracticeZoneInfoPanel.vue',
      code: 'TS6133',
      messageIncludes: `'mdiClose' is declared but its value is never read`,
      count: 1,
      task: 'TASK-565',
      reason: 'test',
    },
  ];

  it('全件が既知エントリに一致すれば suppressed のみになる', () => {
    const { suppressed, unexpected, stale } = matchKnownErrors(
      parseVueTscErrors(SAMPLE_OUTPUT),
      known,
    );
    expect(suppressed).toHaveLength(2);
    expect(unexpected).toEqual([]);
    expect(stale).toEqual([]);
    expect(suppressed[0].entry.task).toBe('TASK-639');
  });

  it('一覧に無いエラーは unexpected になる', () => {
    const errors = parseVueTscErrors(
      `src/other.ts(1,1): error TS2322: Type 'string' is not assignable to type 'number'.`,
    );
    const { unexpected } = matchKnownErrors(errors, known);
    expect(unexpected).toHaveLength(1);
    expect(unexpected[0].file).toBe('src/other.ts');
  });

  it('発生しなかった既知エントリは stale として報告される', () => {
    const { stale } = matchKnownErrors([], known);
    expect(stale).toHaveLength(2);
    expect(stale.map((s: { missing: number }) => s.missing)).toEqual([1, 1]);
  });

  it('行番号が変わっても照合できる (行番号に依存しない)', () => {
    const errors = parseVueTscErrors(
      `src/components/DeckSection.vue(999,3): error TS2345: Argument of type '"info" | "main"' is not assignable to parameter of type '"main"'.`,
    );
    const { suppressed, stale } = matchKnownErrors(errors, [known[0]]);
    expect(suppressed).toHaveLength(1);
    expect(stale).toEqual([]);
  });

  it('count を超えた同一シグネチャは超過分が unexpected になる', () => {
    const line = `src/components/DeckSection.vue(1,1): error TS2345: Argument of type '"info" | "main"' is not assignable to parameter of type '"main"'.`;
    const errors = parseVueTscErrors([line, line].join('\n'));
    const { suppressed, unexpected } = matchKnownErrors(errors, [known[0]]);
    expect(suppressed).toHaveLength(1);
    expect(unexpected).toHaveLength(1);
  });
});

describe('scripts/vue-tsc-known-errors.json (出荷される一覧)', () => {
  it('全エントリが必須項目を持ち、count は 1 以上である', () => {
    const jsonPath = path.resolve(__dirname, '../../../scripts/vue-tsc-known-errors.json');
    const known = JSON.parse(readFileSync(jsonPath, 'utf8'));
    expect(Array.isArray(known.errors)).toBe(true);
    for (const entry of known.errors) {
      expect(entry.file).toBeTruthy();
      expect(entry.code).toMatch(/^TS\d+$/);
      expect(entry.messageIncludes).toBeTruthy();
      expect(entry.count).toBeGreaterThanOrEqual(1);
      expect(entry.task).toMatch(/^TASK-\d+$/);
      expect(entry.reason).toBeTruthy();
    }
  });
});
