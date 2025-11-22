# テスト戦略ドキュメント

プロジェクトのテスト戦略、設定、パターンについて説明します。

## 概要

本プロジェクトでは Vitest をテストフレームワークとして使用しています。v0.4.0でテスト全体を見直し、370件のテストが全て通過するようになりました。

## テストの種類

### 1. ユニットテスト（tests/unit/）

個別の関数やモジュールをテスト。

**対象:**
- ユーティリティ関数
- パーサー
- マッピング処理
- アニメーション処理

### 2. コンポーネントテスト（tests/unit/components/）

Vue コンポーネントの動作をテスト。

**対象:**
- DeckCard.vue
- CardList.vue
- DeckSection.vue
- CardInfo.vue

### 3. APIテスト（src/api/__tests__/）

API関連の処理をテスト。

**対象:**
- card-search.ts
- deck-operations.ts

### 4. 結合テスト（tests/combine/）

複数モジュールの連携をテスト。現在はVitest除外設定で対応中。

## Vitest 設定

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/combine/**',           // 結合テスト除外
      'tests/unit/stores/deck-edit.test.ts'  // 将来的に変換予定
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 主要な設定

- **environment**: `jsdom` - ブラウザ環境をエミュレート
- **globals**: `true` - describe, it, expect をグローバルに使用可能
- **exclude**: 除外パターン

## テストパターン

### モックの使用

#### axios モック

```typescript
import { vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');

describe('API テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: '<html>...</html>'
    });

    const result = await fetchData();
    expect(result).toBeDefined();
  });
});
```

#### Chrome API モック

```typescript
// グローバルモック設定
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
  },
} as unknown as typeof chrome;
```

### コンポーネントテスト

```typescript
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DeckCard from '@/components/DeckCard.vue';

describe('DeckCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('カード名が表示される', () => {
    const wrapper = mount(DeckCard, {
      props: {
        card: {
          name: 'ブラック・マジシャン',
          // ...
        },
      },
    });

    expect(wrapper.text()).toContain('ブラック・マジシャン');
  });
});
```

### DOM操作テスト

```typescript
describe('DOM操作', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app">
        <button class="test-btn">Click</button>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('ボタンクリックでイベント発火', () => {
    const btn = document.querySelector('.test-btn');
    const handler = vi.fn();
    btn?.addEventListener('click', handler);

    btn?.dispatchEvent(new Event('click'));

    expect(handler).toHaveBeenCalled();
  });
});
```

### 非同期テスト

```typescript
// Promise ベース
it('非同期処理', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

// タイマー使用時
it('アニメーション完了を待つ', async () => {
  vi.useFakeTimers();

  startAnimation();
  vi.advanceTimersByTime(300);

  expect(animationComplete).toBe(true);

  vi.useRealTimers();
});
```

## テストファイルの構成

```
tests/
├── unit/
│   ├── components/
│   │   ├── CardList.test.ts
│   │   ├── DeckCard.test.ts
│   │   ├── DeckSection.test.ts
│   │   └── CardInfo.test.ts
│   ├── utils/
│   │   ├── language-detector.test.ts
│   │   ├── mapping-manager.test.ts
│   │   ├── card-animation.test.ts
│   │   └── category-grouping.test.ts
│   ├── deck-import.test.ts
│   └── stores/
│       └── deck-edit.test.ts (除外中)
├── combine/
│   └── parser/ (除外中)
├── fixtures/
│   └── test-image.png
└── sample/
    └── *.html
```

## テスト実行

### 全テスト実行

```bash
npm test
```

### ウォッチモード

```bash
npm test -- --watch
```

### 特定ファイルのテスト

```bash
npm test -- CardList.test.ts
```

### カバレッジ

```bash
npm test -- --coverage
```

## v0.4.0 での修正内容

### API関連

- **axiosモック実装**: deck-operations.test.ts で8件
- **HTML構造追加**: card-search.test.ts で2件

### UI関連

- **ボタン構造対応**: 1件
- **ソート機能対応**: sortBase 使用に変更
- **スクロール機能対応**: セレクタ変更（.floating-btn）

### PNG関連

- **fs/pathインポート追加**: 4件

### その他

- **Promiseベース変換**: done()コールバックを削除
- **50音グループ対応**: 文字レベル変更

## 今後の課題

### 優先度高

1. **tests/combine/**: Vitest形式への変換
2. **deck-edit.test.ts**: Vitest形式への変換

### 優先度中

1. **E2Eテスト**: Playwright/Puppeteer での自動テスト
2. **カバレッジ向上**: 現在未計測の領域

### 推奨事項

1. **新機能には必ずテストを書く**
2. **既存テストのスキップは避ける**
3. **モックは最小限に**

## トラブルシューティング

### よくある問題

#### 1. モジュール解決エラー

```
Cannot find module '@/...'
```

**解決策**: vitest.config.ts の alias 設定を確認

#### 2. DOM 関連エラー

```
document is not defined
```

**解決策**: environment: 'jsdom' を設定

#### 3. Vue コンポーネントエラー

```
Cannot read properties of undefined
```

**解決策**: Pinia の setActivePinia を beforeEach で呼ぶ

## 関連ドキュメント

- [アーキテクチャ設計](./architecture.md)
- [ストア設計](./stores.md)
- [データモデル](./data-models.md)
