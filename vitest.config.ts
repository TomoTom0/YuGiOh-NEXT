import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    deps: {
      inline: ['node:url', 'node:fs', 'node:path'],
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '.npm-cache/**',
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
