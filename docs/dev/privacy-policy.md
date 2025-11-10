# プライバシーポリシー

**最終更新日**: 2025年11月10日

## 概要

Yu-Gi-Oh! Deck Helper（以下「本拡張機能」）は、遊戯王公式カードデータベースでのデッキ管理を支援するChrome拡張機能です。本プライバシーポリシーでは、本拡張機能がどのようにユーザー情報を取り扱うかについて説明します。

## データの取り扱いについて

本拡張機能は、以下のデータを**ブラウザ内でのみ処理**します。これらのデータは開発者のサーバーや第三者のサーバーに**一切送信されません**。

### 処理するデータ

1. **ページ内のデータ**
   - デッキ情報（デッキ名、カードリスト、枚数など）
   - カード情報（カード名、画像、属性など）
   - ユーザーID（cgid）
     ※公式サイトのURLに含まれる識別子。デッキURL生成に使用
   - その他URLパラメータ（dno等）

2. **ユーザーの操作**
   - ボタンのクリック（シャッフル、ダウンロードなど）
   - テキスト入力（デッキ名の編集）
   - 設定の変更（機能のON/OFF）

3. **保存するデータ**
   - 機能設定（各機能のON/OFF状態）
   - デッキメタデータ（デッキタイプ、スタイル、カテゴリの選択肢）

**これらのデータは全てブラウザ内で処理され、外部には送信されません。**

## 使用する権限

本拡張機能は、以下の権限を使用しますが、いずれも情報の外部送信は行いません。

### 1. ストレージ権限（storage）

- **目的**: ユーザーの設定情報とデッキメタデータをブラウザのローカルストレージに保存
- **保存される情報**:
  - 各機能のON/OFF設定（デッキ画像作成、シャッフル機能など）
  - デッキメタデータ（デッキタイプ、スタイル、カテゴリの選択肢）
    ※公式サイトの検索フォームから取得したラベル情報をキャッシュ
- **保存場所**: ユーザーのブラウザ内（chrome.storage.local）
- **外部送信**: なし

### 2. ホスト権限（https://www.db.yugioh-card.com/*）

- **目的**: 遊戯王公式カードデータベースのページ上で機能を提供
- **動作内容**:
  - デッキページへのボタン追加
  - カードのシャッフル・ソート・固定
  - デッキ画像の生成（ブラウザ内で完結）
- **外部送信**: なし

## データの取り扱い

### ローカル処理

本拡張機能の全ての処理は、ユーザーのブラウザ内でローカルに実行されます。

- **デッキ画像作成**: HTML Canvas APIを使用してブラウザ内で画像を生成
- **カードシャッフル**: JavaScriptでDOMを操作（ブラウザ内で完結）
- **設定保存**: Chrome Storage APIを使用してローカルに保存

### 外部サーバーへの通信

**本拡張機能は、開発者が運営するサーバーや第三者のサーバーに対して、いかなるデータも送信しません。**

ユーザーが遊戯王公式サイトにアクセスする際の通信は、公式サイトとの通常の通信のみであり、本拡張機能による追加の通信は発生しません。

## 第三者によるデータアクセス

本拡張機能は、第三者にユーザーデータを提供、販売、共有することはありません。

## データの保存期間

ユーザーの設定情報は、以下のいずれかの操作が行われるまでブラウザのローカルストレージに保存されます：

- 拡張機能のアンインストール
- ブラウザのデータ消去
- 拡張機能の設定リセット

## ユーザーの権利

ユーザーは以下の権利を有します：

- **設定の変更**: オプションページから各機能のON/OFF設定を変更可能
- **データの削除**: 拡張機能をアンインストールすることで、保存された全てのデータを削除可能
- **機能の無効化**: 拡張機能を無効化することで、全ての機能を停止可能

## お子様のプライバシー

本拡張機能は、年齢を問わず全てのユーザーが安全に使用できるよう設計されています。個人情報の収集を行わないため、お子様が使用する際も安心してご利用いただけます。

## プライバシーポリシーの変更

本プライバシーポリシーは、必要に応じて更新される場合があります。重要な変更がある場合は、拡張機能の更新情報にてお知らせします。

## お問い合わせ

本プライバシーポリシーに関するご質問は、以下のGitHubリポジトリのIssuesページよりお問い合わせください：

https://github.com/TomoTom0/ygo-deck-helper/issues

---

## Privacy Policy (English)

**Last Updated**: November 10, 2025

## Overview

Yu-Gi-Oh! Deck Helper ("this extension") is a Chrome extension that enhances deck management on the official Yu-Gi-Oh! card database. This privacy policy explains how this extension handles user information.

## Data Handling

This extension processes the following data **only within your browser**. None of this data is **transmitted to developers' servers or third-party servers**.

### Data Processed

1. **Page Data**
   - Deck information (deck name, card list, quantities, etc.)
   - Card information (card name, images, attributes, etc.)
   - User ID (cgid)
     *Identifier included in official site URLs, used for generating deck URLs
   - Other URL parameters (dno, etc.)

2. **User Actions**
   - Button clicks (shuffle, download, etc.)
   - Text input (deck name editing)
   - Settings changes (feature ON/OFF)

3. **Stored Data**
   - Feature settings (ON/OFF status for each feature)
   - Deck metadata (deck type, style, category options)

**All of this data is processed within your browser and is not transmitted externally.**

## Permissions Used

This extension uses the following permissions, but does not transmit any information externally.

### 1. Storage Permission

- **Purpose**: Save user settings to browser's local storage
- **Stored Information**:
  - ON/OFF settings for each feature (deck image creation, shuffle function, etc.)
- **Storage Location**: User's browser (local storage)
- **External Transmission**: None

### 2. Host Permission (https://www.db.yugioh-card.com/*)

- **Purpose**: Provide features on Yu-Gi-Oh! official card database pages
- **Operations**:
  - Add buttons to deck pages
  - Shuffle, sort, and lock cards
  - Generate deck images (processed entirely in browser)
- **External Transmission**: None

## Data Handling

### Local Processing

All processing by this extension is executed locally within the user's browser.

- **Deck Image Creation**: Generated in-browser using HTML Canvas API
- **Card Shuffle**: DOM manipulation with JavaScript (browser-only)
- **Settings Storage**: Saved locally using Chrome Storage API

### External Server Communication

**This extension does not transmit any data to servers operated by developers or third parties.**

Communication when users access the official Yu-Gi-Oh! site is only normal communication with the official site; no additional communication occurs from this extension.

## Third-Party Data Access

This extension does not provide, sell, or share user data with third parties.

## Data Retention Period

User settings are stored in browser's local storage until one of the following actions occurs:

- Extension uninstallation
- Browser data clearing
- Extension settings reset

## User Rights

Users have the following rights:

- **Change Settings**: Modify ON/OFF settings for each feature from the options page
- **Delete Data**: Remove all stored data by uninstalling the extension
- **Disable Features**: Stop all features by disabling the extension

## Children's Privacy

This extension is designed to be safely used by users of all ages. Since it does not collect personal information, children can use it with confidence.

## Changes to Privacy Policy

This privacy policy may be updated as necessary. Significant changes will be announced through extension update information.

## Contact

For questions about this privacy policy, please contact us through the Issues page of our GitHub repository:

https://github.com/TomoTom0/ygo-deck-helper/issues
