#!/usr/bin/env node
/**
 * PreToolUse (Write) hook: 新規ファイル名の大文字検出 (TASK-535)
 *
 * repo相対pathに大文字ASCIIを含む新規ファイル作成で permissionDecision=ask
 * を返し、小文字命名への矯正を促す。設計: tmp/tasks/tm-535/design_filename-case-hook.md
 *
 * - 判定は checkPath(absPath, projectDir) に分離し、単体テストから直接検証する
 * - 失敗時は常に無出力・exit 0 の fail-open (exit 2 は deny 扱いになるため使わない)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// --- 除外リスト (変更はこの定数への追加で完結する) ---
// 慣例名として大文字が公認されているbasename
const EXACT_BASENAME_EXCLUSIONS = new Set([
  'LICENSE',
  'CLAUDE.md',
  'AGENTS.md',
  'THIRD-PARTY-LICENSES.md',
  'CONTRIBUTING.md',
]);
// CLAUDE.md記載の正規管理ファイル (repo相対path)
const EXACT_PATH_EXCLUSIONS = new Set([
  'docs/feature/appSettings.toml',
  'docs/feature/featureSettings.toml',
]);

function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** src/ 配下の全ファイルについて、拡張子を除いたstemの集合を作る */
function collectSourceStems(srcDir) {
  const stems = new Set();
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const dot = entry.name.indexOf('.');
        stems.add(dot === -1 ? entry.name : entry.name.slice(0, dot));
      }
    }
  };
  walk(srcDir);
  return stems;
}

/**
 * 判定コア。
 * @returns {{decision: 'allow'} | {decision: 'ask', reason: string}}
 */
export function checkPath(absPath, projectDir) {
  const rel = toPosix(path.relative(projectDir, absPath));

  // repo外は対象外
  if (rel === '' || rel.startsWith('../') || path.isAbsolute(rel)) {
    return { decision: 'allow' };
  }
  // 既存ファイルのoverwriteは妨げない
  if (fs.existsSync(absPath)) {
    return { decision: 'allow' };
  }
  // 大文字を含まない
  if (!/[A-Z]/.test(rel)) {
    return { decision: 'allow' };
  }

  const base = rel.split('/').pop();

  // 除外: 慣例名 (exact basename)
  if (EXACT_BASENAME_EXCLUSIONS.has(base)) return { decision: 'allow' };
  // 除外: README*.md (root・サブディレクトリ共通の慣例)
  if (/^README.*\.md$/.test(base)) return { decision: 'allow' };
  // 除外: *.vue (PascalCase がプロジェクト慣例)
  if (base.endsWith('.vue')) return { decision: 'allow' };
  // 除外: 正規管理ファイル (exact path)
  if (EXACT_PATH_EXCLUSIONS.has(rel)) return { decision: 'allow' };
  // 除外: src/**/use*.ts (composable の camelCase 慣例)
  if (rel.startsWith('src/') && /^use[^/]*\.ts$/.test(base)) {
    return { decision: 'allow' };
  }
  // 除外: 対応test (stem が src/ 配下の実ファイルと一致)
  if (base.includes('.test.')) {
    const stem = base.slice(0, base.indexOf('.test.'));
    const stems = collectSourceStems(path.join(projectDir, 'src'));
    if (stems.has(stem)) return { decision: 'allow' };
  }

  return {
    decision: 'ask',
    reason:
      `新規ファイル名に大文字ASCIIを含みます（命名規則: 小文字ASCII英数字・_はフィールド境界・-は単語区切り）。` +
      `${rel}。慣例名・*.vue・src配下use*.ts・対応testに該当しない場合、小文字リネームを推奨します。` +
      `続行する場合はこのまま承認してください。`,
  };
}

function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    raw += chunk;
  });
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(raw);
      if (!input || input.tool_name !== 'Write') return;
      const filePath = input.tool_input?.file_path;
      if (typeof filePath !== 'string' || filePath === '') return;
      const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
      const result = checkPath(filePath, projectDir);
      if (result.decision === 'ask') {
        process.stdout.write(
          JSON.stringify({
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'ask',
              permissionDecisionReason: result.reason,
            },
          })
        );
      }
    } catch {
      // fail-open: 無出力・exit 0
    }
  });
}

const isMain = (() => {
  try {
    return (
      process.argv[1] &&
      fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])
    );
  } catch {
    return false;
  }
})();

if (isMain) {
  main();
}
