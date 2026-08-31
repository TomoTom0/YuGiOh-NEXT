import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// feature flag のデフォルト値は configs/features.toml が Single Source of Truth。
// vitest 実行環境では import.meta.env.DEV が true 固定のため isDev=true で解決して注入する
// （webpack.config.cjs の DefinePlugin と同じ値の供給元）。
const { resolveFeatureDefaults } = require('./scripts/lib/feature-defaults.cjs');
const { loadConfigToml } = require('./scripts/lib/config-toml.cjs');

export default defineConfig({
  plugins: [vue()],
  define: {
    __FEATURE_DEFAULTS__: JSON.stringify(resolveFeatureDefaults(true)),
    __APP_SETTINGS_DEFAULTS__: JSON.stringify(loadConfigToml('app-settings.toml')),
    __UX_SETTINGS_DEFAULTS__: JSON.stringify(loadConfigToml('ux.toml')),
  },
  test: {
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        settings: {
          disableJavaScriptEvaluation: false,
          disableJavaScriptFileLoading: true,
          disableCSSFileLoading: true,
          disableIframePageLoading: true,
          disableComputedStyleRendering: true,
        },
      },
    },
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    server: {
      deps: {
        inline: ['node:url', 'node:fs', 'node:path'],
      },
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '.npm-cache/**',
      'tmp/**',
      'tests/unit/stores/deck-edit.test.ts',
      'ref/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.d.ts',
        'src/shims-vue.d.ts',
        'src/**/__tests__/**',
      ],
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
