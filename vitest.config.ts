import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
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
      'tests/unit/stores/deck-edit.test.ts',
      'ref/**',
      // process.exit()を使用する独自テストランナー
      'tests/unit/composables/useFLIPAnimation.test.ts',
      'tests/unit/utils/array-shuffle.test.ts',
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
