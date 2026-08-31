# card-detail-ui.ts のレガシーDOMタブUIがデッドコード化している

## 現状

`src/content/deck-display/card-detail-ui.ts` にはモジュールレベルの状態
`selectedCard`（`SelectedCard | null`, 初期値`null`）と`currentTab`があり、
`getSelectedCard()`/`getCurrentTab()`としてexportされている。

`initCardDetailUI()`は`#ygo-next-card-detail-container .ygo-next.tab-btn`を
`querySelectorAll`し、クリックイベントで`switchTab()`→`updateTabContent()`を呼び、
`selectedCard`の内容をDOMに直接描画（`renderFAQContent()`でFAQをHTML化）する
実装になっている。

## 問題点

- `selectedCard`はファイル内のどこからも再代入されていない（宣言時の`null`のまま）。
  そのため`getSelectedCard()`は常に`null`を返し、`updateTabContent()`の
  `if (!selectedCard || !selectedCard.cardId)`は常にtrueとなり、
  常に「カードを選択してください」を表示するだけで終わる。
- `EXTENSION_IDS.deckDisplay.cardDetailContainer`(`ygo-next-card-detail-container`)・
  `cardInfoContent`(`ygo-next-card-info-content`)というDOM IDは`src/utils/dom-selectors.ts`
  に定義されているが、`src/`全体を検索してもこれらのIDを実際にDOMへ描画している
  Vueコンポーネントは存在しない。
- 実際のカード詳細表示は`src/components/CardDetail.vue`が`cardDetailStore`（Pinia）
  の`selectedCard`/`cardTab`を直接参照する形に移行済み（`cardDetailStore.setSelectedCard()`/
  `setCardTab()`）で、card-detail-ui.ts内の`switchTab`/`updateTabContent`/
  `renderFAQContent`/`fetchFAQData`/`getSelectedCard`/`getCurrentTab`は
  本番のDOM構造上、呼び出されることがない（`initCardDetailUI()`内の
  `tabButtons.forEach`が常に空配列に対して実行される）。
- 一方、`attachCardClickHandlers()`/`findCardInParsedDeck()`/`selectCard()`は
  `#deck_image`（本番に実在するDOM）を対象にしており、`selectCard()`内で
  `cardDetailStore.setSelectedCard()`を呼んでいるため、こちらはCardDetail.vueの
  実データ供給経路として現役で機能している。

## 改善案

- `selectedCard`/`currentTab`/`cachedFAQData`のモジュール状態と、
  `switchTab`/`updateTabContent`/`renderFAQContent`/`fetchFAQData`/
  `getSelectedCard`/`getCurrentTab`のレガシーDOMタブUI実装一式を削除する。
- `initCardDetailUI()`内のタブボタンクリックイベント登録部分（83-98行目）も
  併せて削除し、`parseDeckDetail`実行とクリックハンドラ設定
  （`setupCardClickListeners()`）のみを残す形に整理する。

## 優先度

low（実害なし。呼ばれないコードが残っているだけで、ユーザー影響は無い）

## 関連

- 発見元: TASK-330（Tier B展開、content残り分のconditions.toml作成中）
- 関連ファイル: src/content/deck-display/card-detail-ui.ts, src/components/CardDetail.vue, src/stores/card-detail.ts
