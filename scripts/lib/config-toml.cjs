'use strict';

/**
 * configs/ 配下のTOML設定ファイル読み込み（汎用）
 *
 * webpack.config.cjs（DefinePlugin）と vitest.config.ts（define）の両方から
 * 共用される。ビルド時定数注入の供給元。
 * features.toml のような固定構造の専用パースは scripts/lib/feature-defaults.cjs
 * 側で行い、ここは smol-toml による標準TOMLパースのみを担う。
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('smol-toml');

const CONFIGS_DIR = path.resolve(__dirname, '..', '..', 'configs');

/**
 * configs/ 配下のTOMLファイルをパースしてオブジェクトで返す。
 *
 * @param {string} relativePath configs/ からの相対パス（例: 'ux.toml'）
 * @returns {Record<string, unknown>}
 */
function loadConfigToml(relativePath) {
  const source = fs.readFileSync(path.join(CONFIGS_DIR, relativePath), 'utf8');
  return parse(source);
}

module.exports = {
  CONFIGS_DIR,
  loadConfigToml,
};
