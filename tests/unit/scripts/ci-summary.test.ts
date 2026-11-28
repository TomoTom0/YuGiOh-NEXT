/**
 * scripts/ci-summary.sh と .github/workflows/ci.yml (Summary step の配線) の単体テスト
 *
 * 条件書: tests/design/ci-summary/conditions.toml (script の判定)
 *   tests/design/ci-workflow/conditions.toml (ci.yml の配線)
 * 設計: tmp/tasks/tm-654/design_ci-failure-propagation.md (D1〜D7)
 *
 * 方式:
 * - script は spawnSync('bash', [<script>]) に env を渡して起動し、終了コードと stdout で検証する
 * - ci.yml は step 単位の block に分解して配線を検証する (YAML parser を依存に持たないため line 単位)
 * fixture は tmp/test-ci-summary/ 配下に mkdtempSync で動的生成し、実repoへの書込は
 * 行わない (afterEach で削除)。
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = path.resolve(__dirname, '../../../scripts/ci-summary.sh');
const WORKFLOW_PATH = path.resolve(__dirname, '../../../.github/workflows/ci.yml');
// テスト用fixtureの一時ディレクトリ（プロジェクトルールにより ./tmp/ 配下）
const TMP_ROOT = path.resolve(__dirname, '../../../tmp/test-ci-summary');

/** script が判定に使う入力4変数 (ci.yml の Summary step の env) */
type InputKey =
  | 'JOB_STATUS'
  | 'BUILD_CONCLUSION'
  | 'UNIT_TESTS_CONCLUSION'
  | 'TYPE_CHECK_CONCLUSION';
type SummaryInput = Partial<Record<InputKey, string>>;

const NO_INPUT: SummaryInput = {};

const ALL_SUCCESS: SummaryInput = {
  JOB_STATUS: 'success',
  BUILD_CONCLUSION: 'success',
  UNIT_TESTS_CONCLUSION: 'success',
  TYPE_CHECK_CONCLUSION: 'success',
};

function withInput(override: SummaryInput): SummaryInput {
  return { ...ALL_SUCCESS, ...override };
}

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function toEnv(env: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const defined = Object.entries(env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );
  return Object.fromEntries(defined);
}

function runScript(input: SummaryInput, extraEnv: NodeJS.ProcessEnv = {}): RunResult {
  // 未設定の入力を意図的に再現するため、process.env は継承しない (PATH のみ渡す)
  const r = spawnSync('bash', [SCRIPT_PATH], {
    encoding: 'utf8',
    env: toEnv({ PATH: process.env.PATH ?? '', ...input, ...extraEnv }),
  });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

let fixtureRoot: string | undefined;

function makeFixture(): string {
  mkdirSync(TMP_ROOT, { recursive: true });
  fixtureRoot = mkdtempSync(path.join(TMP_ROOT, 'case-'));
  return fixtureRoot;
}

afterEach(() => {
  if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
  fixtureRoot = undefined;
});

describe('scripts/ci-summary.sh の終了コード', () => {
  it('[covers:ci-summary.all-success-exits-0] job status と3 step がすべて success なら exit 0', () => {
    const r = runScript(ALL_SUCCESS);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('CI result: passed');
  });

  it.each<[string, SummaryInput, string]>([
    [
      'Build が failure で後続が skipped',
      withInput({
        JOB_STATUS: 'failure',
        BUILD_CONCLUSION: 'failure',
        UNIT_TESTS_CONCLUSION: 'skipped',
        TYPE_CHECK_CONCLUSION: 'skipped',
      }),
      'Build: failure',
    ],
    [
      'Run unit tests が failure で後続が skipped',
      withInput({
        JOB_STATUS: 'failure',
        UNIT_TESTS_CONCLUSION: 'failure',
        TYPE_CHECK_CONCLUSION: 'skipped',
      }),
      'Run unit tests: failure',
    ],
    [
      'Type check が failure',
      withInput({ JOB_STATUS: 'failure', TYPE_CHECK_CONCLUSION: 'failure' }),
      'Type check (vue-tsc): failure',
    ],
    [
      'Run unit tests が cancelled で後続が skipped',
      withInput({
        JOB_STATUS: 'cancelled',
        UNIT_TESTS_CONCLUSION: 'cancelled',
        TYPE_CHECK_CONCLUSION: 'skipped',
      }),
      'Run unit tests: cancelled',
    ],
    [
      'Run unit tests が timed_out',
      withInput({ JOB_STATUS: 'failure', UNIT_TESTS_CONCLUSION: 'timed_out' }),
      'Run unit tests: timed_out',
    ],
    // job status が success のまま渡されても、step の conclusion 単独で失敗を検出する
    ['job status は success のまま', withInput({ UNIT_TESTS_CONCLUSION: 'failure' }), 'Run unit tests: failure'],
  ])('[covers:ci-summary.step-not-success-exits-1] %s のとき exit 1', (_label, input, shown) => {
    const r = runScript(input);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('CI result: failed');
    expect(r.stdout).toContain(shown);
  });

  it('[covers:ci-summary.job-status-not-success-exits-1] 3 step が success でも job status が success 以外なら exit 1', () => {
    const r = runScript(withInput({ JOB_STATUS: 'failure' }));
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('Job status: failure');
    expect(r.stdout).toContain('CI result: failed');
  });

  it.each<[string, SummaryInput, string]>([
    ['全部未設定', NO_INPUT, 'Build: (unset)'],
    ['Type check の conclusion だけ未設定', withInput({ TYPE_CHECK_CONCLUSION: undefined }), 'Type check (vue-tsc): (unset)'],
  ])('[covers:ci-summary.unset-input-treated-as-not-success] %s なら exit 1', (_label, input, shown) => {
    const r = runScript(input);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain(shown);
    expect(r.stdout).toContain('CI result: failed');
  });
});

describe('scripts/ci-summary.sh の表示 (GITHUB_STEP_SUMMARY)', () => {
  it('[covers:ci-summary.writes-step-summary-when-path-set] GITHUB_STEP_SUMMARY があれば結果表を追記する', () => {
    const summaryPath = path.join(makeFixture(), 'summary.md');
    const r = runScript(withInput({ JOB_STATUS: 'failure' }), { GITHUB_STEP_SUMMARY: summaryPath });
    expect(r.status).toBe(1);
    const summary = readFileSync(summaryPath, 'utf8');
    expect(summary).toContain('| Build | success |');
    expect(summary).toContain('| Run unit tests | success |');
    expect(summary).toContain('| Type check (vue-tsc) | success |');
    expect(summary).toContain('| Job status | failure |');
    expect(summary).toContain('CI result: failed');
  });

  it('[covers:ci-summary.no-step-summary-file-when-unset] GITHUB_STEP_SUMMARY が無ければ file を作らない', () => {
    const dir = makeFixture();
    const r = runScript(ALL_SUCCESS, { HOME: dir, TMPDIR: dir, TMP: dir, TEMP: dir });
    expect(r.status).toBe(0);
    expect(readdirSync(dir)).toEqual([]);
  });

  it('[covers:ci-summary.step-summary-write-failure-does-not-mask-result] 結果表の追記に失敗しても終了コードは判定に従う', () => {
    // directory への追記は失敗する
    const r = runScript(ALL_SUCCESS, { GITHUB_STEP_SUMMARY: makeFixture() });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('CI result: passed');
  });
});

interface StepBlock {
  name: string;
  body: string[];
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/** ci.yml の `steps:` 配下にある `- name:` を区切りに、step 単位の block に分解する */
function extractSteps(workflow: string): StepBlock[] {
  const steps: StepBlock[] = [];
  let open: StepBlock | undefined;
  let openIndent = 0;
  for (const line of workflow.split('\n')) {
    const matched = /^(\s*)- name: (.+?)\s*$/.exec(line);
    if (matched?.[1] !== undefined && matched[2] !== undefined) {
      open = { name: matched[2], body: [] };
      openIndent = matched[1].length;
      steps.push(open);
      continue;
    }
    if (!open) continue;
    // step の block は `- name:` より浅い indent の行 (job 直下の key 等) で終わる
    if (line.trim() !== '' && indentOf(line) < openIndent) {
      open = undefined;
      continue;
    }
    open.body.push(line);
  }
  return steps;
}

function readWorkflow(): string {
  return readFileSync(WORKFLOW_PATH, 'utf8');
}

function stepBody(workflow: string, name: string): string {
  const step = extractSteps(workflow).find((candidate) => candidate.name === name);
  if (!step) {
    throw new Error(`ci.yml に step "${name}" が無い`);
  }
  return step.body.join('\n');
}

// 絵文字と記号類 (条件書 ci-workflow.no-emoji の範囲)
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

describe('.github/workflows/ci.yml の配線', () => {
  it('[covers:ci-workflow.steps-have-no-continue-on-error] Build / Run unit tests / Type check に continue-on-error が無い', () => {
    const workflow = readWorkflow();
    for (const name of ['Build', 'Run unit tests', 'Type check (vue-tsc)']) {
      expect(stepBody(workflow, name), `step "${name}"`).not.toContain('continue-on-error');
    }
  });

  it('[covers:ci-workflow.summary-step-always-calls-script] Summary step は always で動き、3 step の conclusion と job status を script へ渡す', () => {
    const workflow = readWorkflow();
    expect(stepBody(workflow, 'Build')).toMatch(/^\s+id: build$/m);
    expect(stepBody(workflow, 'Run unit tests')).toMatch(/^\s+id: unit-tests$/m);
    expect(stepBody(workflow, 'Type check (vue-tsc)')).toMatch(/^\s+id: type-check$/m);

    const summary = stepBody(workflow, 'Summary');
    expect(summary).toMatch(/^\s+if: always\(\)$/m);
    expect(summary).toMatch(/^\s+JOB_STATUS: \$\{\{ job\.status \}\}$/m);
    expect(summary).toMatch(/^\s+BUILD_CONCLUSION: \$\{\{ steps\.build\.conclusion \}\}$/m);
    expect(summary).toMatch(/^\s+UNIT_TESTS_CONCLUSION: \$\{\{ steps\.unit-tests\.conclusion \}\}$/m);
    expect(summary).toMatch(/^\s+TYPE_CHECK_CONCLUSION: \$\{\{ steps\.type-check\.conclusion \}\}$/m);
    expect(summary).toMatch(/^\s+run: bash scripts\/ci-summary\.sh$/m);
    // step 本体で exit 0 にすると失敗を握りつぶすため、書かない
    expect(summary).not.toContain('exit 0');
  });

  it('[covers:ci-workflow.no-emoji] ci.yml と scripts/ci-summary.sh に絵文字が無い', () => {
    expect(readWorkflow()).not.toMatch(EMOJI_RE);
    expect(readFileSync(SCRIPT_PATH, 'utf8')).not.toMatch(EMOJI_RE);
  });
});
