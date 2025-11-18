# CLAUDE.md・LLM向けコンテキストドキュメント改善依頼書

**作成日時**: 2025-11-18  
**対象**: `CLAUDE.md` および `.claude/` ディレクトリ  
**レビュー目的**: LLMに読み込ませるコンテキスト情報の最適化  
**レポート出力先**: `docs/internal-reviews/reports/llm-context-improvement.md`

## 背景

ClaudeやChatGPTなどのLLMをコーディング支援に活用する際、プロジェクト固有の情報を`CLAUDE.md`や`.claude/`配下に配置して常に読み込ませることで、より適切な支援を受けられます。

しかし、現在のコンテキスト情報には以下の課題があります：
1. 過去のgit履歴から見える非効率的な作業パターンが反映されていない
2. よくある間違いやつまずきポイントが記録されていない
3. プロジェクト固有の制約やベストプラクティスが十分に明文化されていない

## レビュー依頼項目

### 1. Git履歴からの非効率パターン抽出

#### 1-1. コミット履歴の分析

**確認観点**:
- [ ] 頻繁に修正されるファイル
  - 同一ファイルへの繰り返し修正（設計ミス・理解不足の可能性）
  - 修正→revert→再修正のパターン
  
- [ ] 同一バグの再発
  - 似たようなバグ修正コミットの検出
  - 根本原因が解決されていない可能性
  
- [ ] 大規模なリファクタリング
  - 後から設計変更が必要になったケース
  - 最初から適切に設計できなかった理由

**分析方法**:
```bash
# 変更頻度の高いファイル
git log --format=format: --name-only | egrep -v '^$' | sort | uniq -c | sort -rg | head -20

# 特定ファイルの変更履歴
git log --oneline --follow -- <file>

# 特定パターンのコミット検索
git log --all --oneline --grep="fix"
git log --all --oneline --grep="revert"
git log --all --oneline --grep="refactor"
```

**期待する成果物**:
```markdown
# Git履歴分析結果

## 頻繁に修正されるファイル TOP10

1. `src/stores/deck-edit.ts` (45回修正)
   - 理由: 初期設計が不十分、状態管理の複雑化
   - 教訓: Store設計時は状態の正規化を最初から考慮すべき

2. `src/components/DeckSection.vue` (32回修正)
   - 理由: D&D機能の段階的実装、UIの試行錯誤
   - 教訓: プロトタイプで動作確認後に実装すべき

## 繰り返されたバグパターン

### UUID関連のバグ (3回発生)
- コミット: a1b2c3d, d4e5f6g, h7i8j9k
- 原因: 同一cid/ciidのカードをUUIDなしで管理
- 教訓: 同一性が必要なオブジェクトは常に一意なIDを付与

### ciid抽出の不具合 (5回発生)
- 原因: DOM構造への依存、正規表現の不備
- 教訓: DOM解析は公式DB構造の変更に脆弱、適切なテストを追加

## 大規模リファクタリング

### Store分割 (PR #10)
- 理由: deck-edit.tsが肥大化、設定管理を分離
- 教訓: 最初から責務を明確に分割すべき
```

#### 1-2. PRレビューコメントの分析

**確認観点**:
- [ ] 頻繁に指摘される問題
  - コードスタイル
  - 命名規則
  - エラーハンドリング不足
  - テスト不足
  
- [ ] 見落としがちな問題
  - パフォーマンス
  - アクセシビリティ
  - セキュリティ

**分析方法**:
```bash
# PRレビューコメント取得（GitHub API使用）
gh api repos/TomoTom0/YuGiOh-NEXT/pulls?state=all | \
  jq -r '.[] | .number' | \
  xargs -I {} gh pr view {} --json comments,reviews
```

**期待する成果物**:
```markdown
# PRレビュー頻出指摘事項

## 高頻度指摘（5回以上）

### 1. デバッグログの削除忘れ
- 指摘回数: 8回
- 例: `console.log()` の削除忘れ
- 対策: ESLint警告 or pre-commit hook

### 2. エラーハンドリング不足
- 指摘回数: 6回
- 例: try-catchがない、エラー時のUI反応なし
- 対策: エラーハンドリングチェックリスト作成

### 3. 型定義の不備
- 指摘回数: 5回
- 例: `any`型の多用、型ガードの欠如
- 対策: 型定義ガイドライン整備
```

#### 1-3. イシュー分析

**確認観点**:
- [ ] 頻出するバグカテゴリ
- [ ] ユーザーからの指摘が多い問題
- [ ] 技術的負債の蓄積パターン

**期待する成果物**:
```markdown
# イシュー分析結果

## バグカテゴリ別集計

1. UI/UX (12件)
   - ドラッグ&ドロップの挙動
   - レイアウト崩れ
   
2. データ整合性 (8件)
   - カード重複
   - 枚数制限超過
   
3. ブラウザ互換性 (5件)
   - Firefox対応
   - Safari対応

## 技術的負債

- テストカバレッジ不足（指摘3回）
- ドキュメント不足（指摘4回）
- パフォーマンス問題（指摘2回）
```

### 2. よくある間違いの文書化

#### 2-1. コーディング時の典型的ミス

**抽出すべき項目**:
- [ ] Vueコンポーネントでのよくある間違い
  - reactive/refの使い分け
  - watchの不適切な使用
  - computed内での副作用
  
- [ ] TypeScript関連
  - 型アサーションの乱用
  - null/undefinedチェック漏れ
  
- [ ] 非同期処理
  - Promise/async-awaitの誤用
  - race conditionの見落とし

**期待する成果物**:
```markdown
# よくある間違い集

## Vueコンポーネント

### ❌ 間違い: computed内での副作用
\`\`\`typescript
const filteredCards = computed(() => {
  store.updateCount(cards.value.length); // 副作用
  return cards.value.filter(...);
});
\`\`\`

### ✅ 正しい: watchで副作用を分離
\`\`\`typescript
const filteredCards = computed(() => cards.value.filter(...));

watch(filteredCards, (cards) => {
  store.updateCount(cards.length);
});
\`\`\`

### 理由
computedは純粋関数であるべき。副作用はwatchで行う。

---

## TypeScript

### ❌ 間違い: 型アサーションの乱用
\`\`\`typescript
const card = data as Card; // 実際の型チェックなし
\`\`\`

### ✅ 正しい: 型ガードで検証
\`\`\`typescript
function isCard(data: unknown): data is Card {
  return typeof data === 'object' && data !== null && 'cid' in data;
}

if (isCard(data)) {
  const card = data; // 安全
}
\`\`\`

### 理由
型アサーションは実行時検証を行わない。型ガードで安全性を確保。
```

#### 2-2. ドメイン固有のつまずきポイント

**抽出すべき項目**:
- [ ] 遊戯王カードDB特有の問題
  - OCG/Rush Duelの違い
  - ciid（カードイラストID）の扱い
  - 制限カードの判定ロジック
  
- [ ] ブラウザ拡張機能特有の問題
  - Content ScriptとBackground Scriptの通信
  - DOMへの介入タイミング
  - manifest v3の制約

**期待する成果物**:
```markdown
# プロジェクト固有のつまずきポイント

## 遊戯王カードDB

### ciid（カードイラストID）の扱い
**問題**: 同一カードに複数のイラストが存在する

**よくある間違い**: cidのみで一意性を判断
\`\`\`typescript
const uniqueCards = [...new Set(cards.map(c => c.cid))]; // ❌ イラスト違いが失われる
\`\`\`

**正しい方法**: cid + ciid または UUID で判断
\`\`\`typescript
const uniqueCards = [...new Set(cards.map(c => \`\${c.cid}-\${c.ciid}\`))];
\`\`\`

---

## ブラウザ拡張機能

### Content Scriptの実行タイミング
**問題**: ページ読み込み完了前にDOMにアクセス

**よくある間違い**:
\`\`\`typescript
const element = document.querySelector('.deck-list'); // null の可能性
\`\`\`

**正しい方法**: DOMContentLoaded または特定要素の出現を待つ
\`\`\`typescript
await waitForElement('.deck-list');
const element = document.querySelector('.deck-list'); // 安全
\`\`\`
```

### 3. プロジェクト固有の制約・ベストプラクティス

#### 3-1. アーキテクチャ制約

**文書化すべき内容**:
- [ ] Storeの責務分担
  - deck-edit: デッキ編集状態
  - settings: アプリ設定
  - 今後追加する場合の判断基準
  
- [ ] コンポーネント階層
  - どこまで細分化するか
  - Props/Emitsの設計方針
  
- [ ] ユーティリティ関数の配置
  - utils/ の分類基準
  - どこまで共通化するか

**期待する成果物**:
```markdown
# アーキテクチャ制約

## Store設計

### Store分割の判断基準
1. **明確に異なる責務**: 設定管理とデータ管理は分離
2. **独立した永続化**: localStorage/sessionStorageが異なる
3. **500行超**: 1ファイルが500行を超えたら分割を検討

### 悪い例: 全てを1つのStoreに
\`\`\`typescript
// ❌ deck-editに設定まで詰め込む
export const useDeckEditStore = defineStore('deck-edit', {
  state: () => ({
    deck: {...},
    theme: 'light', // 設定はsettingsStoreへ
    language: 'ja',  // 設定はsettingsStoreへ
  })
});
\`\`\`

### 良い例: 責務で分離
\`\`\`typescript
// ✅ デッキ編集状態のみ
export const useDeckEditStore = defineStore('deck-edit', {
  state: () => ({ deck: {...} })
});

// ✅ 設定は別Store
export const useSettingsStore = defineStore('settings', {
  state: () => ({ theme: 'light', language: 'ja' })
});
\`\`\`

---

## ユーティリティ関数

### 配置基準
- `utils/page-detector.ts`: ページ判定ロジック（URLベース）
- `utils/url-builder.ts`: URL生成ロジック
- `utils/url-state.ts`: URL状態管理
- `utils/deck-*.ts`: デッキ操作関連（export/import等）
- `utils/png-metadata.ts`: PNG特化処理

### 分類基準
1. **ドメインロジック**: 遊戯王カードに特化 → `utils/card-*.ts`
2. **汎用ロジック**: プロジェクト固有だが汎用的 → `utils/common.ts`
3. **外部依存**: 特定ライブラリに依存 → `utils/integrations/`
```

#### 3-2. コーディング規約の明文化

**文書化すべき内容**:
- [ ] 命名規則
  - コンポーネント名（PascalCase）
  - 関数名（camelCase）
  - 定数（UPPER_SNAKE_CASE）
  
- [ ] ファイル構成
  - importの順序
  - エクスポートの方法
  
- [ ] コメント・JSDoc
  - どこまで書くか
  - 必須の箇所

**期待する成果物**:
```markdown
# コーディング規約

## 命名規則

### コンポーネント
- ファイル名: PascalCase (`DeckSection.vue`)
- コンポーネント名: PascalCase (`<DeckSection>`)
- 複合語は明確に (`DeckEditLayout` not `DeckEditing`)

### 関数・変数
- 関数: camelCase、動詞始まり (`fetchCards`, `updateDeck`)
- 変数: camelCase、名詞 (`cardList`, `deckMetadata`)
- Boolean: `is/has/should` 始まり (`isVisible`, `hasError`)
- イベントハンドラ: `handle` 始まり (`handleClick`, `handleDragStart`)

### 定数
- UPPER_SNAKE_CASE (`MAX_CARD_COUNT`, `DEFAULT_THEME`)
- enum: PascalCase (`CardGameType`, `ExportFormat`)

---

## Import順序

\`\`\`typescript
// 1. 外部ライブラリ
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

// 2. 内部モジュール（絶対パス）
import { useSettingsStore } from '@/stores/settings';
import { Card } from '@/types/card';

// 3. 相対パス
import DeckCard from './DeckCard.vue';

// 4. CSS
import './styles.css';
\`\`\`

---

## JSDoc記述基準

### 必須
- Public API（他ファイルからimportされる関数）
- 複雑なロジック（10行以上の関数）
- 型だけでは意図が分からない関数

### 省略可
- 単純なgetter/setter
- 型定義で自明な関数

### 例
\`\`\`typescript
/**
 * デッキをYDK形式でエクスポート
 * @param deck - エクスポート対象のデッキ
 * @returns YDK形式の文字列
 * @throws {Error} デッキが空の場合
 */
export function exportToYdk(deck: Deck): string {
  // ...
}
\`\`\`
```

### 4. LLMコンテキストドキュメントの構成

#### 4-1. CLAUDE.md の構造提案

**提案内容**:
```markdown
# プロジェクト概要
- 目的、技術スタック

# 開発環境
- Node.js, npm, ビルド方法

# アーキテクチャ
- ディレクトリ構造
- Store設計方針
- コンポーネント階層

# コーディング規約
- 命名規則
- ファイル構成
- エラーハンドリング

# よくある間違い
- Vueコンポーネント
- TypeScript
- 非同期処理

# プロジェクト固有の知識
- 遊戯王カードDB特有の事項
- ブラウザ拡張機能の制約

# ベストプラクティス
- テスト作成指針
- パフォーマンス最適化
- セキュリティ

# 禁止事項・注意事項
- してはいけないこと
- 慎重に扱うべきこと

# 参考リンク
- 外部ドキュメント
- 関連リソース
```

#### 4-2. .claude/ ディレクトリの活用

**提案構成**:
```
.claude/
├── architecture.md      # アーキテクチャ詳細
├── common-mistakes.md   # よくある間違い詳細版
├── domain-knowledge.md  # 遊戯王カードDB知識
├── coding-standards.md  # コーディング規約詳細
├── git-lessons.md       # Git履歴から得た教訓
└── examples/            # コード例集
    ├── store-design.md
    ├── component-design.md
    └── error-handling.md
```

### 5. 継続的な更新戦略

#### 5-1. ドキュメント更新のトリガー

**更新すべきタイミング**:
- [ ] 新しいパターンのバグが発生した時
- [ ] 同じ間違いが2回以上発生した時
- [ ] アーキテクチャ変更時
- [ ] 新しいベストプラクティスが確立した時

**期待する成果物**:
```markdown
# ドキュメント更新ガイドライン

## いつ更新するか

### 必須（即座に更新）
- 新しいバグパターンの発見
- アーキテクチャ変更
- 禁止事項の追加

### 推奨（四半期ごと）
- よくある間違いの追加
- ベストプラクティスの見直し
- Git履歴の再分析

## 更新手順

1. 該当する.mdファイルを特定
2. 新規セクション追加 or 既存セクション更新
3. 例を追加（❌ 間違い / ✅ 正しい）
4. 理由・背景を記載
5. PRでレビュー依頼
```

## 期待する成果物まとめ

1. **Git履歴分析レポート** (`tmp/reports/git-history-analysis.md`)
   - 頻繁に修正されるファイル分析
   - 繰り返されたバグパターン
   - PRレビュー頻出指摘事項

2. **よくある間違い集** (`.claude/common-mistakes.md`)
   - Vueコンポーネント編
   - TypeScript編
   - プロジェクト固有編

3. **プロジェクト制約・ベストプラクティス** (`.claude/coding-standards.md`)
   - アーキテクチャ制約
   - 命名規則・ファイル構成
   - JSDoc記述基準

4. **改善版CLAUDE.md** (`CLAUDE.md`)
   - 構造化された情報
   - 履歴から得た教訓の反映

5. **ドキュメント更新ガイド** (`docs/dev/document-maintenance.md`)
   - 更新タイミング
   - 更新手順

## 備考

- 分析には`git log`, `gh api`コマンドを活用
- 機密情報（APIキー等）は含めない
- 具体例を多く含めて実用的に
- 定期的な見直しを前提とした構成に
