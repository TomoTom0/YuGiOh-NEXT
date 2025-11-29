# テスト戦略

**作成日**: 2025-11-26  
**最終更新**: 2025-11-26  
**バージョン**: 1.0

---

## 📋 目次

1. [概要](#概要)
2. [テスト方針](#テスト方針)
3. [テストの種類](#テストの種類)
4. [カバレッジ目標](#カバレッジ目標)
5. [モック戦略](#モック戦略)
6. [ディレクトリ構造](#ディレクトリ構造)
7. [テスト実行](#テスト実行)
8. [CI/CD統合](#cicd統合)
9. [ベストプラクティス](#ベストプラクティス)

---

## 概要

本ドキュメントは、YGO Deck Helper（遊戯王デッキヘルパー）プロジェクトにおけるテスト戦略を定義します。

### 現状（2025-11-26時点）

- **総テスト数**: 407
- **成功率**: 98.3% (400/407)
- **テストファイル**: 25
- **スキップ**: 7件（意図的）

### 目標

- **短期**: テスト成功率100%維持
- **中期**: カバレッジ80%達成
- **長期**: CI/CD統合とパフォーマンステスト導入

---

## テスト方針

### 基本原則

1. **テスト駆動開発（TDD）を推奨**
   - 新機能開発時は先にテストを書く
   - Red → Green → Refactor のサイクル

2. **テストピラミッド**
   ```
        /\
       /E2E\         少数（ユーザーフロー）
      /------\
     /Integration\    中程度（API、コンポーネント統合）
    /------------\
   /  Unit Tests  \   多数（関数、ユーティリティ）
   ----------------
   ```

3. **品質基準**
   - 新規コードは最低80%のカバレッジ
   - 全テストは2秒以内に完了
   - テストは独立して実行可能

4. **保守性**
   - テストコードも本番コードと同様に保守
   - DRY原則を適用（共通ヘルパー使用）
   - 明確なテスト名（日本語OK）

---

## テストの種類

### 1. ユニットテスト

**対象**: 単一の関数、クラス、モジュール

**配置**:
- `tests/unit/` - 汎用ユニットテスト
- `src/**/__tests__/` - モジュール近接型

**例**:
```typescript
// src/utils/__tests__/image-utils.test.ts
describe('getAttributeIconUrl', () => {
  it('should return correct URL for DARK attribute', () => {
    expect(getAttributeIconUrl('DARK')).toBe(
      'https://www.db.yugioh-card.com/yugiohdb/external/image/parts/attribute/attribute_icon_dark.png'
    );
  });
});
```

**ガイドライン**:
- 外部依存は全てモック
- 高速実行（1テスト < 10ms）
- 境界値テスト必須

### 2. コンポーネントテスト

**対象**: Vueコンポーネント

**配置**: `tests/unit/components/`

**例**:
```typescript
// tests/unit/components/CardInfo.test.ts
import { mount } from '@vue/test-utils';
import CardInfo from '@/components/CardInfo.vue';

describe('CardInfo.vue', () => {
  it('should render card name', () => {
    const wrapper = mount(CardInfo, {
      props: { card: mockCard }
    });
    expect(wrapper.text()).toContain('ブラック・マジシャン');
  });
});
```

**ガイドライン**:
- Vue Test Utils使用
- props、emits、slots全てテスト
- ユーザーインタラクションをシミュレート

### 3. 統合テスト

**対象**: 複数モジュールの連携、APIとパーサーの統合

**配置**: `tests/combine/`

**例**:
```typescript
// tests/combine/flow/full-flow.test.ts
describe('Card Search Flow', () => {
  it('should search and parse card details', async () => {
    const results = await searchCards('ブラック・マジシャン');
    const detail = await getCardDetail(results[0].cid);
    expect(detail.name).toBe('ブラック・マジシャン');
  });
});
```

**ガイドライン**:
- 実際のHTML構造を使用
- ネットワークはモック
- エラーケースも網羅

### 4. E2Eテスト

**対象**: ユーザーの完全なフロー

**配置**: `tests/e2e/`

**例**:
```typescript
// tests/e2e/deck-edit-export-import.test.ts
describe('Deck Export/Import Flow', () => {
  it('should export and import deck via CSV', () => {
    const csv = exportToCSV(deck);
    const result = importFromCSV(csv);
    expect(result.success).toBe(true);
  });
});
```

**ガイドライン**:
- ユーザー視点のシナリオ
- 最小限の数（重要フローのみ）
- データ整合性の確認

---

## カバレッジ目標

### 全体目標

| カテゴリ | 現状 | 短期目標 | 長期目標 |
|---------|------|---------|---------|
| 全体 | ~36% | 50% | 80% |
| API層 | 75% | 90% | 100% |
| Utils | 45% | 70% | 90% |
| Components | 25% | 60% | 80% |
| Stores | 40% | 70% | 90% |

### 優先度

**P0 (必須カバレッジ)**:
- API層: 90%以上
- ユーティリティ関数: 80%以上
- ビジネスロジック: 90%以上

**P1 (推奨カバレッジ)**:
- コンポーネント: 70%以上
- Store: 80%以上
- パーサー: 80%以上

**P2 (低優先度)**:
- UI/スタイリング: 50%以上
- Content Scripts: 60%以上

### カバレッジ測定

```bash
# カバレッジレポート生成
npm run test:coverage

# 閾値チェック
vitest run --coverage --coverage.threshold.lines=80
```

---

## モック戦略

### 基本方針

1. **外部依存は常にモック**
   - fetch/axios
   - chrome API
   - localStorage/sessionStorage
   - DOM操作（必要に応じて）

2. **モックの種類**

**手動モック**: `vi.mock()`
```typescript
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));
```

**スパイ**: `vi.spyOn()`
```typescript
const spy = vi.spyOn(window.localStorage, 'getItem');
expect(spy).toHaveBeenCalledWith('key');
```

**スタブ**: `vi.fn()`
```typescript
const mockFn = vi.fn().mockResolvedValue({ data: 'test' });
```

### モックデータ

**配置**: `tests/fixtures/`

**例**:
```typescript
// tests/fixtures/mock-cards.ts
export const mockBlackMagician = {
  cardId: '4335',
  ciid: '1',
  name: 'ブラック・マジシャン',
  cardType: 'monster',
  // ...
};
```

### よくあるモック

#### 1. fetch API
```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' })
});
```

#### 2. Chrome API
```typescript
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  }
} as any;
```

#### 3. TempCardDB
```typescript
beforeEach(() => {
  const tempCardDB = getTempCardDB();
  tempCardDB.clear();
  tempCardDB.set('12950', mockCard);
});
```

#### 4. URLパラメータ
```typescript
vi.mock('@/utils/url-state', () => ({
  getURLParams: vi.fn().mockReturnValue({ cid: '4335' })
}));
```

---

## ディレクトリ構造

```
ygo-deck-helper/
├── src/
│   ├── api/
│   │   └── __tests__/          # API層のテスト
│   │       ├── card-faq.test.ts
│   │       ├── card-search.test.ts
│   │       ├── deck-operations.test.ts
│   │       └── image-utils.test.ts
│   ├── components/
│   │   └── (テストはtests/unit/components/)
│   ├── stores/
│   │   └── (テストはtests/unit/stores/)
│   └── utils/
│       └── (テストはtests/unit/utils/)
├── tests/
│   ├── combine/               # 統合テスト
│   │   ├── cache/            # キャッシュ関連
│   │   ├── flow/             # フロー統合
│   │   └── parser/           # パーサー統合
│   ├── e2e/                  # E2Eテスト
│   │   └── deck-edit-export-import.test.ts
│   ├── fixtures/             # テストデータ
│   │   ├── mock-cards.ts
│   │   └── sample-deck.ts
│   └── unit/                 # ユニットテスト
│       ├── components/       # コンポーネント
│       ├── stores/          # Store
│       └── utils/           # ユーティリティ
└── vitest.config.ts         # Vitest設定
```

---

## テスト実行

### コマンド

```bash
# 全テスト実行
npm run test:vitest

# ウォッチモード
npm run test:watch

# 特定ファイル
npm run test:vitest src/api/__tests__/card-faq.test.ts

# カバレッジ
npm run test:coverage

# UIモード
npm run test:ui
```

### Vitest設定

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.ts'
      ]
    }
  }
});
```

### テスト実行環境

- **ランタイム**: Node.js + Vitest
- **DOM環境**: happy-dom（軽量・高速）
- **ブラウザ**: 不要（モック使用）

---

## CI/CD統合

### GitHub Actions（計画）

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, dev ]
  pull_request:
    branches: [ main, dev ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:vitest
      - run: npm run test:coverage
      
      # カバレッジレポートをアップロード
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### Pre-commit Hook（計画）

```bash
# .husky/pre-commit
#!/bin/sh
npm run test:vitest --run --changed
```

### カバレッジバッジ（計画）

```markdown
[![Coverage](https://codecov.io/gh/user/ygo-deck-helper/branch/main/graph/badge.svg)](https://codecov.io/gh/user/ygo-deck-helper)
```

---

## ベストプラクティス

### 1. テスト命名

**良い例**:
```typescript
describe('getAttributeIconUrl', () => {
  it('should return correct URL for DARK attribute', () => {
    // ...
  });
  
  it('should return empty string for empty attribute', () => {
    // ...
  });
});
```

**悪い例**:
```typescript
describe('test', () => {
  it('works', () => {
    // 何をテストしているか不明
  });
});
```

### 2. AAA パターン

```typescript
it('should add card to deck', () => {
  // Arrange (準備)
  const deck = createEmptyDeck();
  const card = mockCard;
  
  // Act (実行)
  const result = addCardToDeck(deck, card);
  
  // Assert (検証)
  expect(result.mainDeck).toHaveLength(1);
  expect(result.mainDeck[0].cid).toBe(card.cid);
});
```

### 3. DRY原則

**ヘルパー関数を作成**:
```typescript
// tests/helpers/deck-helpers.ts
export function createMockDeck(cards: CardRef[]): DeckInfo {
  return {
    dno: 1,
    name: 'Test Deck',
    mainDeck: cards,
    extraDeck: [],
    sideDeck: [],
    category: [],
    tags: [],
    comment: '',
    deckCode: ''
  };
}
```

### 4. テストの独立性

**良い例**:
```typescript
beforeEach(() => {
  // 各テストで独立した状態を作成
  tempCardDB.clear();
});

it('test 1', () => {
  tempCardDB.set('1', card1);
  // ...
});

it('test 2', () => {
  tempCardDB.set('2', card2);
  // ...（test 1の影響を受けない）
});
```

### 5. 非同期テストのタイムアウト

```typescript
it('should fetch data', async () => {
  // タイムアウトを明示
  const result = await fetchWithTimeout(url, { timeout: 1000 });
  expect(result).toBeDefined();
}, 2000); // テスト全体のタイムアウト: 2秒
```

### 6. スナップショットテスト（慎重に）

```typescript
// 大きなオブジェクトの構造確認に有用
it('should match deck structure', () => {
  const deck = createDeck();
  expect(deck).toMatchSnapshot();
});
```

**注意**: スナップショットは頻繁に変更されるものには不向き

### 7. エラーケースのテスト

```typescript
describe('error handling', () => {
  it('should throw error for invalid card ID', () => {
    expect(() => getCard('invalid')).toThrow('Invalid card ID');
  });
  
  it('should return null for network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network'));
    const result = await fetchCard('123');
    expect(result).toBeNull();
  });
});
```

---

## 付録

### A. トラブルシューティング

**Q: テストが遅い**
- A: モックを使用、非同期処理を最小化、並列実行を有効化

**Q: happy-domで動作しない機能**
- A: スクロールイベント、一部のDOM API → skipまたはjsdom使用

**Q: テストが不安定（フラキー）**
- A: 非同期処理の完了を待つ、タイムアウトを適切に設定

### B. 参考資料

- [Vitest公式ドキュメント](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Library](https://testing-library.com/)
- プロジェクト内: `docs/dev/testing.md`

### C. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-11-26 | 1.0 | 初版作成 |

---

**最終更新**: 2025-11-26  
**レビュー担当**: テックリード  
**次回レビュー予定**: 2026-01-26
