# 画像生成dialogの背景画像切り替えがクロスフェードしない

## 現状

`src/components/ImageDialog.vue` の `.background-image` は `toggleColor()`/`toggleSide()` 実行時に `backgroundImageUrl` の値（data URL）を差し替えることで、赤/青カラーバリエーションの切り替えや、Include Side トグルによる再生成画像への切り替えを行っている。CSSには `transition: background 0.5s ease;` が指定されている。

## 問題点

`background-image` の `url()` 値の変化はブラウザのCSSトランジション対象にならない（プロパティの補間ができないため）。そのため `transition: background 0.5s ease` は実質的に効果を持たず、画像は瞬時に切り替わっている。TASK-384（画像生成dialogの状態変化にアニメーションが無いという指摘）の調査で判明したが、他の項目（フッター入力欄展開、ポップアップ高さ変化）と異なりCSSだけでは解決できず、JS側での二重バッファリング（新旧画像を重ねてopacityをクロスフェードさせる等）が必要なため、本タスクでは対応を見送った。

## 改善案

- `.background-image` を新旧2枚のレイヤー（例: 2つの子要素、またはvueのTransitionコンポーネントでmode="out-in"やクロスフェード用のCSS）に分離し、画像切り替え時に旧画像をフェードアウトしつつ新画像をフェードインする
- もしくは `<img>` 要素2枚を重ねてopacityを操作する実装に変更する

## 優先度

low

## 関連

- 指摘元: ユーザー指摘「動きにアニメーションがないのもあり得ない」(TASK-384)
- 関連ファイル: src/components/ImageDialog.vue
