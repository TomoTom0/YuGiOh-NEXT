/**
 * configs/features.toml のパース・解決（scripts/lib/feature-defaults.cjs）のテスト
 *
 * feature flag のデフォルト値は configs/features.toml が Single Source of Truth。
 * ここを崩すと webpack/vitest のビルド時注入（__FEATURE_DEFAULTS__）が
 * 黙って欠損するため、仕様からの逸脱は全てエラーとして検出する。
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FEATURE_IDS, DEFAULT_FEATURE_SETTINGS } from '@/types/settings';

const require = createRequire(import.meta.url);
// CommonJS実装（webpack.config.cjs / vitest.config.ts と共用）を読み込み
const {
  parseFeaturesToml,
  resolveFeatureDefaults,
  FEATURES_TOML_PATH,
} = require('../../../scripts/lib/feature-defaults.cjs');

const featuresTomlSource = readFileSync(resolve(__dirname, '../../../configs/features.toml'), 'utf8');

describe('parseFeaturesToml', () => {
  it('[covers:feature_defaults.parse_real_toml] 実ファイルをセクションごとにパースできる', () => {
    const parsed = parseFeaturesToml(featuresTomlSource);

    // FeatureId の全キーが過不足なく定義されている
    expect(Object.keys(parsed).sort()).toEqual([...FEATURE_IDS].sort());
  });

  it('[covers:feature_defaults.default_value_shape] 各機能の default は true / false / "dev-only" のいずれか', () => {
    const parsed = parseFeaturesToml(featuresTomlSource);

    for (const id of FEATURE_IDS) {
      expect(['true', 'false', 'dev-only']).toContain(String(parsed[id].default));
    }
  });

  it('[covers:feature_defaults.rejects_invalid_value] 不正な default 値は throw する', () => {
    expect(() => parseFeaturesToml('[sample]\ndefault = 1\n')).toThrow();
    expect(() => parseFeaturesToml('[sample]\ndefault = "always"\n')).toThrow();
  });

  it('[covers:feature_defaults.rejects_unknown_key] default 以外のキーは throw する', () => {
    expect(() => parseFeaturesToml('[sample]\ndefault = true\nnote = "x"\n')).toThrow();
  });

  it('[covers:feature_defaults.rejects_duplicate_section] 重複セクションは throw する', () => {
    expect(() => parseFeaturesToml('[sample]\ndefault = true\n\n[sample]\ndefault = false\n')).toThrow();
  });

  it('[covers:feature_defaults.rejects_top_level_key] セクション外のキーは throw する', () => {
    expect(() => parseFeaturesToml('default = true\n')).toThrow();
  });

  it('[covers:feature_defaults.rejects_missing_default] default の無いセクションは throw する', () => {
    expect(() => parseFeaturesToml('[sample]\n')).toThrow();
  });
});

describe('resolveFeatureDefaults', () => {
  it('[covers:feature_defaults.resolve_dev] 開発ビルド相当(isDev=true)では "dev-only" が true に解決される', () => {
    const resolved = resolveFeatureDefaults(true, featuresTomlSource);
    const parsed = parseFeaturesToml(featuresTomlSource);

    for (const id of FEATURE_IDS) {
      const expected = parsed[id].default === 'dev-only' ? true : parsed[id].default;
      expect(resolved[id]).toBe(expected);
    }
  });

  it('[covers:feature_defaults.resolve_prod] 本番ビルド相当(isDev=false)では "dev-only" が false に解決される', () => {
    const resolved = resolveFeatureDefaults(false, featuresTomlSource);
    const parsed = parseFeaturesToml(featuresTomlSource);

    for (const id of FEATURE_IDS) {
      const expected = parsed[id].default === 'dev-only' ? false : parsed[id].default;
      expect(resolved[id]).toBe(expected);
    }
  });
});

describe('DEFAULT_FEATURE_SETTINGS との整合（ビルド時注入の検証）', () => {
  it('[covers:feature_defaults.matches_default_feature_settings] DEFAULT_FEATURE_SETTINGS は開発ビルド相当の解決結果と一致する', () => {
    // vitest では __FEATURE_DEFAULTS__ は isDev=true で注入される
    const resolved = resolveFeatureDefaults(true, featuresTomlSource);

    for (const id of FEATURE_IDS) {
      expect(DEFAULT_FEATURE_SETTINGS[id]).toBe(resolved[id]);
    }
  });
});

describe('FEATURES_TOML_PATH', () => {
  it('[covers:feature_defaults.path_points_configs] configs/features.toml を指している', () => {
    expect(FEATURES_TOML_PATH.endsWith('configs/features.toml')).toBe(true);
  });
});
