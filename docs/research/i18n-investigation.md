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

### A. 検索フォームから取得（マッピングテーブル）

各言語の検索フォームページから、以下のマッピングを取得：

1. 種族（Race）のテキスト → 内部ID
2. 属性（Attribute）のテキスト → 内部ID
3. モンスタータイプ（MonsterType）のテキスト → 内部ID
4. 魔法効果種別（SpellEffectType）のテキスト → 内部ID
5. 罠効果種別（TrapEffectType）のテキスト → 内部ID

**取得方法：**
- 日本語: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&request_locale=ja`
- 英語: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&request_locale=en`

**実装方針：**
- 事前調査でマッピングテーブルを作成
- Chrome拡張内で検索フォームを動的に取得して、マッピングを自動更新する仕組みも実装

### B. 実際のページから調査（記号・フォーマット）

公開デッキやカード詳細ページから、以下の記号の違いを調査：

1. カード効果テキスト内の括弧: 【】vs []
2. 種族・タイプの区切り文字: ／（全角スラッシュ）vs /（半角スラッシュ）
3. その他の記号の差異

**取得方法：**
1. 公開デッキの日本語版HTMLをダウンロード
2. 同じデッキの英語版HTMLをダウンロード
3. 差分を比較して記号の使われ方を確認
4. パーサー修正が必要な箇所をリストアップ

## 調査結果

### 重要：調査範囲の限定

**判定に使っていない表記の差異は調査不要**

実装を確認した結果、テキストベースの判定を使っているのは以下の2箇所のみ：

1. **種族（Race）**: `src/api/card-search.ts:788` - `RACE_TEXT_TO_ID[raceText]`
2. **モンスタータイプ（MonsterType）**: `src/api/card-search.ts:795` - `MONSTER_TYPE_TEXT_TO_ID[typeText]`

その他は画像ベースまたはID指定で判定しているため、テキストの差異は影響なし。

### 検出された差異（判定に使用している箇所のみ）

#### 1. 種族（Race）

| 日本語 | 英語 | 備考 |
|--------|------|------|
| ドラゴン族 | Dragon | ✅ 確認済み（青眼の白龍） |
| 機械族 | Machine | ✅ 確認済み（B.E.S.） |
| 魔法使い族 | Spellcaster | （次回調査） |
| （その他） | ... | 検索フォームから取得 |

**重要**: 日本語は「〜族」という接尾辞が付くが、英語には付かない

#### 2. モンスタータイプ（MonsterType）

| 日本語 | 英語 | 備考 |
|--------|------|------|
| 通常 | Normal | ✅ 確認済み（青眼の白龍） |
| 効果 | Effect | ✅ 確認済み（B.E.S.） |
| 融合 | Fusion | （次回調査） |
| シンクロ | Synchro | （次回調査） |
| エクシーズ | Xyz | （次回調査） |
| ペンデュラム | Pendulum | （次回調査） |
| リンク | Link | （次回調査） |

**注意**: 検索フォームから全てのタイプを取得予定

#### 3. 記号の違い

##### 括弧（カード情報セクション）

| 日本語 | 英語 | 用途 | 判定への影響 |
|--------|------|------|------------|
| 【】 | [] | カード収録情報の種族・タイプ表示 | ✅ **パーサー修正が必要** |

**確認済み箇所**: `src/api/card-search.ts:775` - `speciesText.replace(/【|】/g, '')` で【】を除去

**修正方針**: 括弧除去の正規表現を `replace(/【|】|\[|\]/g, '')` に変更して、英語版の [] にも対応

##### スラッシュ（種族・タイプの区切り）

| 日本語 | 英語 | 用途 | 判定への影響 |
|--------|------|------|------------|
| ／ | ／ | 種族とタイプの区切り | ✅ **修正不要（言語非依存）** |

**確認済み**: 英語版でも全角スラッシュ「／」が使用されている

**確認済み箇所**: `src/api/card-search.ts:777` - `cleaned.split('／')` で分割（英語版でも動作）

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
