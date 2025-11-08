# Parser Tests

各HTMLページからデータを抽出するパーサーのテスト

## テストファイル

### 実装済み

1. **deck-detail.test.ts** - デッキ詳細パーサー
   - 対象HTML: `tests/combine/data/deck-detail-public.html`
   - パーサー: `src/content/parser/deck-detail-parser.ts` の `parseDeckDetail`
   - テスト項目:
     - 基本情報（dno, name, isPublic, cgid）
     - デッキ構成（mainDeck, extraDeck, sideDeck）
     - メタデータ（deckType, deckStyle, category, tags, comment, deckCode）
     - カード情報（name, cardId, cardType, quantity）
   - 実行結果: ✓ 成功（26 mainDeck, 14 extraDeck, 0 sideDeck）

2. **card-search.test.ts** - カード検索結果パーサー
   - 対象HTML: `tests/combine/data/card-search-result.html`
   - パーサー: `src/api/card-search.ts` の `parseSearchResultRow` + `extractImageInfo`
   - テスト項目:
     - カード基本情報（name, cardId, cardType）
     - モンスター情報（attribute, levelType, levelValue, race, types, atk, def）
     - 魔法・罠情報（effectType）
   - 実行結果: ✓ 成功（10枚のモンスターカードをパース）

3. **card-detail.test.ts** - カード詳細パーサー
   - 対象HTML: `tests/combine/data/card-detail.html`
   - パーサー: `src/api/card-search.ts` の `parsePackInfo` + `parseRelatedCards`
   - テスト項目:
     - 収録シリーズ（releaseDate, cardNumber, packName）
     - 関連カード（基本カード情報）
   - 実行結果: ✓ 成功（2 packs, 10 related cards）

4. **card-faq-list.test.ts** - カードQA一覧パーサー
   - 対象HTML: `tests/combine/data/card-faq-list.html`
   - パーサー: `src/api/card-faq.ts` の `getCardFAQList`
   - テスト項目:
     - カード名（タイトルから抽出）
     - FAQ一覧（faqId, question, updatedAt）
   - 実行結果: ✓ 成功（3 FAQs, cardName: "王家の眠る谷－ネクロバレー"）

5. **faq-detail.test.ts** - 個別QA詳細パーサー
   - 対象HTML: `tests/combine/data/faq-detail.html`
   - パーサー: `src/api/card-faq.ts` の `getFAQDetail`
   - テスト項目:
     - 質問（question）
     - 回答（answer）
     - 更新日（updatedAt）
   - 実行結果: ✓ 成功（question: 115文字, answer: 89文字）

## テスト実行方法

```bash
# 個別のテストを実行
npx tsx tests/combine/parser/deck-detail.test.ts
npx tsx tests/combine/parser/card-search.test.ts
npx tsx tests/combine/parser/card-detail.test.ts
npx tsx tests/combine/parser/card-faq-list.test.ts
npx tsx tests/combine/parser/faq-detail.test.ts

# 全テストを実行
npx tsx tests/combine/parser/deck-detail.test.ts && \
npx tsx tests/combine/parser/card-search.test.ts && \
npx tsx tests/combine/parser/card-detail.test.ts && \
npx tsx tests/combine/parser/card-faq-list.test.ts && \
npx tsx tests/combine/parser/faq-detail.test.ts
```

## データファイル

テストで使用するHTMLファイルは `tests/combine/data/` に配置されています：

- `deck-detail-public.html` (432KB) - デッキレシピ詳細ページ
- `card-search-result.html` (285KB) - カード検索結果ページ（ブラック・マジシャン）
- `card-detail.html` (308KB) - カード詳細ページ（巨大要塞ゼロス）
- `card-faq-list.html` (210KB) - カードQA一覧ページ（王家の眠る谷－ネクロバレー）
- `faq-detail.html` (209KB) - 個別QAページ
