/**
 * scripts/design/verify-conditions.py の単体テスト
 *
 * 条件書: tests/design/verify-conditions/conditions.toml（TASK-480）
 *
 * 方式: spawnSync('uv', ['run', 'python', <script>, '--root', <fixtureRoot>, ...args])。
 * fixture は tmp/test-verify-conditions/<name>-XXXX/ を mkdtempSync で動的生成し、
 * tests/design/<feature>/conditions.toml と tests/unit/*.test.ts を文字列リテラルで
 * 組み立てて配置する（afterEach で削除）。
 *
 * テスト先行: script 実装（TASK-480）前に作成しているため、現時点では全itが
 * fail する（script 不在）。実装後に全件PASSとなることを期待する。
 *
 * 実corpus smoke は --root に実repo rootを指定して browser-config のみ実行する
 * （--no-sync で書き込み無し。exit 0/1 は corpus の実在failに依存するため許容）。
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();
const SCRIPT_PATH = resolve(REPO_ROOT, 'scripts/design/verify-conditions.py');
// テスト用fixtureの一時ディレクトリ（プロジェクトルールにより ./tmp/ 配下）
const TMP_ROOT = join(REPO_ROOT, 'tmp', 'test-verify-conditions');

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

let fixtureDirs: string[] = [];

afterEach(() => {
  for (const dir of fixtureDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  fixtureDirs = [];
});

/** fixture root（tmp/test-verify-conditions/<name>-XXXX/）を生成 */
function newFixture(name: string): string {
  mkdirSync(TMP_ROOT, { recursive: true });
  const root = mkdtempSync(join(TMP_ROOT, `${name}-`));
  fixtureDirs.push(root);
  return root;
}

function runVerify(root: string, args: string[]): RunResult {
  const r = spawnSync('uv', ['run', 'python', SCRIPT_PATH, '--root', root, ...args], {
    encoding: 'utf8',
    timeout: 60000,
  });
  if (r.error) {
    throw r.error;
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

/** fixture root配下に conditions.toml を書く（contentはそのまま） */
function writeToml(root: string, feature: string, content: string): string {
  const dir = join(root, 'tests', 'design', feature);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'conditions.toml');
  writeFileSync(path, content);
  return path;
}

/** fixture root配下にテストファイルを書く。linesは1要素=1行（行番号=index+1） */
function writeTest(root: string, relPath: string, lines: string[]): string {
  const path = join(root, relPath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${lines.join('\n')}\n`);
  return relPath;
}

/** 妥当な[meta]ブロック（featureのみ差し替え。source_fileは既定でsrc/example.ts） */
function metaBlock(feature: string, sourceFile = 'src/example.ts'): string {
  return [
    '[meta]',
    `feature = "${feature}"`,
    `source_file = "${sourceFile}"`,
    'verified = false',
    'verified_at = ""',
    'verified_by = ""',
    'test_command = ""',
    'source_hash = ""',
  ].join('\n');
}

/** [[condition]] / [[excluded]] ブロック1つ分の文字列（ブロック後に空行） */
function block(header: string, fields: string[]): string {
  return [header, ...fields, ''].join('\n');
}

/** conditions.toml本文の組み立て */
function buildToml(
  meta: string,
  condBlocks: string[][],
  excludedBlocks: string[][] = []
): string {
  const parts: string[] = [meta, ''];
  for (const fields of condBlocks) {
    parts.push(block('[[condition]]', fields));
  }
  for (const fields of excludedBlocks) {
    parts.push(block('[[excluded]]', fields));
  }
  return `${parts.join('\n')}\n`;
}

/** 妥当な条件1件分のフィールド（expect_no_throw既定。omitで行を除去） */
function condFields(id: string, extra: string[] = [], omit: string[] = []): string[] {
  const all = [
    `id = "${id}"`,
    'target_function = "fn"',
    'source = "docs/design/example.md 節"',
    'description = "説明"',
    'given = "前提"',
    'expect_no_throw = true',
    ...extra,
  ];
  return all.filter((line) => !omit.some((key) => line.startsWith(`${key} =`)));
}

/** coverタグ付きit 1行（行番号を返す） */
function coverIt(desc: string, ids: string): string {
  return `it('${desc} [covers:${ids}]', () => {});`;
}

/**
 * fixture文字列内のcoversタグ接頭辞。実scriptのtests/走査で本ファイルのリテラルが
 * 実タグとして誤検出されるのを防ぐため、先頭配置・コメント用の直接記述では
 * '[covers:'をテキストとして含めずこの定数で組み立てる
 */
const COVERS_PREFIX = '[covers:';

/** stderr・stdout併合の小文字化（warn等の文言揺れに頑健なcontain検証用） */
function lowerOutput(r: RunResult): string {
  return `${r.stdout}\n${r.stderr}`.toLowerCase();
}

describe('CLI引数・usage', () => {
  it('不正オプションは検証せずexit 2 [covers:verify-conditions.invalid-option-exits-2]', () => {
    const root = newFixture('invalid-option');
    const r = runVerify(root, ['--unknown-flag']);
    expect(r.status).toBe(2);
  });

  it('解決できない対象指定はexit 2 [covers:verify-conditions.unknown-target-exits-2]', () => {
    const root = newFixture('unknown-target');
    const r = runVerify(root, ['no-such-feature']);
    expect(r.status).toBe(2);
  });

  it('--bootstrapと--verifiedの併用はexit 2 [covers:verify-conditions.bootstrap-verified-combo-exits-2]', () => {
    const root = newFixture('combo');
    const toml = writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, [
      '--bootstrap',
      toml,
      join(root, 'tests/unit/alpha.test.ts'),
      '--verified',
      'claude',
      '--test-command',
      'x',
    ]);
    expect(r.status).toBe(2);
  });

  it('--verifiedに--test-command無しはexit 2 [covers:verify-conditions.verified-requires-test-command]', () => {
    const root = newFixture('no-test-command');
    const toml = writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, [toml, '--verified', 'claude']);
    expect(r.status).toBe(2);
  });
});

describe('schema検証', () => {
  it('正常最小tomlは全passでexit 0 [covers:verify-conditions.minimal-valid-toml-passes]', () => {
    const root = newFixture('minimal');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', ["import { it } from 'vitest';", coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(' 0 fail');
  });

  it('TOMLとして不正ならexit 2 [covers:verify-conditions.malformed-toml-exits-2]', () => {
    const root = newFixture('malformed');
    writeToml(root, 'broken', '[meta]\nfeature =\n');
    const r = runVerify(root, ['broken']);
    expect(r.status).toBe(2);
  });

  it('[meta]不在はfail [covers:verify-conditions.missing-meta-fails]', () => {
    const root = newFixture('no-meta');
    writeToml(root, 'alpha', `${block('[[condition]]', condFields('alpha.one'))}`);
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
  });

  it('expect_キーが1つも無い条件はfail [covers:verify-conditions.missing-expect-key-fails]', () => {
    const root = newFixture('no-expect');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one', [], ['expect_no_throw'])]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('alpha.one');
  });

  it('expect_値が空文字の条件はfail [covers:verify-conditions.empty-expect-value-fails]', () => {
    const root = newFixture('empty-expect');
    writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [
        condFields('alpha.one', ['expect_return = ""'], ['expect_no_throw']),
      ])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('alpha.one');
  });

  it('expect_return = false / 0 / 空配列は正当な期待値としてpass [covers:verify-conditions.falsy-expect-values-pass]', () => {
    const root = newFixture('falsy');
    writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [
        condFields('alpha.f1', ['expect_return = false'], ['expect_no_throw']),
        condFields('alpha.f2', ['expect_return = 0'], ['expect_no_throw']),
        condFields('alpha.f3', ['expect_return = []'], ['expect_no_throw']),
      ])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', [
      "import { it } from 'vitest';",
      coverIt('f1', 'alpha.f1'),
      coverIt('f2', 'alpha.f2'),
      coverIt('f3', 'alpha.f3'),
    ]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(' 0 fail');
  });

  it('標準4種以外のexpect_キーはfail [covers:verify-conditions.nonstandard-expect-key-fails]', () => {
    const root = newFixture('side-effect');
    writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [
        condFields('alpha.side', ['expect_side_effect = "標準出力に記録"'], ['expect_no_throw']),
      ])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('side', 'alpha.side')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('alpha.side');
  });

  it('id欠落・空idの条件はfail [covers:verify-conditions.missing-or-empty-id-fails]', () => {
    const root = newFixture('no-id');
    writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [
        condFields('alpha.ok'),
        condFields('alpha.noid', [], ['id']),
        condFields('', [], []),
      ])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('ok', 'alpha.ok')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
  });

  it('同一ファイル内のid重複はfailし同期もスキップ [covers:verify-conditions.duplicate-id-same-file-fails]', () => {
    const root = newFixture('dup-same');
    const content = buildToml(metaBlock('alpha'), [condFields('alpha.dup'), condFields('alpha.dup')]);
    const toml = writeToml(root, 'alpha', content);
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('dup', 'alpha.dup')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('alpha.dup');
    // id重複時は当該ファイルの書き戻しも行わない
    expect(readFileSync(toml, 'utf8')).toBe(content);
  });

  it('feature横断のid重複はfail [covers:verify-conditions.duplicate-id-cross-feature-fails]', () => {
    const root = newFixture('dup-cross');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('shared.one')]));
    writeToml(root, 'beta', buildToml(metaBlock('beta'), [condFields('shared.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'shared.one')]);
    const r = runVerify(root, []);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('shared.one');
  });

  it('id形式違反（_使用）はオプション無しのデフォルトでfail [covers:verify-conditions.invalid-id-format-fails]', () => {
    const root = newFixture('bad-id');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.uses_underscore')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.uses_underscore')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('alpha.uses_underscore');
  });

  it('metaのfeature・source_file欠落はfail [covers:verify-conditions.meta-required-fields-fail]', () => {
    const root = newFixture('meta-required');
    const meta = metaBlock('alpha').split('\n').filter((line) => !line.startsWith('feature =')).join('\n');
    writeToml(root, 'alpha', buildToml(meta, [condFields('alpha.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
  });

  it('verified=trueなのに検証記録欄が空ならfail [covers:verify-conditions.verified-true-with-empty-record-fails]', () => {
    const root = newFixture('verified-record');
    const meta = metaBlock('alpha').replace('verified = false', 'verified = true');
    writeToml(root, 'alpha', buildToml(meta, [condFields('alpha.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
  });

  it('条件のverified=falseにunverifiable_reason無しはfail [covers:verify-conditions.verified-false-without-reason-fails]', () => {
    const root = newFixture('no-reason');
    writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [condFields('alpha.one', ['verified = false'])])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
  });

  it('excludedの必須欄（item/source/reason）空欄はfail [covers:verify-conditions.excluded-empty-field-fails]', () => {
    const root = newFixture('excluded-empty');
    writeToml(
      root,
      'alpha',
      buildToml(
        metaBlock('alpha'),
        [condFields('alpha.one')],
        [['item = "除外項目"', 'source = "docs/x.md"', 'reason = ""']]
      )
    );
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
  });

  it('excludedが0件でもfailにならない [covers:verify-conditions.excluded-absent-passes]', () => {
    const root = newFixture('excluded-none');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
  });

  it('given欠落はwarn [covers:verify-conditions.missing-given-warns]', () => {
    const root = newFixture('no-given');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one', [], ['given'])]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(lowerOutput(r)).toContain('warn');
  });

  it('description・target_function欠落はwarn [covers:verify-conditions.missing-description-or-target-warns]', () => {
    const root = newFixture('no-desc');
    writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [condFields('alpha.one', [], ['description', 'target_function'])])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(lowerOutput(r)).toContain('warn');
  });

  it('meta.featureとファイルstemの不一致はwarn [covers:verify-conditions.feature-stem-mismatch-warns]', () => {
    const root = newFixture('stem-mismatch');
    writeToml(root, 'alpha', buildToml(metaBlock('beta'), [condFields('alpha.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(lowerOutput(r)).toContain('warn');
  });

  it('source欄欠落はデフォルトでwarn（--strict-source無し） [covers:verify-conditions.missing-source-warns-by-default]', () => {
    const root = newFixture('no-source');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one', [], ['source'])]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(lowerOutput(r)).toContain('warn');
  });

  it('warnのみの実行はexit 0 [covers:verify-conditions.warn-only-exits-zero]', () => {
    const root = newFixture('warn-only');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one', [], ['given'])]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(' 0 fail');
    expect(r.stdout).toContain(' 1 warn');
  });

  it('verified=trueの記録形式違反（verified_by不明値・日付形式・hash桁）はwarn [covers:verify-conditions.invalid-verified-record-values-warn]', () => {
    const root = newFixture('verified-format');
    const meta = metaBlock('alpha')
      .replace('verified = false', 'verified = true')
      .replace('verified_at = ""', 'verified_at = "2026/09/11"')
      .replace('verified_by = ""', 'verified_by = "someone"')
      .replace('test_command = ""', 'test_command = "mise run test:vitest"')
      .replace('source_hash = ""', 'source_hash = "xyz"');
    writeToml(root, 'alpha', buildToml(meta, [condFields('alpha.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    // 手編集ミス検出はwarn扱い（failは空・欠落検査が担う）
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(' 0 fail');
    const out = lowerOutput(r);
    expect(out).toContain('verified_by');
    expect(out).toContain('verified_at');
    expect(out).toContain('source_hash');
  });
});

describe('covers検査', () => {
  it('どのidにも一致しないcoversタグはdangling fail [covers:verify-conditions.dangling-tag-fails]', () => {
    const root = newFixture('dangling');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [
      coverIt('one', 'alpha.one'),
      coverIt('ghost', 'alpha.ghost'),
    ]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
    expect(lowerOutput(r)).toContain('alpha.ghost');
  });

  it('カンマ区切りの複数idを分解して全idをcover扱いする [covers:verify-conditions.comma-separated-multi-id-tag]', () => {
    const root = newFixture('comma');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.a'), condFields('alpha.b')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('ab', 'alpha.a,alpha.b')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(' 0 fail');
  });

  it('説明文先頭・末尾両配置のタグを検出する [covers:verify-conditions.tag-position-agnostic]', () => {
    const root = newFixture('position');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.head'), condFields('alpha.tail')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [
      `it('${COVERS_PREFIX}alpha.head] 先頭配置', () => {});`,
      `it('末尾配置 ${COVERS_PREFIX}alpha.tail]', () => {});`,
    ]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(' 0 fail');
  });

  it('コメント行の[covers:はタグ除外+warn [covers:verify-conditions.comment-line-tag-excluded-warns]', () => {
    const root = newFixture('comment-tag');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [
      coverIt('one', 'alpha.one'),
      `// it('コメント内 ${COVERS_PREFIX}alpha.ghost]', () => {});`,
    ]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(lowerOutput(r)).toContain('warn');
  });
});

describe('網羅検査', () => {
  it('coverタグが1つも無い条件はfail [covers:verify-conditions.uncovered-condition-fails]', () => {
    const root = newFixture('uncovered');
    writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [condFields('alpha.covered'), condFields('alpha.uncovered')])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('covered', 'alpha.covered')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('alpha.uncovered');
  });

  it('verified=false+unverifiable_reason付きでもcover無しはfail [covers:verify-conditions.verified-false-with-reason-uncovered-fails]', () => {
    const root = newFixture('exempt');
    writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [
        condFields('alpha.exempt', ['verified = false', 'unverifiable_reason = "環境依存で再現不能"']),
      ])
    );
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('alpha.exempt');
  });

  it('verified=falseでreason無しのcover無し条件はfail [covers:verify-conditions.verified-false-without-reason-uncovered-fails]', () => {
    const root = newFixture('no-reason-uncovered');
    writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [condFields('alpha.bad', ['verified = false'])])
    );
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
  });

  it('verified=false条件へのcoverタグはwarn [covers:verify-conditions.verified-false-with-cover-tag-warns]', () => {
    const root = newFixture('exempt-covered');
    writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [
        condFields('alpha.exempt', ['verified = false', 'unverifiable_reason = "環境依存で再現不能"']),
      ])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('exempt', 'alpha.exempt')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(lowerOutput(r)).toContain('warn');
  });
});

describe('source_lines同期', () => {
  it('source_lines行なしのcover済み条件へid行直後に挿入 [covers:verify-conditions.sync-inserts-after-id-line]', () => {
    const root = newFixture('sync-insert');
    const toml = writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one')]));
    // タグ行は2行目（import文の次）
    writeTest(root, 'tests/unit/alpha.test.ts', ["import { it } from 'vitest';", coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    const after = readFileSync(toml, 'utf8');
    expect(after).toContain('id = "alpha.one"\nsource_lines = "tests/unit/alpha.test.ts:2"');
  });

  it('新形式の値不一致は実際のタグ位置へ置換 [covers:verify-conditions.sync-replaces-mismatched-value]', () => {
    const root = newFixture('sync-replace');
    const toml = writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [condFields('alpha.one', ['source_lines = "tests/unit/alpha.test.ts:99"'])])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', ["import { it } from 'vitest';", coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    const after = readFileSync(toml, 'utf8');
    expect(after).toContain('source_lines = "tests/unit/alpha.test.ts:2"');
    expect(after).not.toContain(':99');
  });

  it('legacy形式（"51"/"44-46"/"27-28,33"）は書き換えずwarn [covers:verify-conditions.legacy-source-lines-skipped-warns]', () => {
    const root = newFixture('sync-legacy');
    const content = buildToml(metaBlock('alpha'), [
      condFields('alpha.l1', ['source_lines = "51"']),
      condFields('alpha.l2', ['source_lines = "44-46"']),
      condFields('alpha.l3', ['source_lines = "27-28,33"']),
    ]);
    const toml = writeToml(root, 'alpha', content);
    writeTest(root, 'tests/unit/alpha.test.ts', [
      "import { it } from 'vitest';",
      coverIt('l1', 'alpha.l1'),
      coverIt('l2', 'alpha.l2'),
      coverIt('l3', 'alpha.l3'),
    ]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(lowerOutput(r)).toContain('warn');
    // legacy行は1文字も書き換わらない
    expect(readFileSync(toml, 'utf8')).toBe(content);
  });

  it('カンマ後空白入りのlegacy形式（"27-28, 33"）も書き換えずwarn [covers:verify-conditions.legacy-source-lines-with-space-skipped-warns]', () => {
    const root = newFixture('sync-legacy-space');
    const content = buildToml(metaBlock('alpha'), [
      condFields('alpha.sp', ['source_lines = "27-28, 33"']),
    ]);
    const toml = writeToml(root, 'alpha', content);
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('sp', 'alpha.sp')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(lowerOutput(r)).toContain('warn');
    // 実corpusに16件実在する空白入り形式（"76-80, 91-93"等）もlegacy扱いで1文字も書き換わらない
    expect(readFileSync(toml, 'utf8')).toBe(content);
  });

  it('legacy・新形式の混在ファイルは新形式のみ同期 [covers:verify-conditions.mixed-legacy-and-new-source-lines]', () => {
    const root = newFixture('sync-mixed');
    const toml = writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [
        condFields('alpha.legacy', ['source_lines = "51"']),
        condFields('alpha.fresh', ['source_lines = "tests/unit/alpha.test.ts:99"']),
      ])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', [
      "import { it } from 'vitest';",
      coverIt('legacy', 'alpha.legacy'),
      coverIt('fresh', 'alpha.fresh'),
    ]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    const after = readFileSync(toml, 'utf8');
    expect(after).toContain('source_lines = "51"');
    expect(after).toContain('source_lines = "tests/unit/alpha.test.ts:3"');
    expect(after).not.toContain(':99');
  });

  it('同一idの複数coverは昇順カンマ連結1行にする [covers:verify-conditions.sync-joins-multiple-covers]', () => {
    const root = newFixture('sync-join');
    const toml = writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.two')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [
      "import { it } from 'vitest';",
      coverIt('first', 'alpha.two'),
      "it('other', () => {});",
      coverIt('second', 'alpha.two'),
    ]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    expect(readFileSync(toml, 'utf8')).toContain(
      'source_lines = "tests/unit/alpha.test.ts:2,tests/unit/alpha.test.ts:4"'
    );
  });

  it('--no-syncは同期要因があってもファイルを一切変更しない [covers:verify-conditions.no-sync-leaves-file-unchanged]', () => {
    const root = newFixture('no-sync');
    const content = buildToml(metaBlock('alpha'), [condFields('alpha.one')]);
    const toml = writeToml(root, 'alpha', content);
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha', '--no-sync']);
    expect(r.status).toBe(0);
    expect(readFileSync(toml, 'utf8')).toBe(content);
  });

  it('想定外形式（単引用符値）はfailし書き戻しをスキップ [covers:verify-conditions.unexpected-format-fails-skips-writeback]', () => {
    const root = newFixture('unexpected');
    const content = buildToml(metaBlock('alpha'), [
      condFields('alpha.one', ["source_lines = 'tests/unit/alpha.test.ts:1'"]),
    ]);
    const toml = writeToml(root, 'alpha', content);
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
    expect(readFileSync(toml, 'utf8')).toBe(content);
  });

  it('CRLF・末尾改行なしファイルの同期diffは対象行のみ [covers:verify-conditions.crlf-and-missing-trailing-newline-preserved]', () => {
    const root = newFixture('crlf');
    const content = buildToml(metaBlock('alpha'), [condFields('alpha.one')])
      .replace(/\n/g, '\r\n')
      .replace(/(?:\r\n)+$/, '');
    const toml = writeToml(root, 'alpha', content);
    writeTest(root, 'tests/unit/alpha.test.ts', ["import { it } from 'vitest';", coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    const after = readFileSync(toml, 'utf8');
    expect(after.endsWith('\n')).toBe(false);
    expect(after).toContain('\r\n');
    // 対象行以外は1文字も変更されていない: 挿入行を除去すると元contentと完全一致
    const inserted = 'source_lines = "tests/unit/alpha.test.ts:2"\r\n';
    expect(after).toContain(inserted);
    expect(after.replace(inserted, '')).toBe(content);
  });

  it('id行が改行なし最終行の条件へ挿入しても末尾改行を追加しない [covers:verify-conditions.sync-insert-preserves-missing-trailing-newline]', () => {
    const root = newFixture('sync-tail');
    const content = `${metaBlock('alpha')}\n\n[[condition]]\nexpect_no_throw = true\nid = "alpha.one"`;
    const toml = writeToml(root, 'alpha', content);
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(0);
    const after = readFileSync(toml, 'utf8');
    // 挿入行が改行なしの新最終行になる（id行に改行を補うが末尾改行の有無は不変）
    expect(after.endsWith('\n')).toBe(false);
    expect(after).toBe(
      `${metaBlock('alpha')}\n\n[[condition]]\nexpect_no_throw = true\nid = "alpha.one"\nsource_lines = "tests/unit/alpha.test.ts:1"`
    );
  });
});

describe('strict系', () => {
  it('--strict-sourceでsource欠落がfail昇格 [covers:verify-conditions.strict-source-escalates-fail]', () => {
    const root = newFixture('strict-source');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one', [], ['source'])]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha', '--strict-source']);
    expect(r.status).toBe(1);
  });
});

/** bootstrap用のtNN条件フィールド（設計書テンプレート形式。descriptionは説明文そのまま） */
function tnnFields(stem: string, nn: number, description: string): string[] {
  const nn2 = String(nn).padStart(2, '0');
  return [
    `id = "${stem}.t${nn2}"`,
    'target_function = ""',
    'source = ""',
    `description = "テスト: ${description}"`,
    'given = ""',
    'expect_no_throw = true',
    `source_lines = "tests/unit/${stem}.test.ts:${nn2}"`,
  ];
}

describe('--bootstrap', () => {
  it('stable id付き条件書はskip報告で上書きしない [covers:verify-conditions.bootstrap-stable-id-skips]', () => {
    const root = newFixture('boot-stable');
    const content = buildToml(metaBlock('alpha'), [condFields('alpha.stable')]);
    const toml = writeToml(root, 'alpha', content);
    const testPath = join(root, 'tests/unit/alpha.test.ts');
    writeTest(root, 'tests/unit/alpha.test.ts', ["it('plain case', () => {});"]);
    const r = runVerify(root, ['--bootstrap', toml, testPath]);
    expect(r.status).toBe(0);
    expect(lowerOutput(r)).toContain('skip');
    expect(readFileSync(toml, 'utf8')).toBe(content);
  });

  it('タグ無しitを既存最大NN+1で採番し末尾追記（欠番埋めない） [covers:verify-conditions.bootstrap-numbers-tnn-max-plus-one]', () => {
    const root = newFixture('boot-number');
    const toml = writeToml(
      root,
      'example',
      buildToml(metaBlock('example'), [tnnFields('example', 1, 'first'), tnnFields('example', 3, 'third')])
    );
    const testPath = join(root, 'tests/unit/example.test.ts');
    writeTest(root, 'tests/unit/example.test.ts', [
      "it('second case', () => {});",
      "it('fourth case', () => {});",
    ]);
    const r = runVerify(root, ['--bootstrap', toml, testPath]);
    expect(r.status).toBe(0);
    const after = readFileSync(toml, 'utf8');
    expect(after).toContain('example.t04');
    expect(after).toContain('example.t05');
    expect(after).not.toContain('example.t02');
  });

  it('既存行とテストファイルは一切書き換えない [covers:verify-conditions.bootstrap-preserves-existing-lines]', () => {
    const root = newFixture('boot-preserve');
    const content = `# 手動コメント（保持対象）\n${buildToml(metaBlock('example'), [tnnFields('example', 1, 'first')])}`;
    const toml = writeToml(root, 'example', content);
    const testPath = join(root, 'tests/unit/example.test.ts');
    const testContent = "it('kept case', () => {});\n";
    writeTest(root, 'tests/unit/example.test.ts', ["it('kept case', () => {});"]);
    const r = runVerify(root, ['--bootstrap', toml, testPath]);
    expect(r.status).toBe(0);
    const after = readFileSync(toml, 'utf8');
    // 追記のみ（既存部分が先頭にそのまま残る）
    expect(after.startsWith(content)).toBe(true);
    expect(after.length).toBeGreaterThan(content.length);
    // テストファイル側はcoversタグ付与等を行わない
    expect(readFileSync(testPath, 'utf8')).toBe(testContent);
  });

  it('coversタグ付きitは新規採番対象から除外 [covers:verify-conditions.bootstrap-excludes-tagged-it]', () => {
    const root = newFixture('boot-tagged');
    const toml = writeToml(
      root,
      'example',
      buildToml(metaBlock('example'), [tnnFields('example', 1, 'first')])
    );
    const testPath = join(root, 'tests/unit/example.test.ts');
    writeTest(root, 'tests/unit/example.test.ts', [
      coverIt('first', 'example.t01'),
      "it('plain case', () => {});",
    ]);
    const r = runVerify(root, ['--bootstrap', toml, testPath]);
    expect(r.status).toBe(0);
    const after = readFileSync(toml, 'utf8');
    // 既存1件 + 新規1件（タグ付きit分は追記されない）
    expect((after.match(/\[\[condition\]\]/g) ?? []).length).toBe(2);
    expect(after).toContain('テスト: plain case');
  });

  it('既存条件と同一説明文は新規採番せずwarn [covers:verify-conditions.bootstrap-duplicate-description-warns]', () => {
    const root = newFixture('boot-dup');
    const toml = writeToml(
      root,
      'example',
      buildToml(metaBlock('example'), [tnnFields('example', 1, 'dup case')])
    );
    const testPath = join(root, 'tests/unit/example.test.ts');
    writeTest(root, 'tests/unit/example.test.ts', ["it('dup case', () => {});"]);
    const r = runVerify(root, ['--bootstrap', toml, testPath]);
    expect(r.status).toBe(0);
    expect(lowerOutput(r)).toContain('warn');
    const after = readFileSync(toml, 'utf8');
    expect((after.match(/\[\[condition\]\]/g) ?? []).length).toBe(1);
  });

  it('it.each等の修飾呼び出しを検出したらfail [covers:verify-conditions.bootstrap-modified-call-fails]', () => {
    const root = newFixture('boot-each');
    const toml = writeToml(
      root,
      'example',
      buildToml(metaBlock('example'), [tnnFields('example', 1, 'first')])
    );
    const testPath = join(root, 'tests/unit/example.test.ts');
    writeTest(root, 'tests/unit/example.test.ts', [
      "it.each([1, 2])('n %d', () => {});",
      "it('plain case', () => {});",
    ]);
    const r = runVerify(root, ['--bootstrap', toml, testPath]);
    expect(r.status).toBe(1);
  });

  it('対応itが消失した既存tNN条件は削除せずwarn [covers:verify-conditions.bootstrap-missing-it-warns-not-deletes]', () => {
    const root = newFixture('boot-gone');
    const toml = writeToml(
      root,
      'example',
      buildToml(metaBlock('example'), [tnnFields('example', 1, 'gone case')])
    );
    const testPath = join(root, 'tests/unit/example.test.ts');
    writeTest(root, 'tests/unit/example.test.ts', ["it('other case', () => {});"]);
    const r = runVerify(root, ['--bootstrap', toml, testPath]);
    expect(r.status).toBe(0);
    expect(lowerOutput(r)).toContain('warn');
    expect(readFileSync(toml, 'utf8')).toContain('example.t01');
  });

  it('toml不在なら雛形から新規生成（t01採番） [covers:verify-conditions.bootstrap-generates-new-toml]', () => {
    const root = newFixture('boot-new');
    const tomlPath = join(root, 'tests/design/newfeat/conditions.toml');
    const testPath = join(root, 'tests/unit/newfeat.test.ts');
    writeTest(root, 'tests/unit/newfeat.test.ts', ["it('fresh case', () => {});"]);
    const r = runVerify(root, ['--bootstrap', tomlPath, testPath]);
    expect(r.status).toBe(0);
    const after = readFileSync(tomlPath, 'utf8');
    expect(after).toContain('newfeat.t01');
    expect(after).toContain('テスト: fresh case');
  });
});

describe('--verified', () => {
  it('検証全pass時にmetaへ検証記録を書く [covers:verify-conditions.verified-writes-meta-on-pass]', () => {
    const root = newFixture('verified-pass');
    // source_fileを実在ファイルにする（source_hash取得対象）
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src/example.ts'), 'export {};\n');
    // source_linesを正しく事前記載し同期差分を発生させない
    const toml = writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [
        condFields('alpha.one', ['source_lines = "tests/unit/alpha.test.ts:2"']),
      ])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', ["import { it } from 'vitest';", coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha', '--verified', 'claude', '--test-command', 'mise run test:vitest']);
    expect(r.status).toBe(0);
    const after = readFileSync(toml, 'utf8');
    expect(after).toContain('verified = true');
    expect(after).toContain('verified_by = "claude"');
    expect(after).toContain('test_command = "mise run test:vitest"');
    expect(after).toMatch(/source_hash = "[0-9a-f]{40}"/);
  });

  it('検証fail時はmetaを書かずexit 1 [covers:verify-conditions.verified-fail-leaves-meta-unchanged]', () => {
    const root = newFixture('verified-fail');
    // cover無し条件（coverage fail）
    const content = buildToml(metaBlock('alpha'), [condFields('alpha.uncovered')]);
    const toml = writeToml(root, 'alpha', content);
    const r = runVerify(root, ['alpha', '--verified', 'claude', '--test-command', 'mise run test:vitest']);
    expect(r.status).toBe(1);
    expect(readFileSync(toml, 'utf8')).toBe(content);
  });

  it('source_hash取得失敗時はmetaを一切更新しない [covers:verify-conditions.verified-hash-failure-leaves-meta-unchanged]', () => {
    const root = newFixture('verified-hash');
    const content = buildToml(
      metaBlock('alpha', 'src/missing.ts'),
      [condFields('alpha.one', ['source_lines = "tests/unit/alpha.test.ts:2"'])]
    );
    const toml = writeToml(root, 'alpha', content);
    writeTest(root, 'tests/unit/alpha.test.ts', ["import { it } from 'vitest';", coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha', '--verified', 'claude', '--test-command', 'mise run test:vitest']);
    expect(r.status).toBe(1);
    expect(readFileSync(toml, 'utf8')).toBe(content);
  });

  it('対象外feature由来のdanglingタグは検証記録をブロックしない [covers:verify-conditions.verified-unblocked-by-foreign-dangling]', () => {
    const root = newFixture('verified-dangling');
    // source_fileを実在ファイルにする（source_hash取得対象）
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src/example.ts'), 'export {};\n');
    const toml = writeToml(
      root,
      'alpha',
      buildToml(metaBlock('alpha'), [
        condFields('alpha.one', ['source_lines = "tests/unit/alpha.test.ts:2"']),
      ])
    );
    writeTest(root, 'tests/unit/alpha.test.ts', ["import { it } from 'vitest';", coverIt('one', 'alpha.one')]);
    // betaの条件書は存在しない → dangling（feature横断検出）
    writeTest(root, 'tests/unit/other.test.ts', [coverIt('ghost', 'beta.never')]);
    const r = runVerify(root, ['alpha', '--verified', 'claude', '--test-command', 'mise run test:vitest']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('beta.never');
    const after = readFileSync(toml, 'utf8');
    expect(after).toContain('verified = true');
    expect(after).toContain('verified_by = "claude"');
  });

  it('対象featureのテストファイル内danglingタグは検証記録をブロック [covers:verify-conditions.verified-blocks-local-dangling]', () => {
    const root = newFixture('verified-local-dangling');
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src/example.ts'), 'export {};\n');
    const content = buildToml(metaBlock('alpha'), [
      condFields('alpha.one', ['source_lines = "tests/unit/alpha.test.ts:2"']),
    ]);
    const toml = writeToml(root, 'alpha', content);
    // alpha.oneのcoverと同一テストファイル内にdanglingタグ（typo等）を置く
    writeTest(root, 'tests/unit/alpha.test.ts', [
      "import { it } from 'vitest';",
      coverIt('one', 'alpha.one'),
      coverIt('ghost', 'beta.never'),
    ]);
    const r = runVerify(root, ['alpha', '--verified', 'claude', '--test-command', 'mise run test:vitest']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('beta.never');
    expect(readFileSync(toml, 'utf8')).toBe(content);
  });

  it('複数対象のうち1つでもsource_file不在なら全対象のmetaを書かない [covers:verify-conditions.verified-multi-target-atomic-write]', () => {
    const root = newFixture('verified-atomic');
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src/example.ts'), 'export {};\n');
    const contentAlpha = buildToml(metaBlock('alpha'), [
      condFields('alpha.one', ['source_lines = "tests/unit/alpha.test.ts:2"']),
    ]);
    const tomlAlpha = writeToml(root, 'alpha', contentAlpha);
    const contentBeta = buildToml(metaBlock('beta', 'src/missing.ts'), [
      condFields('beta.two', ['source_lines = "tests/unit/alpha.test.ts:3"']),
    ]);
    const tomlBeta = writeToml(root, 'beta', contentBeta);
    writeTest(root, 'tests/unit/alpha.test.ts', [
      "import { it } from 'vitest';",
      coverIt('one', 'alpha.one'),
      coverIt('two', 'beta.two'),
    ]);
    const r = runVerify(root, ['alpha', 'beta', '--verified', 'claude', '--test-command', 'mise run test:vitest']);
    expect(r.status).toBe(1);
    // 1番目（source_file実在）のmetaも書き換わらない（一部だけverified=trueにしない）
    expect(readFileSync(tomlAlpha, 'utf8')).toBe(contentAlpha);
    expect(readFileSync(tomlBeta, 'utf8')).toBe(contentBeta);
  });
});

describe('exit code・出力', () => {
  it('failは FAIL <feature> <id>: 形式で列挙しexit 1 [covers:verify-conditions.report-fail-line-format]', () => {
    const root = newFixture('fail-format');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.uncovered')]));
    const r = runVerify(root, ['alpha']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('FAIL alpha alpha.uncovered:');
  });

  it('最終サマリ行（files/conditions/fail/warn/synced）を出力 [covers:verify-conditions.report-summary-line]', () => {
    const root = newFixture('summary');
    writeToml(root, 'alpha', buildToml(metaBlock('alpha'), [condFields('alpha.one')]));
    writeTest(root, 'tests/unit/alpha.test.ts', [coverIt('one', 'alpha.one')]);
    const r = runVerify(root, ['alpha']);
    expect(r.stdout).toMatch(
      /\d+ files \/ \d+ conditions \/ \d+ fail \/ \d+ warn \/ \d+ synced/
    );
  });
});

describe('実corpus smoke', () => {
  it('browser-configを--no-syncで実行し完走・サマリ行出力 [covers:verify-conditions.corpus-smoke-browser-config-no-sync]', () => {
    // exit 0/1は実corpusの実在failに依存するため両方許容（異常終了・クラッシュでないこと）
    const r = runVerify(REPO_ROOT, ['browser-config', '--no-sync']);
    expect([0, 1]).toContain(r.status);
    expect(r.stdout).toMatch(
      /\d+ files \/ \d+ conditions \/ \d+ fail \/ \d+ warn \/ \d+ synced/
    );
  });
});
