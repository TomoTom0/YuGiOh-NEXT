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
      // Vitest形式ではないテストファイル（describe/itを使用していない）
      'tests/combine/**',
      'tests/unit/stores/deck-edit.test.ts',
      'ref/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
