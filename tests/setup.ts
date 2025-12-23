import { config } from '@vue/test-utils';
import { createPinia } from 'pinia';

// Piniaのモック設定
config.global.plugins = [createPinia()];

// console.temp() エイリアスを定義（一時的なデバッグ用）
if (!console.temp) {
  console.temp = console.debug.bind(console);
}

// グローバルモック
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
} as any;
