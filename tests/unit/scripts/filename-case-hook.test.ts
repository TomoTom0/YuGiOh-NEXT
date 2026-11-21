/**
 * .claude/hooks/check-new-filename.mjs の単体テスト
 *
 * 条件書: tests/design/filename-case-hook/conditions.toml（TASK-535）
 * 設計: tmp/tasks/tm-535/design_filename-case-hook.md (D1〜D10)
 *
 * 方式:
 * - 判定関数 checkPath を import して直接検証する
 * - CLI I/O 契約は spawnSync('node', [script]) に stdin JSON を流して検証する
 * fixture は tmp/test-filename-case-hook/ 配下に mkdtempSync で動的生成し、
 * 実repoへの書込は行わない（afterEach で削除）。
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();
const SCRIPT_PATH = resolve(REPO_ROOT, '.claude/hooks/check-new-filename.mjs');
const TMP_ROOT = join(REPO_ROOT, 'tmp', 'test-filename-case-hook');

type CheckResult = { decision: 'allow' | 'ask'; reason?: string };
let checkPath: (absPath: string, projectDir: string) => CheckResult;

beforeAll(async () => {
  const mod = (await import(pathToFileURL(SCRIPT_PATH).href)) as {
    checkPath: typeof checkPath;
  };
  checkPath = mod.checkPath;
});

let fixtureRoot: string;

function makeFixture(): string {
  mkdirSync(TMP_ROOT, { recursive: true });
  const root = mkdtempSync(join(TMP_ROOT, 'case-'));
  const dirs = [
    'src/components',
    'src/composables',
    'src/utils',
    'docs/dev',
    'docs/new',
    'docs/feature',
    'tests/unit/components',
  ];
  for (const d of dirs) mkdirSync(join(root, d), { recursive: true });
  // 対応test判定用の実ファイル（git未追跡の状態を再現）
  writeFileSync(join(root, 'src/components/Sample.vue'), '');
  // overwrite判定用の既存ファイル
  writeFileSync(join(root, 'docs/ExistingUpper.md'), '');
  return root;
}

function runCli(input: string): { status: number | null; stdout: string } {
  const r = spawnSync('node', [SCRIPT_PATH], {
    input,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: fixtureRoot },
  });
  return { status: r.status, stdout: r.stdout ?? '' };
}

function writeInput(filePath: string): string {
  return JSON.stringify({
    session_id: 'test-session',
    tool_name: 'Write',
    tool_input: { file_path: filePath, content: 'x' },
  });
}

afterEach(() => {
  if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
});

describe('checkPath（判定関数）', () => {
  it('小文字のみの新規pathはaskしない [covers:filename-case-hook.lowercase-new-path-allowed]', () => {
    fixtureRoot = makeFixture();
    const r = checkPath(join(fixtureRoot, 'docs/dev/new-note.md'), fixtureRoot);
    expect(r.decision).toBe('allow');
  });

  it('既存ファイルのoverwriteは大文字でもaskしない [covers:filename-case-hook.overwrite-existing-allowed]', () => {
    fixtureRoot = makeFixture();
    const r = checkPath(join(fixtureRoot, 'docs/ExistingUpper.md'), fixtureRoot);
    expect(r.decision).toBe('allow');
  });

  it('新規basenameの大文字はaskする [covers:filename-case-hook.uppercase-basename-asks]', () => {
    fixtureRoot = makeFixture();
    const r = checkPath(
      join(fixtureRoot, 'docs/dev/TESTING_PHASE_COMPLETE.md'),
      fixtureRoot
    );
    expect(r.decision).toBe('ask');
  });

  it('新規ディレクトリ名の大文字もaskする [covers:filename-case-hook.uppercase-directory-asks]', () => {
    fixtureRoot = makeFixture();
    const r = checkPath(join(fixtureRoot, 'docs/dev/NewDir/readme.md'), fixtureRoot);
    expect(r.decision).toBe('ask');
  });

  it('除外glob・慣例名に一致する新規ファイルは素通りする [covers:filename-case-hook.exclusion-glob-allowed]', () => {
    fixtureRoot = makeFixture();
    const cases = [
      'docs/new/README.md',
      'src/components/NewComp.vue',
      'LICENSE',
      'CONTRIBUTING.md',
      'docs/feature/appSettings.toml',
    ];
    for (const rel of cases) {
      const r = checkPath(join(fixtureRoot, rel), fixtureRoot);
      expect(r.decision, rel).toBe('allow');
    }
  });

  it('対応sourceが実在するtestは素通りする [covers:filename-case-hook.corresponding-test-allowed]', () => {
    fixtureRoot = makeFixture();
    const r = checkPath(
      join(fixtureRoot, 'tests/unit/components/Sample.test.ts'),
      fixtureRoot
    );
    expect(r.decision).toBe('allow');
  });

  it('対応sourceが無い大文字stemのtestはaskする [covers:filename-case-hook.orphan-test-asks]', () => {
    fixtureRoot = makeFixture();
    const r = checkPath(
      join(fixtureRoot, 'tests/unit/components/Ghost.test.ts'),
      fixtureRoot
    );
    expect(r.decision).toBe('ask');
  });

  it('src配下でも除外外の大文字はaskする [covers:filename-case-hook.uppercase-in-src-asks]', () => {
    fixtureRoot = makeFixture();
    const r = checkPath(join(fixtureRoot, 'src/utils/BadName.ts'), fixtureRoot);
    expect(r.decision).toBe('ask');
  });

  it('src配下のuse*.tsは素通りする [covers:filename-case-hook.composable-use-excluded]', () => {
    fixtureRoot = makeFixture();
    const r = checkPath(
      join(fixtureRoot, 'src/composables/useNewFeature.ts'),
      fixtureRoot
    );
    expect(r.decision).toBe('allow');
  });

  it('repo外の絶対pathは素通りする [covers:filename-case-hook.outside-repo-allowed]', () => {
    fixtureRoot = makeFixture();
    const outside = join(dirname(fixtureRoot), 'outside-UPPER.md');
    const r = checkPath(outside, fixtureRoot);
    expect(r.decision).toBe('allow');
  });
});

describe('CLI I/O契約', () => {
  it('不正JSONでもexit 0で素通りする [covers:filename-case-hook.invalid-json-fail-open]', () => {
    fixtureRoot = makeFixture();
    const r = runCli('this is not json');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('file_path欠損でもexit 0で素通りする [covers:filename-case-hook.missing-fields-fail-open]', () => {
    fixtureRoot = makeFixture();
    for (const input of ['{}', JSON.stringify({ tool_name: 'Write', tool_input: {} })]) {
      const r = runCli(input);
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('');
    }
  });

  it('Write以外のtool_nameは素通りする [covers:filename-case-hook.non-write-tool-ignored]', () => {
    fixtureRoot = makeFixture();
    const input = JSON.stringify({
      tool_name: 'Edit',
      tool_input: { file_path: join(fixtureRoot, 'docs/dev/UPPER.md') },
    });
    const r = runCli(input);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('ask時はhookSpecificOutputのJSONをexit 0で返す [covers:filename-case-hook.ask-output-contract]', () => {
    fixtureRoot = makeFixture();
    const r = runCli(writeInput(join(fixtureRoot, 'docs/dev/UPPER.md')));
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as {
      hookSpecificOutput: {
        hookEventName: string;
        permissionDecision: string;
        permissionDecisionReason: string;
      };
    };
    expect(out.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(out.hookSpecificOutput.permissionDecision).toBe('ask');
    expect(out.hookSpecificOutput.permissionDecisionReason.length).toBeGreaterThan(0);
  });

  it('reasonに対象pathが含まれ、valid JSONである [covers:filename-case-hook.ask-reason-json-escape]', () => {
    fixtureRoot = makeFixture();
    const r = runCli(writeInput(join(fixtureRoot, 'docs/dev/UPPER.md')));
    const out = JSON.parse(r.stdout) as {
      hookSpecificOutput: { permissionDecisionReason: string };
    };
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain(
      'docs/dev/UPPER.md'
    );
  });
});
