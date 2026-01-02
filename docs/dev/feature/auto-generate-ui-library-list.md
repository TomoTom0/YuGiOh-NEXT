# GeneralTab.vue のライブラリリスト自動生成

## 現状

GeneralTab.vue の Third Party Libraries セクションで、使用しているライブラリのリストがハードコードされている。

## 問題点

- package.json が更新された際に、UIのリストが古くなる可能性がある
- 手動での同期が必要

## 改善案

### ビルド時に package.json から自動生成

Vite の define 機能または環境変数を使用して、ビルド時に依存関係の情報を注入する。

```typescript
// vite.config.ts
import pkg from './package.json';

export default defineConfig({
  define: {
    __DEPENDENCIES__: JSON.stringify(Object.keys(pkg.dependencies))
  }
});
```

### コンポーネント側での使用

```typescript
// GeneralTab.vue
const libraries = __DEPENDENCIES__ as string[];
```

## 優先度

low

## 注意点

- 全ての依存関係をUI上に表示する必要があるかは検討が必要
- 主要なライブラリのみを表示するのであれば、手動管理でも問題ない可能性

## 関連

- PR: #96
- Thread ID: PRRT_kwDOQKOd3M5nyjnP
- タスク: TASK-12
- 関連ファイル: src/options/components/tabs/GeneralTab.vue
