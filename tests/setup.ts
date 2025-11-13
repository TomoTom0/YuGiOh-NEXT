import { config } from '@vue/test-utils';
import { createPinia } from 'pinia';

// Piniaのモック設定
config.global.plugins = [createPinia()];

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
