/**
 * configs/app-settings.toml / configs/ux.toml と DEFAULT_APP_SETTINGS /
 * DEFAULT_UX_SETTINGS の整合テスト
 *
 * 設定デフォルト値のSingle Source of Truthはconfigs/*.toml。
 * src/types/settings.ts の DEFAULT_* はビルド時注入（__APP_SETTINGS_DEFAULTS__ /
 * __UX_SETTINGS_DEFAULTS__）から構築されるため、このテストは
 * 「tomlの内容がDEFAULT_*に正しく反映されていること」を検証する。
 * tomlを変更したらこのテストが整合を保証する（settings.ts側を書き換える必要がない）。
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'smol-toml';
import { DEFAULT_APP_SETTINGS, DEFAULT_UX_SETTINGS } from '@/types/settings';

const require = createRequire(import.meta.url);
// CommonJS実装（webpack.config.cjs / vitest.config.ts と共用）
const { CONFIGS_DIR } = require('../../../scripts/lib/config-toml.cjs');

const uxToml = parse(readFileSync(resolve(CONFIGS_DIR, 'ux.toml'), 'utf8'));
const appToml = parse(readFileSync(resolve(CONFIGS_DIR, 'app-settings.toml'), 'utf8'));

describe('configs/ux.toml と DEFAULT_UX_SETTINGS の整合', () => {
  it('[covers:app_ux_defaults.ux_matches_toml] 全キー・値が一致する', () => {
    expect(DEFAULT_UX_SETTINGS).toEqual(uxToml);
  });

  it('[covers:app_ux_defaults.ux_keyboard_shortcuts_order] キーボードショートカットの配列順序が維持されている', () => {
    // globalSearchの1つ目が「/」、2つ目がCtrl+Jである順序は機能的に意味を持つ
    expect(DEFAULT_UX_SETTINGS.keyboardShortcuts.globalSearch[0].key).toBe('/');
    expect(DEFAULT_UX_SETTINGS.keyboardShortcuts.globalSearch[1].key).toBe('j');
    expect(DEFAULT_UX_SETTINGS.keyboardShortcuts.globalSearch[1].ctrl).toBe(true);
  });
});

describe('configs/app-settings.toml と DEFAULT_APP_SETTINGS の整合', () => {
  it('[covers:app_ux_defaults.app_matches_toml] uxを除く全キー・値が一致する', () => {
    const { ux, ...rest } = DEFAULT_APP_SETTINGS;
    expect(rest).toEqual(appToml);
    expect(ux).toEqual(DEFAULT_UX_SETTINGS);
  });

  it('[covers:app_ux_defaults.app_toml_has_no_ux] app-settings.toml に ux キーは存在しない（ux.tomlから合成する設計）', () => {
    expect(appToml.ux).toBeUndefined();
  });
});
