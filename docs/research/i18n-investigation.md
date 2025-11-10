# 他言語対応調査

## 概要

遊戯王公式データベースの多言語対応（日本語/英語）のための調査。

## 調査対象

### 1. デッキ表示ページ

- **日本語**: `?request_locale=ja`
- **英語**: `?request_locale=en`

### 2. カード検索結果ページ

- **日本語**: `?request_locale=ja`
- **英語**: `?request_locale=en`

### 3. カード詳細ページ

- **日本語**: `?request_locale=ja`
- **英語**: `?request_locale=en`

## 調査項目

### A. テキスト記号の差異

| 日本語 | 英語 | 用途 | 備考 |
|--------|------|------|------|
| 【】 | [] | カード効果テキスト内 | |
| ？ | ? | 不明値（ATK/DEF） | |
| | | | |

### B. カード情報ラベル

#### カード種別

| 日本語 | 英語 | img src |
|--------|------|---------|
| モンスター | Monster | attribute_icon_*.png |
| 魔法 | Spell | attribute_icon_spell.png |
| 罠 | Trap | attribute_icon_trap.png |

#### 属性

| 日本語 | 英語 | img src |
|--------|------|---------|
| 光 | LIGHT | attribute_icon_light.png |
| 闇 | DARK | attribute_icon_dark.png |
| 水 | WATER | attribute_icon_water.png |
| 炎 | FIRE | attribute_icon_fire.png |
| 地 | EARTH | attribute_icon_earth.png |
| 風 | WIND | attribute_icon_wind.png |
| 神 | DIVINE | attribute_icon_divine.png |

#### 種族（モンスター）

| 日本語 | 英語 |
|--------|------|
| ドラゴン族 | Dragon |
| 戦士族 | Warrior |
| 魔法使い族 | Spellcaster |
| （調査中） | ... |

#### 効果種類（魔法）

| 日本語 | 英語 | img src |
|--------|------|---------|
| 通常 | Normal | なし |
| 速攻 | Quick-Play | effect_icon_quickplay.png |
| 永続 | Continuous | effect_icon_continuous.png |
| 装備 | Equip | effect_icon_equip.png |
| フィールド | Field | effect_icon_field.png |
| 儀式 | Ritual | effect_icon_ritual.png |

#### 効果種類（罠）

| 日本語 | 英語 | img src |
|--------|------|---------|
| 通常 | Normal | なし |
| 永続 | Continuous | effect_icon_continuous.png |
| カウンター | Counter | effect_icon_counter.png |

### C. デッキページのラベル

| 日本語 | 英語 | HTML要素 | 備考 |
|--------|------|----------|------|
| メインデッキ | Main Deck | | |
| エクストラデッキ | Extra Deck | | |
| サイドデッキ | Side Deck | | |
| （調査中） | ... | | |

## 調査手順

1. 公開デッキの日本語版HTMLをダウンロード
2. 同じデッキの英語版HTMLをダウンロード
3. 差分を比較して一覧表を埋める
4. パーサー修正が必要な箇所をリストアップ

## 調査結果

（以下、調査を進めながら記入）

### 検出された差異

#### 1. 【】 vs []

**調査予定**

#### 2. カード情報のラベル

**調査予定**

#### 3. デッキページのラベル

**調査予定**

## パーサー修正が必要な箇所

### 1. テキストベースの判定を使用している箇所

- [ ] deck-detail-parser.ts: デッキ名、カテゴリ名の抽出
- [ ] card-search.ts: （画像ベース判定に移行済み）
- [ ] その他（調査中）

### 2. 多言語マッピングテーブルが必要な箇所

- [ ] 種族名（Race）
- [ ] モンスタータイプ（MonsterType）
- [ ] その他（調査中）

## 実装方針

（調査完了後に記入）
