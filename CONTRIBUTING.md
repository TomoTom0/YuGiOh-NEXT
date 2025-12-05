# コントリビューションガイド

YGO Deck Helper（遊戯王デッキヘルパー）へのコントリビューションをお考えいただき、ありがとうございます！

## 📋 目次

- [開発環境のセットアップ](#開発環境のセットアップ)
- [開発フロー](#開発フロー)
- [コーディング規約](#コーディング規約)
- [テスト](#テスト)
- [プルリクエスト](#プルリクエスト)
- [コミットメッセージ](#コミットメッセージ)
- [Issue報告](#issue報告)

## 開発環境のセットアップ

### 必要な環境

- Node.js 18以上
- Bun 1.0以上
- Git

### セットアップ手順

```bash
# リポジトリをクローン
git clone https://github.com/TomoTom0/YuGiOh-NEXT.git
cd YuGiOh-NEXT

# 依存関係をインストール
bun install

# ビルド
bun run build

# テスト実行
bun run test:vitest
```

### 開発モード

```bash
# ウォッチモードでビルド
bun run dev

# テストをウォッチモード実行
bun vitest
```

### ブラウザへの読み込み

**Chrome/Edge**:
1. `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」
4. `dist/` フォルダを選択

**Firefox**:
1. `about:debugging#/runtime/this-firefox` を開く
2. 「一時的なアドオンを読み込む」
3. `dist/manifest.json` を選択

## 開発フロー

### ブランチ戦略

```
main      - 本番リリース版（安定版）
  └─ dev  - 開発版（次リリース候補）
      └─ feature/xxx  - 機能開発
      └─ fix/xxx      - バグ修正
      └─ test/xxx     - テスト追加
```

### 新機能開発の流れ

1. **Issue作成** - 実装したい機能について議論
2. **ブランチ作成** - `dev`から分岐
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```
3. **実装** - コードを書く
4. **テスト** - テストを追加・実行
5. **コミット** - 意味のある単位でコミット
6. **プッシュ** - リモートにプッシュ
7. **PR作成** - `dev`ブランチへのPR

### バグ修正の流れ

1. **Issue確認** - バグレポートを確認
2. **ブランチ作成** - `dev`から分岐
   ```bash
   git checkout -b fix/bug-description
   ```
3. **修正** - バグを修正
4. **テスト** - 修正を検証するテストを追加
5. **PR作成** - `dev`ブランチへのPR

## コーディング規約

### TypeScript

- **型定義**: `any`の使用は最小限に
- **strictモード**: 有効
- **命名規則**:
  - 変数/関数: `camelCase`
  - 型/インターフェース: `PascalCase`
  - 定数: `UPPER_SNAKE_CASE`
  - ファイル: `kebab-case.ts`

```typescript
// Good
interface CardInfo {
  cardId: string;
  name: string;
}

function getCardDetail(cid: string): Promise<CardInfo | null> {
  // ...
}

const MAX_RETRIES = 3;

// Bad
interface cardinfo { /* ... */ }  // PascalCaseを使用
function GetCardDetail() { /* ... */ }  // camelCaseを使用
const maxRetries = 3;  // 定数はUPPER_SNAKE_CASE
```

### Vue

- **Composition API** 推奨
- **`<script setup>`** 使用
- **Props/Emits**: 型定義必須

```vue
<script setup lang="ts">
import { ref } from 'vue';

// Props定義
interface Props {
  cardId: string;
  quantity?: number;
}

const props = withDefaults(defineProps<Props>(), {
  quantity: 1
});

// Emits定義
const emit = defineEmits<{
  'update:quantity': [value: number];
  'remove': [];
}>();

// ロジック
const count = ref(props.quantity);

function increment() {
  count.value++;
  emit('update:quantity', count.value);
}
</script>

<template>
  <div>
    <span>{{ count }}</span>
    <button @click="increment">+</button>
  </div>
</template>
```

### CSS/SCSS

- **BEM記法** または **コンポーネントスコープ**
- **`scoped`** 使用

```vue
<style scoped>
.card-info {
  padding: 8px;
}

.card-info__title {
  font-weight: bold;
}

.card-info__title--highlighted {
  color: red;
}
</style>
```

### ファイル構成

```
src/
├── api/              # API通信
├── components/       # Vueコンポーネント
├── content/          # Content Scripts
│   ├── index.ts
│   └── parser/      # HTMLパーサー
├── stores/          # Pinia Store
├── types/           # TypeScript型定義
└── utils/           # ユーティリティ関数
```

## テスト

### テストの書き方

**必須**:
- 新機能には必ずテストを追加
- バグ修正には再現テストを追加
- 既存テストを壊さない

**テストファイルの配置**:
```
src/api/card-faq.ts
  └─ src/api/__tests__/card-faq.test.ts

src/components/CardInfo.vue
  └─ tests/unit/components/CardInfo.test.ts
```

**テストの種類**:

```typescript
// ユニットテスト
describe('getAttributeIconUrl', () => {
  it('should return correct URL for DARK', () => {
    expect(getAttributeIconUrl('DARK')).toBe(
      'https://www.db.yugioh-card.com/yugiohdb/external/image/parts/attribute/attribute_icon_dark.png'
    );
  });
});

// コンポーネントテスト
describe('CardInfo.vue', () => {
  it('should render card name', () => {
    const wrapper = mount(CardInfo, {
      props: { card: mockCard }
    });
    expect(wrapper.text()).toContain('ブラック・マジシャン');
  });
});
```

### テスト実行

```bash
# 全テスト実行
npm run test:vitest

# ウォッチモード
npm run test:watch

# カバレッジ
npm run test:coverage
```

### カバレッジ目標

- 新規コード: **80%以上**
- API層: **90%以上**
- ユーティリティ: **80%以上**

詳細は [`docs/dev/testing-strategy.md`](docs/dev/testing-strategy.md) を参照。

## プルリクエスト

### PR作成前チェックリスト

- [ ] コードが正しく動作する
- [ ] テストが全て通過する（`bun run test:vitest`）
- [ ] ビルドが成功する（`bun run build`）
- [ ] 新機能にテストを追加した
- [ ] ドキュメントを更新した（必要に応じて）
- [ ] コミットメッセージが規約に従っている

### PRテンプレート

```markdown
## 概要
<!-- 変更内容を簡潔に説明 -->

## 変更の種類
- [ ] 新機能
- [ ] バグ修正
- [ ] リファクタリング
- [ ] ドキュメント
- [ ] テスト

## 関連Issue
<!-- Closes #123 -->

## テスト方法
<!-- 動作確認手順を記載 -->

1. 
2. 
3. 

## スクリーンショット
<!-- UI変更がある場合 -->

## チェックリスト
- [ ] テスト追加済み
- [ ] ドキュメント更新済み
- [ ] 全テスト通過
- [ ] ビルド成功
```

### レビュープロセス

1. **自動チェック** - テスト、ビルド（将来実装）
2. **コードレビュー** - 最低1名の承認
3. **動作確認** - 実際の拡張機能で確認
4. **マージ** - `dev`ブランチへマージ

## コミットメッセージ

### フォーマット

```
<type>: <subject>

<body>

<footer>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `test`: テスト追加・修正
- `refactor`: リファクタリング
- `docs`: ドキュメント
- `style`: コードフォーマット
- `chore`: ビルド、設定など

### 例

```
feat: add FAQ search functionality

- Add getCardFAQList() API function
- Add FAQ list parser
- Add FAQ detail page parser

Closes #45
```

```
fix: resolve deck export encoding issue

Japanese characters were not properly encoded in CSV export.
Fixed by using UTF-8 BOM.

Fixes #78
```

```
test: add image-utils test coverage

- Add 27 unit tests for image utility functions
- Achieve 100% coverage for image-utils.ts

Related to #89
```

### コミット粒度

- **1コミット = 1つの論理的変更**
- 大きな機能は複数コミットに分割
- コミット単位でレビュー可能に

## Issue報告

### バグレポート

```markdown
## 環境
- ブラウザ: Chrome 120.0
- OS: Windows 11
- 拡張機能バージョン: 0.4.2

## 再現手順
1. デッキ編集ページを開く
2. カードを追加する
3. エクスポートボタンをクリック

## 期待される動作
CSVファイルがダウンロードされる

## 実際の動作
エラーメッセージが表示される

## スクリーンショット
（あれば添付）

## 追加情報
エラーメッセージ: "Failed to export deck"
```

### 機能リクエスト

```markdown
## 概要
デッキのPNG画像エクスポート機能

## 背景・動機
SNSでデッキを共有しやすくしたい

## 提案する解決策
1. デッキリストを画像化
2. デッキ情報をメタデータとして埋め込み
3. PNGファイルとしてダウンロード

## 代替案
- テキスト形式でのエクスポート（既存）
- JSON形式でのエクスポート

## 追加コンテキスト
（あれば追加情報）
```

## よくある質問

### Q: どこから始めればいい？

A: [`tasks/testing-and-documentation.md`](tasks/testing-and-documentation.md) の未完了タスクから選ぶか、[Good First Issue](https://github.com/TomoTom0/YuGiOh-NEXT/labels/good%20first%20issue) ラベルのIssueを探してください。

### Q: テストの書き方がわからない

A: [`docs/dev/testing-strategy.md`](docs/dev/testing-strategy.md) を参照してください。既存のテストファイルも参考になります。

### Q: APIの使い方がわからない

A: [`docs/api/`](docs/api/) ディレクトリのドキュメントを参照してください。

### Q: デバッグ方法は？

A: ブラウザの開発者ツールでコンソールログを確認できます。`console.log()` を使用してデバッグできます。

## 行動規範

- 敬意を持って他の人と接する
- 建設的なフィードバックを提供する
- オープンで協力的な態度を保つ
- プロジェクトの目標を尊重する

## 連絡先

- Issue: [GitHub Issues](https://github.com/TomoTom0/YuGiOh-NEXT/issues)
- Discussion: [GitHub Discussions](https://github.com/TomoTom0/YuGiOh-NEXT/discussions)

---

**ありがとうございます！** あなたのコントリビューションがこのプロジェクトをより良くします。
