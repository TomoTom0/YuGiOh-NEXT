# GeneralTab.vue のライブラリリスト自動生成

## ステータス: 完了

実装済み: TASK-14

## 実装内容

`scripts/generate-licenses.ts` が生成する `src/generated/third-party-libraries.json` を GeneralTab.vue でインポートして使用。

### 使用方法

```bash
# ライセンス情報を再生成
bun run license:generate
```

### 実装詳細

```typescript
// GeneralTab.vue
import generatedLibraries from '@/generated/third-party-libraries.json';

// Vue.jsはdevDependenciesのため自動生成に含まれないが、runtime必須なので手動追加
const thirdPartyLibraries = [
  { name: 'Vue.js', license: 'MIT', copyright: '(c) 2013-present, Yuxi (Evan) You' },
  ...generatedLibraries
];
```

## 注意点

- Vue.js は devDependencies に含まれるため、自動生成リストには含まれない
- GeneralTab.vue で手動でVue.jsを先頭に追加している

## 関連

- PR: #96
- Thread ID: PRRT_kwDOQKOd3M5nyjnP
- タスク: TASK-12, TASK-14
- 関連ファイル: src/options/components/tabs/GeneralTab.vue, src/generated/third-party-libraries.json
