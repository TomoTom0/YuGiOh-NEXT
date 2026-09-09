/**
 * scripts/debug/setup/lib/browser-config.sh の単体テスト
 *
 * 条件書: tests/design/browser-config/conditions.toml
 * （TASK-466: start-chrome.sh の環境依存破綻修正で新設された共通ライブラリ）
 *
 * 方式: libをbashサブシェルでsourceして各関数を直接呼び出し、stdout / exit code /
 * stderr で検証する。環境は PROJECT_ROOT / BROWSER_CONFIG / HOME / PATH を
 * fixture（tmp/test-browser-config/ 配下）で完全に差し替える。
 *
 * 注意: resolve-binary-all-candidates-missing-dies は本開発機に
 * /usr/bin/chromium-browser と /snap/bin/chromium が存在するため再現不能
 * （条件書で verified=false + unverifiable_reason を付記済み）。
 */

import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import {
  accessSync,
  chmodSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import * as http from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'smol-toml';

const require = createRequire(import.meta.url);
// configs/ ディレクトリ解決（app-ux-defaults.test.ts と同じ方式）
const { CONFIGS_DIR } = require('../../../scripts/lib/config-toml.cjs');

const REPO_ROOT = process.cwd();
const LIB_PATH = resolve(REPO_ROOT, 'scripts/debug/setup/lib/browser-config.sh');
// テスト用fixtureの一時ディレクトリ（プロジェクトルールにより ./tmp/ 配下）
const TMP_ROOT = join(REPO_ROOT, 'tmp', 'test-browser-config');

// bash は絶対パスで起動する（子プロセス側のPATHを空にするテストがあるため、
// spawn時の実行ファイル解決を親のPATHで済ませておく）
const BASH = (() => {
  const r = spawnSync('bash', ['-c', 'command -v bash'], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout.trim()) {
    throw new Error('bashが解決できません');
  }
  return r.stdout.trim();
})();

// libをsourceして第1引数の関数を残りの引数付きで呼ぶbashスクリプト
const RUN_SCRIPT = 'source "$1"; shift; fn="$1"; shift; "$fn" "$@"';

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface Fixture {
  /** fixtureルート = libから見たPROJECT_ROOT */
  root: string;
  /** 偽のHOME（~展開・Playwright探索の制御用） */
  home: string;
  /** BROWSER_CONFIG（fixtureのbrowser.toml） */
  configPath: string;
  /** ${PROJECT_ROOT}/.env（RSYNC_PATH fallbackの制御用） */
  envPath: string;
}

let fixtureDirs: string[] = [];
let childProcs: ChildProcess[] = [];
let httpServers: http.Server[] = [];

afterEach(() => {
  for (const child of childProcs) {
    if (child.exitCode === null && !child.killed) {
      child.kill('SIGKILL');
    }
  }
  childProcs = [];
  for (const server of httpServers) {
    server.close();
  }
  httpServers = [];
  for (const dir of fixtureDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  fixtureDirs = [];
});

function newFixture(name: string): Fixture {
  mkdirSync(TMP_ROOT, { recursive: true });
  const root = mkdtempSync(join(TMP_ROOT, `${name}-`));
  fixtureDirs.push(root);
  const home = join(root, 'home');
  mkdirSync(home, { recursive: true });
  const configPath = join(root, 'browser.toml');
  writeFileSync(configPath, '# fixture\n');
  return { root, home, configPath, envPath: join(root, '.env') };
}

/**
 * lib呼び出し用の環境変数一式。
 * PATHは/usr/bin:/bin（+必要なら追加）に固定し、偽HOME・偽PROJECT_ROOTを渡す。
 * /snap/bin を含めないため `command -v chromium` は追加ディレクトリの偽物のみ命中する。
 */
function libEnv(fx: Fixture, extraPathDir?: string): NodeJS.ProcessEnv {
  const pathDirs = ['/usr/bin', '/bin'];
  if (extraPathDir) {
    pathDirs.push(extraPathDir);
  }
  return {
    PATH: pathDirs.join(':'),
    HOME: fx.home,
    PROJECT_ROOT: fx.root,
    BROWSER_CONFIG: fx.configPath,
    LANG: 'C.UTF-8',
  };
}

/** [chrome] セクションのみのfixture設定を書く（bodyはTOML断片） */
function writeChromeSection(fx: Fixture, body: string): void {
  writeFileSync(fx.configPath, `# fixture\n[chrome]\n${body}\n`);
}

/** 任意内容のfixture設定を書く */
function writeConfig(fx: Fixture, content: string): void {
  writeFileSync(fx.configPath, content);
}

/** 実行可能な空ファイルを作成（resolve_binary の候補fixture用） */
function makeExecutableFile(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, '#!/bin/sh\n');
  chmodSync(filePath, 0o755);
}

function isExecutableFile(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function runLib(fn: string, fnArgs: string[], env: NodeJS.ProcessEnv): RunResult {
  const r = spawnSync(BASH, ['-c', RUN_SCRIPT, 'bash', LIB_PATH, fn, ...fnArgs], {
    env,
    encoding: 'utf8',
    timeout: 30000,
  });
  if (r.error) {
    throw r.error;
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function runLibAsync(fn: string, fnArgs: string[], env: NodeJS.ProcessEnv): Promise<RunResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(BASH, ['-c', RUN_SCRIPT, 'bash', LIB_PATH, fn, ...fnArgs], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('close', (status) => {
      resolvePromise({ status, stdout, stderr });
    });
  });
}

// --- stop_port / fetch_ws_url 用の補助 ---

/** 空きポートでlistenし、実際にbindしたポート番号をportFileへ書く子プロセス */
function spawnPortListener(portFile: string, options: { ignoreTerm: boolean }): ChildProcess {
  const termLogFile = `${portFile}.terms`;
  const script = [
    "const fs = require('node:fs');",
    "const net = require('node:net');",
    options.ignoreTerm
      ? `process.on('SIGTERM', () => { fs.appendFileSync(${JSON.stringify(termLogFile)}, '1'); });`
      : '',
    'const server = net.createServer(() => {});',
    `server.listen(0, '127.0.0.1', () => {`,
    `  fs.writeFileSync(${JSON.stringify(portFile)}, String(server.address().port));`,
    '});',
  ].join('\n');
  const child = spawn(process.execPath, ['-e', script], { stdio: 'ignore' });
  childProcs.push(child);
  return child;
}

async function waitFor(predicate: () => boolean, timeoutMs: number, what: string): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`タイムアウト: ${what}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function waitAndReadPort(portFile: string): Promise<number> {
  await waitFor(() => existsSync(portFile), 5000, `ポート番号ファイル ${portFile}`);
  return Number.parseInt(readFileSync(portFile, 'utf8'), 10);
}

function waitForExit(child: ChildProcess, timeoutMs = 5000): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(new Error('プロセスが終了しませんでした')), timeoutMs);
    child.once('exit', () => {
      clearTimeout(timer);
      resolvePromise();
    });
  });
}

function isAlive(pid: number | undefined): boolean {
  if (pid === undefined) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

interface JsonServer {
  port: number;
  close: () => Promise<void>;
}

function trackServer(server: http.Server): http.Server {
  httpServers.push(server);
  return server;
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((done) => {
    // closeがhangしない保障（残接続の考慮）
    const timer = setTimeout(() => done(), 2000);
    server.close(() => {
      clearTimeout(timer);
      done();
    });
  });
}

/** 指定bodyを /json に返すダミーCDPサーバ（ポートは空きポート） */
function startJsonServer(getBody: () => string): Promise<JsonServer> {
  const server = trackServer(http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(getBody());
  }));
  return new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') {
        throw new Error('listenアドレスの取得に失敗しました');
      }
      resolvePromise({ port: addr.port, close: () => closeServer(server) });
    });
  });
}

/** 空きポートを1つ確保して解放する（「誰もlistenしていないポート」の再現用） */
function reserveFreePort(): Promise<number> {
  return new Promise((resolvePromise) => {
    const server = http.createServer(() => {});
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') {
        throw new Error('listenアドレスの取得に失敗しました');
      }
      const { port } = addr;
      server.close(() => resolvePromise(port));
    });
  });
}

// --- die() ---

describe('browser-config.sh die', () => {
  it("[covers:browser-config.die-writes-stderr-and-exits-1] stderrに[ERROR]付きメッセージを出力しexit 1する（stdoutは空）", () => {
    const fx = newFixture('die');
    const r = runLib('die', ['テストメッセージ'], libEnv(fx));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('[ERROR] テストメッセージ');
    expect(r.stdout).toBe('');
  });
});

// --- require_cmd() ---

describe('browser-config.sh require_cmd', () => {
  it('[covers:browser-config.require-cmd-present-returns-0] PATH上に存在するコマンドはdieせず終了コード0', () => {
    const fx = newFixture('req-present');
    const r = runLib('require_cmd', ['curl'], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
    expect(r.stdout).toBe('');
  });

  it("[covers:browser-config.require-cmd-missing-dies] PATH上に無いコマンドはdie（'tomlq' メッセージ付きexit 1）", () => {
    const fx = newFixture('req-missing');
    const emptyBin = join(fx.root, 'empty-bin');
    mkdirSync(emptyBin, { recursive: true });
    const env = libEnv(fx);
    env.PATH = emptyBin;
    const r = runLib('require_cmd', ['tomlq'], env);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("必須コマンド 'tomlq' が見つかりません");
  });
});

// --- read_cfg() ---

describe('browser-config.sh read_cfg', () => {
  it('[covers:browser-config.read-cfg-double-quoted-value] 二重引用符の値から引用符を除去して返す（末尾改行なし）', () => {
    const fx = newFixture('cfg-double');
    writeChromeSection(fx, 'ws_file = "tmp/browser/chrome/debug.ws"');
    const r = runLib('read_cfg', ['chrome', 'ws_file'], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('tmp/browser/chrome/debug.ws');
  });

  it("[covers:browser-config.read-cfg-single-quoted-value] 単引用符（TOMLリテラル文字列）にも対応し引用符を除去する", () => {
    const fx = newFixture('cfg-single');
    writeChromeSection(fx, "profile_dir = 'tmp/browser/chrome/profile'");
    const r = runLib('read_cfg', ['chrome', 'profile_dir'], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('tmp/browser/chrome/profile');
  });

  it('[covers:browser-config.read-cfg-bare-number-and-bool] クォートなしの数値・bool値は文字列としてそのまま返る', () => {
    const fx = newFixture('cfg-bare');
    writeChromeSection(fx, 'debug_port = 9222\nheadless = false');
    const port = runLib('read_cfg', ['chrome', 'debug_port'], libEnv(fx));
    expect(port.status).toBe(0);
    expect(port.stdout).toBe('9222');
    const headless = runLib('read_cfg', ['chrome', 'headless'], libEnv(fx));
    expect(headless.status).toBe(0);
    expect(headless.stdout).toBe('false');
  });

  it('[covers:browser-config.read-cfg-strips-trailing-comment] 行末の # コメントを除去して値を返す', () => {
    const fx = newFixture('cfg-comment');
    writeConfig(fx, '# fixture\n[login-vnc]\nport = 39050 # VNC用ポート\n');
    const r = runLib('read_cfg', ['login-vnc', 'port'], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('39050');
  });

  it('[covers:browser-config.read-cfg-truncates-at-hash-in-value] 値内の # は最初の # 以降が切り捨てられる', () => {
    const fx = newFixture('cfg-hash');
    writeChromeSection(fx, 'ws_file = "tmp/a#b"');
    const r = runLib('read_cfg', ['chrome', 'ws_file'], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('tmp/a');
  });

  it('[covers:browser-config.read-cfg-undefined-key-or-section-empty] 未定義key・未定義sectionはdieせず空文字列（終了コード0）', () => {
    const fx = newFixture('cfg-undef');
    writeChromeSection(fx, 'ws_file = "tmp/browser/chrome/debug.ws"');
    const undefinedKey = runLib('read_cfg', ['chrome', 'nonexistent_key'], libEnv(fx));
    expect(undefinedKey.status).toBe(0);
    expect(undefinedKey.stdout).toBe('');
    const undefinedSection = runLib('read_cfg', ['no_such_section', 'ws_file'], libEnv(fx));
    expect(undefinedSection.status).toBe(0);
    expect(undefinedSection.stdout).toBe('');
  });

  it('[covers:browser-config.read-cfg-no-section-boundary-leak] 後続セクションの同名keyは読み取らない（空文字列）', () => {
    const fx = newFixture('cfg-boundary');
    writeConfig(
      fx,
      [
        '# fixture',
        '[chrome]',
        'ws_file = "tmp/browser/chrome/debug.ws"',
        '',
        '[login-vnc]',
        'port = 39050',
        '',
      ].join('\n'),
    );
    // [chrome] に無い key（port）は後続 [login-vnc] から読まない
    const forward = runLib('read_cfg', ['chrome', 'port'], libEnv(fx));
    expect(forward.status).toBe(0);
    expect(forward.stdout).toBe('');
    // 逆方向（[login-vnc] に無い key を [chrome] が持つ）も同様
    const backward = runLib('read_cfg', ['login-vnc', 'ws_file'], libEnv(fx));
    expect(backward.status).toBe(0);
    expect(backward.stdout).toBe('');
    // 対象section内の key は読み取れる（fixtureが壊れていないことの確認）
    const own = runLib('read_cfg', ['login-vnc', 'port'], libEnv(fx));
    expect(own.stdout).toBe('39050');
  });

  it('[covers:browser-config.read-cfg-commented-out-line-empty] 行頭 # でコメントアウトされたキー行は未定義扱い（空文字列）', () => {
    const fx = newFixture('cfg-commented');
    writeChromeSection(fx, '# binary = "/path/to/chrome"');
    const r = runLib('read_cfg', ['chrome', 'binary'], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('[covers:browser-config.read-cfg-missing-config-file-dies] BROWSER_CONFIG自体が存在しない場合はdie', () => {
    const fx = newFixture('cfg-missing-file');
    const env = libEnv(fx);
    env.BROWSER_CONFIG = join(fx.root, 'no-such-config.toml');
    const r = runLib('read_cfg', ['chrome', 'ws_file'], env);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('設定ファイルが見つかりません');
    expect(r.stderr).toContain('no-such-config.toml');
  });
});

// --- resolve_binary() ---

describe('browser-config.sh resolve_binary', () => {
  it('[covers:browser-config.resolve-binary-configured-relative-path] プロジェクトルート相対パスはPROJECT_ROOT連結の絶対パスを返す', () => {
    const fx = newFixture('bin-rel');
    makeExecutableFile(join(fx.root, 'tmp', 'test', 'chrome'));
    writeChromeSection(fx, 'binary = "tmp/test/chrome"');
    const r = runLib('resolve_binary', [], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(join(fx.root, 'tmp', 'test', 'chrome'));
  });

  it('[covers:browser-config.resolve-binary-configured-tilde-path] ~/開始はHOMEに展開する', () => {
    const fx = newFixture('bin-tilde');
    makeExecutableFile(join(fx.home, 'bin', 'chrome'));
    writeChromeSection(fx, 'binary = "~/bin/chrome"');
    const r = runLib('resolve_binary', [], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(join(fx.home, 'bin', 'chrome'));
  });

  it('[covers:browser-config.resolve-binary-configured-absolute-path] 絶対パスは連結・展開せずそのまま返す', () => {
    const fx = newFixture('bin-abs');
    // 絶対パス指定の分岐（/*)を検証するため、fixture配下の絶対パスをそのまま設定する
    // （条件書の /opt/... 例と同じ分岐。root権限不要）
    const absBinary = join(fx.root, 'opt', 'chrome-bin', 'chrome');
    makeExecutableFile(absBinary);
    writeChromeSection(fx, `binary = "${absBinary}"`);
    const r = runLib('resolve_binary', [], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(absBinary);
  });

  it('[covers:browser-config.resolve-binary-configured-not-executable-dies] 存在しないパス・実行bit無しファイルはdie', () => {
    const fx = newFixture('bin-notexec');
    // 存在しないパス
    writeChromeSection(fx, 'binary = "tmp/no-such-chrome"');
    const missing = runLib('resolve_binary', [], libEnv(fx));
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('chrome.binary に指定されたバイナリが実行可能ではありません');
    expect(missing.stderr).toContain(join(fx.root, 'tmp', 'no-such-chrome'));
    // 実行bitの無いファイル
    const notExecutable = join(fx.root, 'tmp', 'plain', 'chrome');
    mkdirSync(dirname(notExecutable), { recursive: true });
    writeFileSync(notExecutable, 'not executable\n');
    chmodSync(notExecutable, 0o644);
    writeChromeSection(fx, `binary = "${notExecutable}"`);
    const noBit = runLib('resolve_binary', [], libEnv(fx));
    expect(noBit.status).toBe(1);
    expect(noBit.stderr).toContain('chrome.binary に指定されたバイナリが実行可能ではありません');
  });

  it('[covers:browser-config.resolve-binary-unset-prefers-newest-playwright] 空ならPlaywright同梱Chromiumのバージョン最新をシステム候補より優先する', () => {
    const fx = newFixture('bin-playwright');
    makeExecutableFile(join(fx.home, '.cache', 'ms-playwright', 'chromium-1000', 'chrome-linux', 'chrome'));
    const newest = join(fx.home, '.cache', 'ms-playwright', 'chromium-1200', 'chrome-linux64', 'chrome');
    makeExecutableFile(newest);
    writeChromeSection(fx, 'binary = ""');
    const r = runLib('resolve_binary', [], libEnv(fx));
    expect(r.status).toBe(0);
    // chromium-1000 < chromium-1200 のため chromium-1200 が選ばれる（sort -V の最大）
    expect(r.stdout).toBe(newest);
  });

  it('[covers:browser-config.resolve-binary-unset-system-fallback-order] Playwright不在なら最初に存在かつ実行可能なシステム候補を返す', () => {
    const fx = newFixture('bin-system');
    // 偽HOMEに ms-playwright は作らない（Playwright候補なしの状態）
    writeChromeSection(fx, 'binary = ""');
    // PATH上の偽chromium（候補の最後）
    const fakeBinDir = join(fx.root, 'fakebin');
    makeExecutableFile(join(fakeBinDir, 'chromium'));
    const r = runLib('resolve_binary', [], libEnv(fx, fakeBinDir));
    // /usr/bin と /snap/bin はfixtureで制御できないため、実際の候補順
    // [/usr/bin/chromium-browser, /snap/bin/chromium, PATH上のchromium] のうち
    // 最初に「存在かつ実行可能」なものを検証環境の実態から計算して期待値とする
    // （本開発機では3候補とも存在するため、順序どおり先頭のものが返ることも検証される）
    const candidates = [
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      join(fakeBinDir, 'chromium'),
    ];
    const expected = candidates.find((c) => isExecutableFile(c));
    expect(expected).toBeDefined();
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(expected);
  });
});

// --- resolve_extension_dir() ---

describe('browser-config.sh resolve_extension_dir', () => {
  it('[covers:browser-config.resolve-extension-dir-configured-relative-path] プロジェクトルート相対パスはPROJECT_ROOT連結の絶対パスを返す', () => {
    const fx = newFixture('ext-rel');
    const extDir = join(fx.root, 'tmp', 'test', 'ext');
    mkdirSync(extDir, { recursive: true });
    writeChromeSection(fx, 'extension_dir = "tmp/test/ext"');
    const r = runLib('resolve_extension_dir', [], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(extDir);
  });

  it('[covers:browser-config.resolve-extension-dir-configured-tilde-path] ~/開始はHOMEに展開する', () => {
    const fx = newFixture('ext-tilde');
    const extDir = join(fx.home, 'ext', 'ygo-next');
    mkdirSync(extDir, { recursive: true });
    writeChromeSection(fx, 'extension_dir = "~/ext/ygo-next"');
    const r = runLib('resolve_extension_dir', [], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(extDir);
  });

  it('[covers:browser-config.resolve-extension-dir-configured-absolute-path] 絶対パスは連結・展開せずそのまま返す', () => {
    const fx = newFixture('ext-abs');
    // 絶対パス指定の分岐をfixture配下の絶対パスで検証（条件書の /opt/... 例と同じ分岐）
    const extDir = join(fx.root, 'opt', 'ext', 'ygo-next');
    mkdirSync(extDir, { recursive: true });
    writeChromeSection(fx, `extension_dir = "${extDir}"`);
    const r = runLib('resolve_extension_dir', [], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(extDir);
  });

  it('[covers:browser-config.resolve-extension-dir-configured-not-directory-dies] 存在しないパスはdie', () => {
    const fx = newFixture('ext-notdir');
    writeChromeSection(fx, 'extension_dir = "tmp/no-such-ext"');
    const r = runLib('resolve_extension_dir', [], libEnv(fx));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('chrome.extension_dir に指定されたディレクトリが存在しません');
    expect(r.stderr).toContain(join(fx.root, 'tmp', 'no-such-ext'));
  });

  it('[covers:browser-config.resolve-extension-dir-env-missing-dies] extension_dir空で.env自体が無い場合はdie', () => {
    const fx = newFixture('ext-env-missing');
    writeChromeSection(fx, 'extension_dir = ""');
    // ${PROJECT_ROOT}/.env は作らない
    const r = runLib('resolve_extension_dir', [], libEnv(fx));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('.env が見つかりません');
    expect(r.stderr).toContain('chrome.extension_dir を指定してください');
  });

  it('[covers:browser-config.resolve-extension-dir-rsync-path-empty-dies] .envにRSYNC_PATH行が無い/値が空の場合はdie', () => {
    const fx = newFixture('ext-rsync-empty');
    writeChromeSection(fx, 'extension_dir = ""');
    // RSYNC_PATH 行が無い .env
    writeFileSync(fx.envPath, '# comment\nOTHER_KEY=value\n');
    const noLine = runLib('resolve_extension_dir', [], libEnv(fx));
    expect(noLine.status).toBe(1);
    expect(noLine.stderr).toContain('.env の RSYNC_PATH が空です');
    // 値が空の RSYNC_PATH 行
    writeFileSync(fx.envPath, 'RSYNC_PATH=\n');
    const emptyValue = runLib('resolve_extension_dir', [], libEnv(fx));
    expect(emptyValue.status).toBe(1);
    expect(emptyValue.stderr).toContain('.env の RSYNC_PATH が空です');
  });

  it('[covers:browser-config.resolve-extension-dir-rsync-path-tilde-expanded] .envのRSYNC_PATHの先頭~はHOMEに展開される', () => {
    const fx = newFixture('ext-rsync-tilde');
    writeChromeSection(fx, 'extension_dir = ""');
    writeFileSync(fx.envPath, 'RSYNC_PATH=~/work/data/rsync/chrome-ext/ygo-next\n');
    const r = runLib('resolve_extension_dir', [], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(join(fx.home, 'work', 'data', 'rsync', 'chrome-ext', 'ygo-next'));
  });

  it('[covers:browser-config.resolve-extension-dir-rsync-path-quotes-stripped] RSYNC_PATHの二重・単引用符は除去される', () => {
    const fx = newFixture('ext-rsync-quotes');
    writeChromeSection(fx, 'extension_dir = ""');
    writeFileSync(fx.envPath, 'RSYNC_PATH="/path/to/ext"\n');
    const doubleQuoted = runLib('resolve_extension_dir', [], libEnv(fx));
    expect(doubleQuoted.status).toBe(0);
    expect(doubleQuoted.stdout).toBe('/path/to/ext');
    writeFileSync(fx.envPath, "RSYNC_PATH='/path/to/ext2'\n");
    const singleQuoted = runLib('resolve_extension_dir', [], libEnv(fx));
    expect(singleQuoted.status).toBe(0);
    expect(singleQuoted.stdout).toBe('/path/to/ext2');
  });

  it('[covers:browser-config.resolve-extension-dir-env-fallback-skips-dir-validation] .envのRSYNC_PATH経由では存在検査せず展開済みパスを返す', () => {
    const fx = newFixture('ext-rsync-nocheck');
    writeChromeSection(fx, 'extension_dir = ""');
    const notExisting = join(fx.root, 'no-such-dir', 'chrome-ext');
    writeFileSync(fx.envPath, `RSYNC_PATH=${notExisting}\n`);
    const r = runLib('resolve_extension_dir', [], libEnv(fx));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(notExisting);
  });
});

// --- stop_port() ---

describe('browser-config.sh stop_port', () => {
  it('[covers:browser-config.stop-port-kills-listeners] listen中のPIDのみ終了し0を返す（他ポートのプロセスは生存）', async () => {
    const fx = newFixture('stop-kill');
    const portFileA = join(fx.root, 'portA');
    const portFileB = join(fx.root, 'portB');
    const childA = spawnPortListener(portFileA, { ignoreTerm: false });
    const childB = spawnPortListener(portFileB, { ignoreTerm: false });
    const portA = await waitAndReadPort(portFileA);
    await waitAndReadPort(portFileB);

    const r = runLib('stop_port', [String(portA)], libEnv(fx));
    expect(r.status).toBe(0);
    // ポートAのlistenプロセスのみ終了
    await waitForExit(childA);
    // ポート外のプロセスは巻き込まれない
    expect(isAlive(childB.pid)).toBe(true);
  }, 15000);

  it('[covers:browser-config.stop-port-no-listener-returns-1] 誰もlistenしていないポートはkillせず1を返す', async () => {
    const fx = newFixture('stop-none');
    const port = await reserveFreePort();
    const r = runLib('stop_port', [String(port)], libEnv(fx));
    expect(r.status).toBe(1);
  }, 10000);

  it('[covers:browser-config.stop-port-custom-signal] 第2引数のシグナルが渡る: TERM無視プロセスはKILLで終了する', async () => {
    const fx = newFixture('stop-kill-sig');
    const portFile = join(fx.root, 'port');
    const child = spawnPortListener(portFile, { ignoreTerm: true });
    const port = await waitAndReadPort(portFile);

    // デフォルトTERMではtrapして生存する
    const term = runLib('stop_port', [String(port)], libEnv(fx));
    expect(term.status).toBe(0);
    await waitFor(() => existsSync(`${portFile}.terms`), 5000, 'TERM受信記録ファイル');
    expect(isAlive(child.pid)).toBe(true);

    // KILL指定で終了する
    const kill = runLib('stop_port', [String(port), 'KILL'], libEnv(fx));
    expect(kill.status).toBe(0);
    await waitForExit(child);
  }, 15000);
});

// --- fetch_ws_url() ---

describe('browser-config.sh fetch_ws_url', () => {
  it('[covers:browser-config.fetch-ws-url-writes-first-page-target] page型のwebSocketDebuggerUrlをws_fileへ書く（他type無視・複数pageは先頭・親dir自動作成）', async () => {
    const fx = newFixture('ws-ok');
    const payload = JSON.stringify([
      { type: 'browser', webSocketDebuggerUrl: 'ws://localhost:9222/devtools/browser/xxx' },
      { type: 'page', webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/first' },
      { type: 'page', webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/second' },
    ]);
    const server = await startJsonServer(() => payload);
    // 親ディレクトリが存在しない深いパス（自動作成の検証）
    const wsFile = join(fx.root, 'deep', 'nested', 'dir', 'debug.ws');
    // サーバが同一プロセス内のため同期spawn（spawnSync）だとイベントループが
    // 停止してサーバが応答できずデッドロックする。runLibAsync（非同期）を使うこと
    const r = await runLibAsync('fetch_ws_url', [String(server.port), wsFile, '5'], libEnv(fx));
    expect(r.status).toBe(0);
    expect(readFileSync(wsFile, 'utf8')).toBe('ws://localhost:9222/devtools/page/first');
    await server.close();
  }, 15000);

  it('[covers:browser-config.fetch-ws-url-timeout-returns-1] page型URLが取れない状態がtimeout秒続くと1を返しws_fileは書かれない', async () => {
    const fx = newFixture('ws-timeout');
    // 接続拒否（サーバ不在）
    const refusedPort = await reserveFreePort();
    const wsFile1 = join(fx.root, 'refused', 'debug.ws');
    const refused = await runLibAsync('fetch_ws_url', [String(refusedPort), wsFile1, '1'], libEnv(fx));
    expect(refused.status).toBe(1);
    expect(existsSync(wsFile1)).toBe(false);
    // page型なし（browser型のみを返すサーバ）
    const server = await startJsonServer(() =>
      JSON.stringify([{ type: 'browser', webSocketDebuggerUrl: 'ws://localhost:9222/devtools/browser/xxx' }]),
    );
    const wsFile2 = join(fx.root, 'nopage', 'debug.ws');
    const noPage = await runLibAsync('fetch_ws_url', [String(server.port), wsFile2, '1'], libEnv(fx));
    expect(noPage.status).toBe(1);
    expect(existsSync(wsFile2)).toBe(false);
    await server.close();
  }, 20000);

  it('[covers:browser-config.fetch-ws-url-retries-until-success] 初回拒否でも即断念せずポーリングしtimeout内の成功で0を返す', async () => {
    const fx = newFixture('ws-retry');
    const port = await reserveFreePort();
    const wsFile = join(fx.root, 'retry', 'debug.ws');
    // 1.2秒後にlistenを開始するダミーサーバ（初回のcurlは接続拒否になる）
    const delayedServer = new Promise<http.Server>((resolveServer) => {
      setTimeout(() => {
        const server = http.createServer((_req, res) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify([{ type: 'page', webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/retry-ok' }]),
          );
        });
        server.listen(port, '127.0.0.1', () => resolveServer(trackServer(server)));
      }, 1200);
    });
    const startedAt = Date.now();
    const r = await runLibAsync('fetch_ws_url', [String(port), wsFile, '10'], libEnv(fx));
    expect(r.status).toBe(0);
    // サーバがlistenを始める前（約1.2秒）に成功できないため、再試行を経たことになる
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(1000);
    expect(readFileSync(wsFile, 'utf8')).toBe('ws://localhost:9222/devtools/page/retry-ok');
    const server = await delayedServer;
    await closeServer(server);
  }, 30000);
});

// --- configs/browser.toml 出荷値の仕様制約 ---

describe('configs/browser.toml 出荷値', () => {
  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  const browserToml = parse(readFileSync(resolve(CONFIGS_DIR, 'browser.toml'), 'utf8'));

  it('[covers:browser-config.browser-toml-chrome-paths-non-hidden] chrome.profile_dir / ws_fileは非隠しのtmp/browser/chrome/配下パス', () => {
    const chrome = browserToml.chrome;
    expect(isRecord(chrome)).toBe(true);
    if (!isRecord(chrome)) {
      return;
    }
    const profileDir = chrome.profile_dir;
    const wsFile = chrome.ws_file;
    expect(profileDir).toBe('tmp/browser/chrome/profile');
    expect(wsFile).toBe('tmp/browser/chrome/debug.ws');
    // snap版chromiumで読み書き不能になる隠しディレクトリ（ピリオド開始セグメント）を含まない
    for (const p of [profileDir, wsFile]) {
      expect(typeof p).toBe('string');
      expect(p).toMatch(/^tmp\/browser\/chrome\//);
      expect(p).not.toContain('/.');
      expect(p.startsWith('.')).toBe(false);
    }
  });

  it('[covers:browser-config.browser-toml-login-vnc-port-range] login-vnc.portは39050-39054内の数値', () => {
    const loginVnc = browserToml['login-vnc'];
    expect(isRecord(loginVnc)).toBe(true);
    if (!isRecord(loginVnc)) {
      return;
    }
    const port = loginVnc.port;
    expect(typeof port).toBe('number');
    expect(port).toBeGreaterThanOrEqual(39050);
    expect(port).toBeLessThanOrEqual(39054);
    expect(port).toBe(39050);
  });
});
