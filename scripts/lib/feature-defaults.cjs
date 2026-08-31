'use strict';

/**
 * configs/features.toml のパースと feature flag デフォルト値の解決
 *
 * webpack.config.cjs（DefinePlugin）と vitest.config.ts（define）の両方から
 * 共用される。ビルド時に __FEATURE_DEFAULTS__ として注入される値の供給元。
 *
 * features.toml は「セクション = 機能ID、キーは default のみ、値は
 * true / false / "dev-only"」という固定構造を想定し、仕様から逸脱した
 * 内容はすべてエラーにする（黙って欠損した状態でビルドされないように）。
 */

const fs = require('fs');
const path = require('path');

const FEATURES_TOML_PATH = path.resolve(__dirname, '..', '..', 'configs', 'features.toml');

/** default 値に許容される特別な文字列リテラル（開発ビルドのみ有効を表す） */
const DEV_ONLY = 'dev-only';

/**
 * 1行からコメント部分（# 以降）を除去する。
 * 値内のダブルクォートで囲まれていない # のみをコメント扱いにするため、
 * 単純な先頭一致ではなく最小限のクォート考慮を行う。
 */
function stripComment(line) {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inString = !inString;
    if (ch === '#' && !inString) return line.slice(0, i);
  }
  return line;
}

/**
 * default 値のリテラルをパースする。
 * @returns {boolean | 'dev-only'}
 */
function parseDefaultValue(raw) {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === `"${DEV_ONLY}"`) return DEV_ONLY;
  throw new Error(`features.toml: 不正な default 値です（true / false / "dev-only" のみ許容）: ${raw}`);
}

/**
 * features.toml のソース文字列をパースする。
 *
 * @param {string} source TOMLソース
 * @returns {Record<string, { default: boolean | 'dev-only' }>}
 */
function parseFeaturesToml(source) {
  /** @type {Record<string, { default: boolean | 'dev-only' }>} */
  const result = {};
  let currentSection = null;

  const lines = source.split(/\r?\n/);
  for (let lineNumber = 1; lineNumber <= lines.length; lineNumber++) {
    const line = stripComment(lines[lineNumber - 1]).trim();
    if (line === '') continue;

    const sectionMatch = line.match(/^\[([A-Za-z0-9_-]+)\]$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      if (result[sectionName]) {
        throw new Error(`features.toml ${lineNumber}行目: セクション [${sectionName}] が重複しています`);
      }
      result[sectionName] = {};
      currentSection = sectionName;
      continue;
    }

    const kvMatch = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!kvMatch) {
      throw new Error(`features.toml ${lineNumber}行目: 解析できない行です: ${line}`);
    }
    if (!currentSection) {
      throw new Error(`features.toml ${lineNumber}行目: セクション外にキーがあります: ${line}`);
    }
    const [, key, rawValue] = kvMatch;
    if (key !== 'default') {
      throw new Error(
        `features.toml ${lineNumber}行目: セクション [${currentSection}] に許容されないキー "${key}" があります（default のみ許容）`
      );
    }
    result[currentSection][key] = parseDefaultValue(rawValue);
  }

  // default 欠損チェック
  for (const [sectionName, section] of Object.entries(result)) {
    if (section.default === undefined) {
      throw new Error(`features.toml: セクション [${sectionName}] に default がありません`);
    }
  }

  return result;
}

/**
 * features.toml の内容をビルド種別に応じて boolean に解決する。
 *
 * @param {boolean} isDev 開発ビルドかどうか（true: dev-only を true に解決）
 * @param {string} [source] パース対象のソース（省略時は configs/features.toml を読む）
 * @returns {Record<string, boolean>} 機能ID -> デフォルト値（解決済み）
 */
function resolveFeatureDefaults(isDev, source) {
  const tomlSource = source !== undefined ? source : fs.readFileSync(FEATURES_TOML_PATH, 'utf8');
  const parsed = parseFeaturesToml(tomlSource);

  /** @type {Record<string, boolean>} */
  const resolved = {};
  for (const [id, section] of Object.entries(parsed)) {
    resolved[id] = section.default === DEV_ONLY ? isDev : section.default;
  }
  return resolved;
}

module.exports = {
  FEATURES_TOML_PATH,
  parseFeaturesToml,
  resolveFeatureDefaults,
};
