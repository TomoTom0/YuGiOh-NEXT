#!/usr/bin/env node
/**
 * 型チェック (TASK-543: vue-tsc 導入)
 *
 * vue-tsc --noEmit を実行し、出力を scripts/vue-tsc-known-errors.json の
 * 既知エラー一覧と照合する。
 *
 * - 一覧にある既知エラーは「対象外」として許容し、一覧とともに表示する
 * - 一覧に無い新規エラーは失敗 (exit 1)
 * - 一覧にあるのに発生しなくなったエントリは「陳腐化」として失敗 (exit 1)。
 *   連動タスクが解消された合図なので、該当エントリを一覧から除去すること
 * - vue-tsc 自体がエラー行を出さずに異常終了した場合は、その出力をそのまま
 *   表示して vue-tsc の終了コードで終了する (ツールの失敗を隠さない)
 *
 * 素の vue-tsc 出力は `pnpm run type-check:strict` で確認できる。
 * 既知エラーが全て解消されたら、一覧を空にせず本スクリプトごと廃止し、
 * type-check を素の vue-tsc --noEmit へ戻すこと。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ERROR_LINE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

/**
 * vue-tsc / tsc の出力からエラー行を抽出する。
 * 継続行 (インデントされた詳細行) や非エラー行は無視する。
 * @param {string} output
 * @returns {{file: string, line: number, col: number, code: string, message: string}[]}
 */
export function parseVueTscErrors(output) {
  const errors = [];
  for (const rawLine of output.split(/\r?\n/)) {
    const m = ERROR_LINE.exec(rawLine);
    if (!m) continue;
    errors.push({
      file: m[1].replace(/\\/g, '/').replace(/^\.\//, ''),
      line: Number(m[2]),
      col: Number(m[3]),
      code: m[4],
      message: m[5],
    });
  }
  return errors;
}

/**
 * 実測エラー列を既知エラー一覧と照合する。
 * 照合キーは file + code + messageIncludes (行番号には依存しない)。
 * @param {{file: string, line: number, col: number, code: string, message: string}[]} errors
 * @param {{file: string, code: string, messageIncludes: string, count: number, task: string, reason: string}[]} knownEntries
 * @returns {{suppressed: object[], unexpected: object[], stale: {entry: object, missing: number}[]}}
 */
export function matchKnownErrors(errors, knownEntries) {
  const remaining = knownEntries.map((entry) => ({ entry, left: entry.count }));
  const suppressed = [];
  const unexpected = [];
  for (const error of errors) {
    const slot = remaining.find(
      (r) =>
        r.left > 0 &&
        r.entry.file === error.file &&
        r.entry.code === error.code &&
        error.message.includes(r.entry.messageIncludes),
    );
    if (slot) {
      slot.left -= 1;
      suppressed.push({ error, entry: slot.entry });
    } else {
      unexpected.push(error);
    }
  }
  const stale = remaining
    .filter((r) => r.left > 0)
    .map((r) => ({ entry: r.entry, missing: r.left }));
  return { suppressed, unexpected, stale };
}

function formatError(e) {
  return `${e.file}(${e.line},${e.col}): error ${e.code}: ${e.message}`;
}

function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.dirname(scriptDir);
  const known = JSON.parse(
    readFileSync(path.join(scriptDir, 'vue-tsc-known-errors.json'), 'utf8'),
  );

  const vueTscBin = path.join(rootDir, 'node_modules', '.bin', 'vue-tsc');
  const result = spawnSync(vueTscBin, ['--noEmit'], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    console.error(`vue-tsc の起動に失敗しました: ${result.error.message}`);
    process.exit(1);
  }
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const errors = parseVueTscErrors(output);

  if (errors.length === 0) {
    if (result.status === 0) {
      console.log('型チェック成功: vue-tsc エラー 0 件');
      process.exit(0);
    }
    // エラー行が無いのに異常終了した場合はツールの失敗としてそのまま伝える
    console.error(output);
    process.exit(result.status ?? 1);
  }

  const { suppressed, unexpected, stale } = matchKnownErrors(errors, known.errors);

  if (suppressed.length > 0) {
    console.log(`既知エラー (対象外、一覧: scripts/vue-tsc-known-errors.json): ${suppressed.length} 件`);
    for (const { error, entry } of suppressed) {
      console.log(`  [${entry.task}] ${formatError(error)}`);
    }
  }
  let failed = false;
  if (unexpected.length > 0) {
    failed = true;
    console.error(`新規エラー: ${unexpected.length} 件`);
    for (const error of unexpected) {
      console.error(`  ${formatError(error)}`);
    }
  }
  if (stale.length > 0) {
    failed = true;
    console.error('陳腐化した既知エラーエントリがあります (解消された可能性):');
    for (const { entry, missing } of stale) {
      console.error(
        `  [${entry.task}] ${entry.file} ${entry.code} "${entry.messageIncludes}" (未発生 ${missing} 件) — scripts/vue-tsc-known-errors.json から該当エントリを除去してください`,
      );
    }
  }
  if (failed) {
    process.exit(1);
  }
  console.log(`型チェック成功: 新規エラー 0 件 (既知 ${suppressed.length} 件は対象外として許容)`);
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
