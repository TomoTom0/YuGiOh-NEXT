# DONE

完了したタスク

## 初期調査（過去）
- [x] 認証フローの初期調査（OAuth 2.0 等の確認）
- [x] 認証に関する基本的な制約の整理（SameSite, HTTPOnly, CORS の確認）
- [x] `dev/session.example.env` と `dev/test-api.ts` の作成

## Chrome DevTools を使った実地調査（2025-10-30）
- [x] Chrome ブラウザの起動とリモートデバッグ接続の確立
- [x] ログイン後のセッション情報の取得（JSESSIONID, cgid, lt）
- [x] マイデッキ一覧ページの構造調査
  - デッキ一覧の HTML 構造
  - 編集リンクの取得方法（hidden input `.link_value`）
  - cgid, ytkn, dno パラメータの特定
- [x] デッキ詳細ページ（ope=1）の構造調査
  - カード数の表示
  - カードリストの HTML 構造
  - デッキメタ情報の取得
- [x] デッキ編集ページ（ope=2）の構造調査
  - フォーム要素の詳細分析
  - デッキヘッダー情報の入力項目
  - カード情報の格納方式
- [x] デッキ保存の仕組み調査（ope=3）
  - AJAX POST リクエストの詳細
  - JavaScript `Regist()` 関数の解析
  - レスポンス形式（JSON）の確認
- [x] 操作コード（ope）の一覧整理
  - ope=1: デッキ表示/詳細
  - ope=2: デッキ編集
  - ope=3: デッキ保存
  - ope=4: デッキ一覧
  - ope=6: デッキ新規作成
- [x] ytkn（CSRFトークン）の動作確認
  - ページ遷移ごとに変わることを確認
  - hidden input での取得方法
- [x] 調査結果ドキュメントの作成（`docs/research/api-investigation-results.md`）

## デッキ編集画面の調査（2025-10-30 13:20完了）
- [x] Chrome起動用セットアップスクリプトの作成（scripts/debug/setup/）
- [x] デッキ編集ページ（ope=2）への移動
- [x] カード名入力フィールド（monm）の構造調査
  - name属性、ID、class、値の形式を確認
- [x] 枚数入力フィールド（monum）の構造調査
  - name属性、ID、class、値の形式を確認
- [x] カードID（monsterCardId）とイメージID（imgs）の確認
- [x] 調査結果ドキュメントの作成（docs/design/edit/deck-edit.md）

## カード検索機能の調査（フェーズ1）（2025-10-30 14:00完了）
- [x] 基本検索フォーム構造の確認（form_search, GET, 140フィールド）
- [x] 全検索パラメータの特定（140個のフィールドをリスト化）
- [x] 属性パラメータの解析（7種類: 光/闇/水/炎/地/風/神）
- [x] 種族パラメータの解析（26種類: ドラゴン/アンデット/悪魔など）
- [x] 魔法/罠効果パラメータの解析（7種類: 通常/カウンター/フィールドなど）
- [x] 検索タイプの特定（stype: カード名/カードテキスト/ペンデュラム効果/カードNo）
- [x] カードタイプの特定（ctype: すべて/モンスター/魔法/罠）
- [x] 数値範囲パラメータの確認（レベル、Pスケール、リンク、攻撃力、守備力）
- [x] 発売日範囲パラメータの確認
- [x] 公式JSファイルのダウンロード（5ファイル）
- [x] 中間レポートの作成（docs/research/card-search-parameters.md）

## カード検索機能の徹底調査（フェーズ2）（2025-10-30 18:00完了）
- [x] rpパラメータの隠し機能発見（UI表示：10/25/50/100、実際：1〜2000）
- [x] sortパラメータの完全マッピング（13種類、sort=10は欠番）
- [x] 属性検索の実URLテスト（3属性でテスト実行）
- [x] 種族検索の実URLテスト（3種族でテスト実行）
- [x] 複数パラメータ組み合わせテスト（9パターン）
  - 攻撃力範囲指定（2000-3000）
  - 守備力範囲指定（0-2000）
  - レベル範囲指定（4-7）
  - ペンデュラムスケール（1-5）
  - カードタイプ別検索（モンスター/魔法/罠）
  - 効果モンスター、シンクロモンスター検索
- [x] リンクマーカー機能の完全解明
  - 9方向のチェックボックス構造（linkbtn1〜9、5は欠番）
  - link_m（AND/OR条件）の動作確認
  - 複数方向選択のURLパラメータ確認
- [x] 複数選択パラメータの仕様確認
  - attr（属性）の複数選択テスト
  - species（種族）の複数選択テスト
  - other（その他条件）の複数選択テスト
  - jogai（除外条件）の複数選択テスト
  - パラメータ名繰り返し方式の確認（attr=11&attr=12&attr=14）
- [x] 条件結合パラメータの動作確認
  - othercon（AND/OR）の動作確認
  - link_m（AND/OR）の動作確認
- [x] ソート選択肢の抽出（extract-sort-options.js）
- [x] その他条件ラベルの抽出（extract-other-jogai-labels.js）
- [x] 多言語対応i18nデータ構造の作成
  - 日本語ロケール（ja）の完全マッピング
  - パラメータ値とラベルの対応表
  - メタデータ（デフォルト値、複数選択可能パラメータ、範囲パラメータ）
- [x] 完全仕様書の作成（docs/research/card-search-parameters-complete-spec.md）
- [x] 調査レポートの作成（docs/research/card-search-investigation-report.md）
- [x] テストスクリプト群の作成
  - test-attribute-search-v2.js
  - test-multiple-params.js
  - test-linkmarker-checked.js
  - test-multiple-checkbox-values.js
- [x] 生成データの整理（9個のJSONファイル + i18nデータ）

## ドキュメント整理（2025-10-30 16:15完了）
- [x] 汎用調査手法ガイドの作成（investigation-methodology.md）
  - WebSocket接続、DOM操作、データ抽出の基本パターン
  - 5つの調査手法、3つのデータ抽出パターン
  - テストと検証、トラブルシューティング
- [x] カード検索 再調査ガイドの作成（card-search/reinvestigation-guide.md）
  - 5ステップの再調査手順（仕様変更確認用）
  - 他言語対応の調査手順（en, ko, zh-CN）
  - 差分確認の方法、実行可能なスクリプトのテンプレート
- [x] docs/research/ディレクトリの整理
  - card-search/サブディレクトリの作成
  - archive/への古いファイル移動
  - ファイル名から冗長なプレフィックスを削除
  - 各ディレクトリにREADME追加
- [x] INVESTIGATION_SUMMARY.mdの更新（パス修正）
- [x] research/README.mdの全面刷新
  - ディレクトリ構造の説明
  - クイックスタートガイド
  - 主要ドキュメントの紹介
  - 調査済み機能の整理
- [x] card-search/README.mdの作成
  - カード検索ドキュメントの目次
  - 読む順序のガイド
  - 重要な発見のまとめ

## カード情報HTML構造の徹底調査（2025-10-30 19:30完了）
- [x] 検索結果ページのHTML構造調査
  - [x] カードアイテム（.t_row.c_normal）の構造確認
  - [x] カード名、ふりがな、CID、画像URLの取得方法
  - [x] 属性、レベル、種族、ATK/DEF情報の抽出パターン
  - [x] カードテキストの取得方法
  - [x] ページネーション構造の確認
  - [x] 検索結果から直接取得可能な情報の特定
- [x] カード詳細ページのHTML構造調査
  - [x] 収録パック情報の構造（.t_row形式）
    - 発売日、カードナンバー、パック名
    - レアリティ情報（.lr_icon）
    - パック検索リンク
  - [x] 関連カード情報の取得（検索結果と同じ.t_row構造）
  - [x] Q&A情報の構造
    - 質問タイトル（.dack_name .name）
    - タグ（.tag_name）
    - 更新日（.div.date）
    - Q&A詳細ページへのリンク
- [x] Q&A一覧ページの構造確認
  - [x] Q&Aアイテムの.t_row構造
  - [x] ページネーション
  - [x] フィルタリング機能
- [x] 調査スクリプトの作成
  - [x] investigate-search-results.js（検索結果ページ調査）
  - [x] investigate-card-detail.js（カード詳細調査）
  - [x] investigate-card-extended-info.js（収録パック・関連カード・Q&A）
  - [x] investigate-search-card-details.js（検索結果での詳細情報取得確認）
  - [x] investigate-qa-page.js（Q&Aページ構造調査）
- [x] 日本語版の調査（request_locale=ja パラメータの確認）
- [x] スクリーンショットとHTMLの保存（各ページ）
- [x] 包括的なドキュメント作成
  - [x] `docs/research/card-information-structure.md`の作成
  - セレクター一覧、実装時の考慮事項を含む完全な仕様書

## デッキ操作API完全解明（2025-10-30 20:00完了）
- [x] デッキ削除API（ope=7）の調査
  - [x] DeckDelete()関数の実装確認
  - [x] 確認ダイアログの実装
  - [x] URL構造とパラメータの確認
  - [x] ドキュメント追加（api-investigation-results.md）
- [x] デッキ複製API（ope=8）の調査
  - [x] URL構造の確認
  - [x] パラメータ（cgid, dno）の特定
  - [x] 複製後の遷移先確認（新しいdnoで編集ページへ）
  - [x] ドキュメント追加（api-investigation-results.md）
- [x] デッキコード発行（ope=13）の調査
  - [x] URL構造の確認
  - [x] デッキコード生成機能の動作確認
- [x] デッキ保存API（ope=3）の完全解明
  - [x] Regist()関数の完全な実装コードを取得
  - [x] jQueryのAJAXリクエストの詳細確認
    - type: 'post'
    - URL: `/yugiohdb/member_deck.action?cgid={cgid}&request_locale=ja`
    - data: `'ope=3&' + $('#form_regist').serialize()`
    - dataType: 'json'
  - [x] 保存ボタン（btn_regist）の実装確認
  - [x] レスポンス形式の確認
    - 成功: `{"result": true}`
    - 失敗: `{"error": ["エラーメッセージ"]}`
  - [x] 成功時の自動リダイレクト確認
- [x] カード追加操作の完全実装
  - [x] カード入力スロットの構造確認（65個のスロット）
    - カード名（monm）
    - 枚数（monum）
    - カードID（monsterCardId）
    - 画像ID（imgs）
  - [x] 空のスロット検出ロジックの実装
  - [x] カード追加のプログラム実装（Playwright使用）
    - 編集ページへのアクセス
    - DOM操作でカード名と枚数を設定
    - jQueryのAJAXで保存
  - [x] 実際のカード追加テスト
    - テストカード:「灰流うらら」
    - 保存成功確認（レスポンス: `{"result": true}`）
    - デッキへの追加を確認（3枚として登録）
  - [x] カードIDが空でも保存可能なことを確認
    - サーバー側が自動的に解決またはカード統合
- [x] 調査スクリプト群の作成
  - [x] add-card-and-save.js（カード追加と保存の完全実装）
  - [x] verify-card-added.js（カード追加の確認）
  - [x] debug-form-data.js（フォームデータのデバッグ）
  - [x] find-save-button.js（保存ボタンの探索）
  - [x] get-regist-function.js（Regist関数の取得）
- [x] APIドキュメントの大幅更新
  - [x] カード追加操作セクションの追加
    - カード入力スロットの構造
    - カード追加の手順
    - プログラムからの実装例
  - [x] 保存API（ope=3）の詳細な実装ガイド
    - Regist関数の完全な実装コード
    - 保存ボタンの実装
    - プログラムからの呼び出し例
  - [x] デッキ操作APIの完全な仕様書化

## カード追加ワークフローの完成とデバッグ（2025-10-31 完了）
- [x] 完全版ワークフロースクリプトの作成
  - [x] カード検索からカード情報取得
  - [x] カードタイプの自動判定（`.box_card_attribute span:last-child`）
  - [x] デッキ編集ページでカード追加
  - [x] デッキヘッダー情報の変更
  - [x] 保存実行
  - [x] 検証（デッキ編集ページで確認）
- [x] カードID設定の重大な問題発見と修正
  - [x] 問題の特定：すべてのカードタイプが同じID属性を使用
    - モンスター: `id="card_id_1"`, `name="monsterCardId"`
    - 魔法: `id="card_id_1"`, `name="spellCardId"`
    - 罠: `id="card_id_1"`, `name="trapCardId"`
  - [x] `querySelector('#card_id_1')`が最初に見つかったモンスターフィールドを選択していた
  - [x] 解決策の実装：IDとname属性の両方で選択
    - `querySelector('#card_id_1[name="spellCardId"]')`
- [x] 再利用可能なsaveDeck関数の作成（tmp/save-deck-function.js）
  - [x] デッキ番号とデッキデータ辞書を受け取る
  - [x] デッキ内容を上書き保存
  - [x] カードタイプに応じた正しいフィールド選択
  - [x] 動作確認：3枚の魔法カードを正しく保存
- [x] complete-workflow-with-card-type.jsの修正
  - [x] getFieldNames関数の修正（cardIdName追加）
  - [x] カードID設定コードの修正
  - [x] 動作確認：3枚の魔法カードを正しく保存
- [x] デバッグスクリプトの作成
  - [x] save-deck-debug.js（serialize()内容の確認）
  - [x] verify-deck-4.js（デッキ内容の検証）
- [x] ドキュメント更新
  - [x] カードタイプ別フィールド名の完全なマッピング
  - [x] 正しいDOMセレクタの使用方法

## Chrome拡張設計ドキュメントの作成（2025-10-31 完了）
- [x] 調査結果の位置づけを明確化
  - Playwright調査 = Chrome拡張実装のための情報源
- [x] Chrome拡張向けアーキテクチャ設計
  - [x] docs/design/chrome-extension-architecture.md
  - Content Scripts、Background、Popup の構成
  - 調査結果（DOM構造、API仕様）を反映した設計
  - カードタイプ別フィールドマッピングの活用
- [x] 実装ガイドの作成
  - [x] docs/design/implementation-guide.md
  - 調査スクリプトからChrome拡張へのマッピング
  - 各機能の実装方法と参照すべき調査結果
  - 実装チェックリスト
  - トラブルシューティングガイド

## カード検索とタイプ判定の詳細調査（2025-11-04 完了）
- [x] DOM属性ベースのカードタイプ判定方法の確立
  - [x] ユーザーからの重要なフィードバック対応
    - テキストベースではなくDOM属性での判定を推奨される
  - [x] img要素のsrc属性を使用した判定ロジックの実装
    - `attribute_icon_spell.png` → 魔法カード
    - `attribute_icon_trap.png` → 罠カード
    - `attribute_icon_(light|dark|water|fire|earth|wind|divine).png` → モンスターカード
  - [x] ロケール非依存の実装確認
    - 日本語、英語、韓国語などすべてのロケールで動作
  - [x] テキストベース判定の非推奨化を明記
- [x] ctypeパラメータの正確な値の確認
  - [x] 以前の調査での矛盾点の発見
    - ctype=2でspellカード、ctype=3でtrapカードが返されていた
  - [x] 実際のHTML構造のダンプと確認
    - ctypeはラジオボタンではなくselectボックス
  - [x] 正確なマッピングの確定
    - 空文字列: すべてのカード
    - 1: モンスターカード
    - 2: 魔法カード
    - 3: 罠カード
  - [x] HTMLダンプによる検証スクリプトの作成
    - dump-search-page-html.js
    - simple-ctype-check.js
- [x] ブラウザJavaScriptからのfetch操作の調査
  - [x] Content Scriptsからのfetch動作確認
    - Playwrightのpage.evaluate内でfetch成功
  - [x] DOMParserでのHTML解析動作確認
    - fetchしたHTMLをDOMParserでパース可能
  - [x] CORS制限がないことの確認
    - 同一オリジン内なので問題なし
  - [x] Chrome拡張での実装方針の確立
    - Content Scripts内でfetchとDOMParserを使用可能
- [x] 調査スクリプトの作成
  - [x] investigate-card-type-by-dom.js（DOM属性ベースのカードタイプ判定）
  - [x] investigate-ctype-parameter.js（ctypeパラメータ調査）
  - [x] test-correct-card-type-detection.js（カードタイプ判定テスト）
  - [x] dump-search-page-html.js（ページHTML構造確認）
  - [x] simple-ctype-check.js（ctypeフィールド確認）
  - [x] check-ctype-form.js（ctypeフォーム構造確認）
- [x] ドキュメント更新
  - [x] docs/research/api-investigation-results.md
    - カード検索機能セクションを追加
    - ctypeパラメータの詳細
    - カードタイプ判定方法（推奨・非推奨）
    - ブラウザJavaScriptからのfetch操作
    - 調査日時の更新（2025-11-04）
- [x] タスク管理ファイルの更新
  - [x] tasks/wip.md - 今回の調査完了を記録
  - [x] tasks/done.md - 完了タスクとして追加

## Chrome拡張の基盤実装（TDD）（2025-11-04 完了）
- [x] TDD環境のセットアップ
  - [x] Jest設定ファイルの作成（jest.config.js）
  - [x] TypeScript設定の更新（@typesの追加）
  - [x] パスマッピングの設定（@/* → src/*）
  - [x] テスト実行環境の確認（48テストすべてパス）
- [x] 型定義の実装（extension/src/types/）
  - [x] CardType、CardInfo、DeckCard型の定義
  - [x] CardTypeFields型の定義（カードタイプ別フィールドマッピング）
  - [x] DeckInfo、OperationResult型の定義
  - [x] SessionInfo型の定義（cgid、ytkn）
- [x] カードタイプ判定関数の実装（extension/src/content/card/detector.ts）
  - [x] テスト作成（14テスト、全パス）
  - [x] DOM属性ベースの判定実装（img src属性を使用）
  - [x] ロケール非依存の実装確認
  - [x] 7種類の属性アイコン対応（光、闇、水、炎、地、風、神）
- [x] セッション情報取得関数の実装（extension/src/content/session/session.ts）
  - [x] テスト作成（9テスト、全パス）
  - [x] getCgid関数の実装（Cookieから取得）
  - [x] getYtkn関数の実装（DOMから取得）
- [x] HTMLパーサー関数の実装（extension/src/content/parser/deck-parser.ts）
  - [x] テスト作成（8テスト、全パス）
  - [x] parseCardRow関数の実装（カード行→DeckCard）
  - [x] parseDeckPage関数の実装（ページ全体→DeckInfo）
  - [x] カードタイプ別フィールドマッピングの実装
  - [x] メイン・エクストラ・サイドデッキの抽出
- [x] デッキ操作API関数の実装（extension/src/api/deck-operations.ts）
  - [x] テスト作成（8テスト、全パス）
  - [x] createNewDeck関数（ope=6）
  - [x] duplicateDeck関数（ope=8）
  - [x] saveDeck関数（ope=3）
  - [x] deleteDeck関数（ope=7）
  - [x] FormData構築処理（カードタイプ別フィールド対応）
- [x] カード検索API関数の実装（extension/src/api/card-search.ts）
  - [x] テスト作成（9テスト、全パス）
  - [x] searchCardsByName関数（キーワード検索）
  - [x] searchCardById関数（ID検索）
  - [x] ctypeパラメータ対応（モンスター=1、魔法=2、罠=3）
  - [x] 検索結果パース処理（parseSearchResults）

## cgid取得の重大な問題発見と修正（2025-11-04）
- [x] HttpOnly属性によるcookie読み取り不可の発見
  - [x] `yugiohdb_cgid`はHttpOnly属性付きでJavaScriptから読み取り不可
  - [x] `document.cookie`からのcgid取得が最初から不可能だったことを確認
- [x] getCgid関数の実装修正（session.ts）
  - [x] cookieからの取得方法を削除
  - [x] HTMLからの取得に変更
    - hidden inputからの取得
    - リンクのhref属性からの取得
    - HTML全体から正規表現で抽出
  - [x] 実際の動作確認（cgid: 3d839f01a4d87b01928c60f262150bec取得成功）
- [x] テストの修正
  - [x] cookie関連のテストを削除
  - [x] DOM要素からの取得テストに変更
  - [x] 5つの新しいテストケース作成
- [x] カード検索でのcgid不要性の確認
  - [x] URLSearchParams + `credentials: 'include'`のみで動作
  - [x] cgidパラメータ不要
  - [x] デッキ操作ではcgidが必要（URLパラメータとして）

## テストUIの実装と動作確認（2025-11-04）
- [x] テストUI実装（extension/src/content/test-ui/index.ts）
  - [x] #/ytomo/test URLでの起動
  - [x] div#bgの内容書き換えによる表示
  - [x] 5つのテストセクション作成
  - [x] 8つのテストボタン配置
- [x] ページちらつき問題の修正
  - [x] document.body.innerHTML書き換えによる問題発見
  - [x] div#bgのみ書き換える方式に修正
  - [x] 公式サイトSPAとの競合解消
- [x] build & deploy
  - [x] TypeScriptコンパイル
  - [x] rsyncでデプロイ先に配置
- [x] 実際の動作確認
  - [x] テストUI表示確認（✅）
  - [x] カード検索動作確認（✅ 10件取得）
  - [x] cgid取得動作確認（✅ HTMLから取得）
  - [x] スクリーンショット撮影（tmp/test-ui-actual.png）

## 調査スクリプトの作成（2025-11-04）
- [x] tmp/check-all-cookies.js（すべてのcookie詳細確認）
  - HttpOnly属性の確認
  - yugiohdb_cgidがHttpOnlyであることを特定
  - HTML内のcgid埋め込み箇所の発見
- [x] tmp/test-getcgid-fixed.js（修正後のgetCgid動作確認）
- [x] tmp/test-simple-card-search.js（シンプルなカード検索）
- [x] tmp/test-ui-actual.js（テストUI総合動作確認）
- [x] tmp/test-without-cgid-param.js（cgidパラメータ不要性確認）

## カード検索API修正とビルドシステム修正（2025-11-04 完了）
- [x] カード検索APIの重大な問題発見と修正
  - [x] 問題1: APIパラメータの不足
    - `request_locale: 'ja'`を使用していたが、実際には不要
    - 必須パラメータ不足: `sess`, `stype`, `othercon`, `link_m`
    - 空パラメータ（starfr, starto等）も必要
  - [x] 問題2: DOM セレクタの誤り
    - input要素は`name`属性ではなく`class`属性を使用
    - `input[name="cid"]` → `input.cid` に修正
    - `input[name="img_no"]` → `input.lang` に修正
  - [x] 修正実施（extension/src/api/card-search.ts）
    - searchCardsByName関数のパラメータ修正
    - parseSearchResultRow関数のセレクタ修正
- [x] ビルドシステムの重大な問題発見と修正
  - [x] 問題: TypeScript出力構造とデプロイスクリプトの不一致
    - tsconfig.jsonのoutDirが`./dist`だが、deploy.shは`extension/dist/`を期待
    - rootDirが`.`だったため、`extension/dist/src/`のようなネスト構造が生成
    - manifest.jsonのファイルパスが実際の出力と不一致
  - [x] 修正実施
    - tsconfig.json: rootDir=`./src`, outDir=`./extension/dist`に変更
    - package.json: copy-filesスクリプトを修正
    - manifest.json: ファイルパスを実際の出力構造に合わせて修正
      - content.js → content/index.js
      - background.js → background/index.js
      - popup.html → popup/popup.html
- [x] 検証作業
  - [x] tmp/test-card-search-api-direct.js（API直接テスト、10件成功）
  - [x] tmp/inspect-card-row-html.js（HTML構造調査）
  - [x] tmp/test-fixed-card-search-debug.js（デバッグ版テスト）
  - [x] tmp/test-final-card-search.js（最終版テスト）
  - [x] ビルド成功確認（extension/dist/に正しい構造で出力）
  - [x] デプロイ成功確認（/home/tomo/user/Mine/_chex/src_ygoNeuronHelperに配置）
- [x] 調査結果のドキュメント化
  - カード検索結果のHTML構造（tmp/card-search-result.html保存）
  - input要素の実際の構造確認（class属性使用、name属性なし）
  - 正しいセレクタの特定

## ESモジュールエラーの修正とポストビルドシステムの構築（2025-11-04 完了）
- [x] 問題発見: Chrome拡張でのESモジュール構文エラー
  - [x] ユーザー報告: `Uncaught SyntaxError: Unexpected token 'export' (at index.js:84:1)`
  - [x] 原因特定: TypeScriptがコンパイル時に追加する`export {}`がChrome拡張で問題を引き起こす
  - [x] 調査: Playwrightを使用した拡張機能ロードテストを実施
- [x] 最初の修正試行: manifest.jsonに`"type": "module"`を追加
  - [x] Content Scriptに`"type": "module"`を追加
  - [x] Background Service Workerにも`"type": "module"`を追加
  - [x] 結果: Playwrightが使用するChromiumのバージョンで十分にサポートされず、エラーが継続
- [x] 最終的な解決策: ポストビルドスクリプトによる`export {}`の削除
  - [x] scripts/post-build.js の作成
    - `export {};`を自動的に削除するスクリプト
    - extension/dist/内のすべてのJSファイルを再帰的に処理
  - [x] package.jsonのビルドスクリプトを更新
    - `npm run build`に`npm run post-build`を追加
  - [x] manifest.jsonから`"type": "module"`を削除
    - Background Service Worker設定から削除
    - Content Scripts設定から削除
- [x] 検証作業
  - [x] tmp/verify-extension-loads.js（初期テスト）
  - [x] tmp/verify-extension-loads-fresh.js（フレッシュプロファイルでのテスト）
  - [x] ビルド成功確認（3つのファイルから`export {}`削除）
    - background/index.js
    - content/index.js
    - popup/index.js
  - [x] 拡張機能ロード成功確認
    - Content Script正常ロード確認
    - コンソールログ出力確認: "Yu-Gi-Oh! Deck Helper: Content script loaded"
    - "Detected card search page"表示確認
  - [x] エラー解消確認: `Unexpected token 'export'`エラーが完全に解消
- [x] デプロイ成功確認
  - /home/tomo/user/Mine/_chex/src_ygoNeuronHelperに正しく配置
  - manifest.jsonも正しく更新

## Webpackビルドシステムへの移行と拡張機能ロード問題の解決（2025-11-04 完了）
- [x] Webpackビルドシステムの導入
  - [x] extension/でwebpackを使用してビルド
  - [x] TypeScriptコンパイルエラーの修正
    - `DOM.Iterable`をlib配列に追加（tsconfig.json）
    - `match[1]`の型ミスマッチ修正（`?? null`追加）
  - [x] webpack.config.jsの確認
    - entry point: `./src/content/test-ui/index.ts`
    - output: `extension/dist/`にフラット構造で出力
  - [x] ビルド成功確認（content.js: 13 KB）
- [x] manifest.jsonのパス修正
  - [x] フラット構造への変更
    - `content/index.js` → `content.js`
    - `background/index.js` → `background.js`
    - `popup/popup.html` → `popup.html`
  - [x] 正しいファイルパスの確認
- [x] Google Chromeでの拡張機能ロード問題の発見
  - [x] 問題発見: Google Chromeが`--load-extension`フラグを**無視**する
    - Chromeログ: `WARNING: --load-extension is not allowed in Google Chrome, ignoring.`
  - [x] chrome://extensions/ページで拡張機能が表示されないことを確認
  - [x] start-chrome.shスクリプトは正しく設定されているが、Google Chromeでは動作しない
- [x] Playwright persistentContextによる解決
  - [x] `chromium.launchPersistentContext`を使用
  - [x] 引数に`--disable-extensions-except`と`--load-extension`を指定
  - [x] tmp/test-with-persistent-context.jsの作成
  - [x] テスト実行成功
    - ✅ Content Scriptが正常にロード
    - ✅ デバッグマーカー（緑色の"Yu-Gi-Oh! Extension Loaded!"）が表示
    - ✅ Test UIが正常に表示
- [x] 動作確認
  - [x] #/ytomo/test URLでTest UIが表示されることを確認
  - [x] 5つのテストセクションが表示
    - セッション情報（cgid取得、ytkn取得）
    - カード検索（入力フィールドとドロップダウン）
    - デッキ操作（新規作成、複製、削除）
    - デッキ保存（デッキ番号とデッキ名）
    - カードタイプ判定テスト
  - [x] スクリーンショット保存（tmp/test-page-persistent.png）
- [x] 今後の方針の確立
  - テスト環境: Playwright persistentContextを使用
  - 本番環境: chrome://extensions/から手動でロード
  - 開発環境: Chromiumのインストールも検討可能

## Chromiumへの移行と拡張機能ロード成功（2025-11-05 09:15完了）
- [x] Google Chromeでの拡張機能ロード問題の発見
  - [x] `--load-extension`フラグが無視される仕様を確認
  - [x] ログに`WARNING: --load-extension is not allowed in Google Chrome, ignoring.`を発見
- [x] Chromiumのインストールと環境構築
  - [x] `chromium-browser`をインストール
  - [x] `scripts/debug/setup/start-chrome.sh`をChromium用に修正
  - [x] `scripts/debug/setup/stop-chrome.sh`をChromium用に修正
- [x] Chromiumでの拡張機能ロード成功
  - [x] `--load-extension`が正常に動作
  - [x] デバッグマーカー "Yu-Gi-Oh! Extension Loaded!" の表示確認
  - [x] Content Scriptの正常実行確認
- [x] テストページでの機能テスト
  - [x] テストUI表示成功（`#/ytomo/test`）
  - [x] カード検索機能動作確認（✅ 成功）
  - [x] カードタイプ判定動作確認（✅ 成功）
  - [x] セッション情報取得テスト（⚠️ 部分的に失敗）
- [x] テスト結果の記録
  - [x] `tmp/test-summary.md`の作成
  - [x] スクリーンショット保存（5枚）
- [x] ドキュメント整備
  - [x] `CLAUDE.md`の作成（ブラウザ制御方針を明記）
  - [x] `version.dat`の作成（0.1.0）
  - [x] `tasks/wip.md`の更新

## テストページでの初期動作確認（2025-11-04 20:30完了）
- [x] テストページ全ボタンの自動テスト実施
  - [x] tmp/test-all-buttons.jsの作成
  - [x] 8つの機能ボタンを順次テスト
  - [x] スクリーンショット保存（tmp/test-all-buttons-result.png）
- [x] テスト結果の分析
  - [x] ✅ カードタイプ判定：正常動作（モンスター・魔法・罠すべて正しく判定）
  - [x] ❌ cgid取得：not found（テストページに認証情報なし）
  - [x] ❌ ytkn取得：not found（テストページに認証情報なし）
  - [x] ❌ カード検索：0件（認証情報不足）
  - [x] ❌ デッキ操作：cgid不足でエラー
- [x] 根本原因の特定
  - [x] テストページ（#/ytomo/test）は拡張機能が作成した仮想ページ
  - [x] 実際のページではないため、hidden inputやcookieにセッション情報が存在しない
  - [x] 認証情報なしではカード検索やデッキ操作が不可能
- [x] 解決方針の決定
  - [x] ログイン済みセッションの作成が必要
  - [x] tmp/open-browser-for-login.jsの作成
  - [x] Playwright persistentContextで永続プロファイルを使用
  - [x] ユーザーが手動でログイン→セッションを保存

## intro.md機能実装状況の整理と残調査の完了（2025-11-06 12:00完了）
- [x] intro.md機能実装状況マップの作成
  - [x] tmp/wip/intro-implementation-status.mdの作成
  - [x] intro.mdの各機能（10項目）について詳細な実装ガイドを記載
  - [x] 判明している情報、実装例、参照ドキュメントを整理
  - [x] 残調査項目の特定
- [x] tasks/ファイルの更新
  - [x] tasks/todo.mdの更新（残調査項目を優先度別に整理）
  - [x] tasks/wip.mdの更新（現在の作業状況を反映）
- [x] カード詳細ページの完全調査
  - [x] URL形式の確認
    - ✅ `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid={カードID}&request_locale=ja`
  - [x] cidからのURL生成方法の確認
    - ✅ 単純な文字列結合で可能
  - [x] カード画像の高解像度版取得方法の調査
    - [x] tmp/investigate-card-image.jsの作成と実行
    - [x] tmp/verify-image-sizes.jsの作成と実行
    - [x] tmp/check-actual-image-size.jsの作成と実行
    - ✅ 画像サイズは200x290ピクセル固定
    - ❌ 高解像度版は存在しない（type=1とtype=2は同じ）
    - ✅ encパラメータは省略可能
  - [x] 調査結果のドキュメント化
    - [x] tmp/wip/card-detail-page-investigation.mdの作成
    - [x] tmp/wip/intro-implementation-status.mdの更新
    - [x] カード個別情報の項目を「完全に判明」に更新
- [x] 調査成果の最終確認
  - ✅ intro.mdの全機能（10項目）が実装可能な状態
  - ✅ 100%の機能で実装に必要な情報が揃った
  - ✅ 実装フェーズへの移行準備完了

## intro.md関数の実装と検証（2025-11-06 11:45完了）

### 実装フェーズ
- [x] TypeScript型定義の実装（extension/src/types/）
  - card.ts: CardInfo, CardType, CardTypeFields
  - deck.ts: DeckInfo, DeckData, DeckOperationResult
  - session.ts: SessionInfo
- [x] セッション管理の実装（extension/src/content/session/session.ts）
  - getCgid(): ページからcgidを取得、キャッシュ機能付き
  - getYtkn(dno): デッキ編集ページからytknを取得
- [x] デッキ操作APIの実装（extension/src/api/deck-operations.ts）
  - createNewDeck(cgid): 新規デッキ作成（ope=6）
  - duplicateDeck(cgid, dno): デッキ複製（ope=8）
  - saveDeck(cgid, dno, deckData, ytkn): デッキ保存（ope=3）
  - deleteDeck(cgid, dno, ytkn): デッキ削除（ope=7）
  - appendCardToFormData(): カードタイプ別フィールドマッピング対応
- [x] カード検索APIの実装（extension/src/api/card-search.ts）
  - searchCardsByName(keyword, ctype?): キーワード検索
  - searchCardById(cardId): ID検索
  - parseSearchResults(doc): HTML解析
- [x] HTMLパーサーの実装（extension/src/content/parsers.ts）
  - DOMParserを使用したHTML解析
- [x] カードタイプ判定の実装（extension/src/content/card/detector.ts）
  - detectCardType(row): DOM属性ベース判定
  - ロケール非依存の実装
- [x] テストUIの実装（extension/src/content/test-ui/index.ts）
  - #/ytomo/test URLでテストページ表示
  - 8つのテスト機能ボタン
  - 結果表示エリア

### ビルド & デプロイ
- [x] webpack設定の確認（extension/webpack.config.js）
- [x] ビルド実行（npm run build）
- [x] デプロイスクリプト実行（bash scripts/deploy.sh）
  - デプロイ先: ~/user/Mine/_chex/src_ygoNeuronHelper

### 動作検証フェーズ

#### 環境セットアップ
- [x] Chromium起動スクリプトのパス修正
  - 問題発見: extension/dist を指定していたが正しくは ~/user/Mine/_chex/src_ygoNeuronHelper
  - scripts/debug/setup/start-chrome.sh を修正
- [x] Chromiumでの拡張機能ロード確認
  - デバッグマーカー "Yu-Gi-Oh! Extension Loaded!" が表示
  - Content Scriptが正常に実行

#### テスト実施
- [x] カードタイプ判定テスト ✅
  - モンスター: ✅ 正常判定
  - 魔法: ✅ 正常判定
  - 罠: ✅ 正常判定
- [x] カード検索APIテスト ✅
  - fetch API動作確認
  - DOMParser解析動作確認
- [x] セッション情報取得テスト ⚠️
  - cgid取得: 実装完了（ログイン後にテスト可能）
  - ytkn取得: 実装完了（ログイン後にテスト可能）
- [x] デッキ操作テスト ⚠️
  - 実装完了（ログイン後にテスト可能）

### ドキュメント作成
- [x] テストレポート作成（tmp/intro-functions-test-report.md）
  - 実装状況まとめ（100%完了）
  - 動作検証結果
  - 発見した問題と修正内容
  - 次のステップ

### 成果物
- **実装完了率**: 100% ✅
- **動作確認**: ログイン不要機能は検証済み、ログイン必要機能は実装完了
- **スクリーンショット**:
  - tmp/extension-check-final.png（拡張機能ロード確認）
  - tmp/intro-test-result.png（カードタイプ判定テスト）
  - tmp/intro-functions-verified.png（カード検索テスト）
- **テストスクリプト**:
  - tmp/check-chrome-extensions.js（拡張機能検出）
  - tmp/verify-extension-loaded.js（ロード状態確認）
  - tmp/test-intro-via-buttons.js（ボタンクリック形式テスト）
  - tmp/test-all-intro-functions.js（完全テスト）

### 残課題
- [ ] ログイン後の完全テスト（ユーザー操作が必要）
- [ ] E2Eテストの整備
- [ ] ユーザー向けREADMEの作成

---

## カード情報スクレイピング機能の完全実装（2025-11-06 完了）

### 提案書v3の作成
- [x] ユーザー指摘の反映
  - 不要な情報の削除（再構成可能な項目）
  - 追加情報の取得（ciid, img_hash, ペンデュラム情報）
  - 種族とタイプの分離
  - マップ定義方式の採用
- [x] 提案書v3の作成（tmp/wip/card-scraping-proposal-v3.md）
  - 識別子ベースのデータ管理
  - `as const`と`keyof typeof`による型自動生成
  - HTMLテキスト→識別子への変換マップ

### 実装
- [x] マップ定義ファイルの作成（types/card-maps.ts）
  - ATTRIBUTE_MAP: 属性マップ（7種類）
  - RACE_MAP: 種族マップ（25種類）
  - MONSTER_TYPE_MAP: モンスタータイプマップ（15種類）
  - SPELL_EFFECT_TYPE_MAP: 魔法効果種類マップ（6種類）
  - TRAP_EFFECT_TYPE_MAP: 罠効果種類マップ（3種類）
  - 逆引きマップの生成（TEXT_TO_ID）
- [x] 型定義の更新（types/card.ts）
  - CardBase: 共通情報（ciid, imgHash追加）
  - MonsterCard: 識別子ベース（race, types配列化、ペンデュラム情報追加）
  - SpellCard: 識別子ベース（effectType）
  - TrapCard: 識別子ベース（effectType）
- [x] パーサー関数の実装（api/card-search.ts）
  - parseCardBase(): 共通情報抽出
  - parseSpeciesAndTypes(): 種族・タイプのパースと変換
  - parseMonsterCard(): モンスター固有情報抽出
  - parseSpellCard(): 魔法固有情報抽出
  - parseTrapCard(): 罠固有情報抽出
  - HTMLテキスト→識別子への変換処理
- [x] 既存コードの更新
  - api/deck-operations.ts: DeckCard型対応
  - content/parser/deck-parser.ts: 新型定義対応
  - content/test-ui/index.ts: テストデータ更新
  - __tests__/*.test.ts: テストコード更新

### ビルドとデプロイ
- [x] TypeScriptコンパイル成功
- [x] webpackビルド成功
- [x] デプロイ完了（~/user/Mine/_chex/src_ygoNeuronHelper）

### 成果物
- **マップ定義**: 56種類の識別子定義（属性7、種族25、モンスタータイプ15、魔法6、罠3）
- **型安全性**: 完全な型チェック、識別子のタイポ防止
- **国際化対応**: マップを差し替えるだけで多言語対応可能
- **データ正規化**: 文字列の揺れがない、検索・フィルタリングが効率的

### 技術的特徴
- `as const`による型リテラル化
- `keyof typeof`による型の自動生成
- `Object.fromEntries`による逆引きマップの生成
- 構造ベースのカード判定（HTML構造から属性・レベル種別を判定）
- 未知の値の警告機能（console.warn）


---

## カード情報スクレイピング機能の検証と修正（2025-11-06）

### 実施内容
1. **日本語モードでの動作確認**
   - [x] Chrome拡張の日本語モード切り替え（`request_locale=ja`）
   - [x] 様々なカードタイプでの検索テスト実行
   - [x] マップ定義の完全性確認（未知の値なし）

2. **フィールド存在確認とセレクタ修正**
   - [x] ペンデュラム関連セレクタの修正
     - 誤: `.box_card_pendulum_scale` / `.box_card_pendulum_effect`
     - 正: `.box_card_pen_scale` / `.box_card_pen_effect`
   - [x] 実際のHTMLからペンデュラム情報の正常取得確認

3. **ciid/imgHash取得ロジックの実装**
   - [x] HTMLのJavaScriptコードからの画像URL情報抽出
   - [x] 正規表現パターンによるciid/imgHashの解析
     - パターン: `/get_image\.action\?.*cid=(\d+)(?:&ciid=(\d+))?(?:&enc=([^&'"\s]+))?/g`
   - [x] `extractImageInfo`関数の実装
   - [x] `parseCardBase`と`parseSearchResultRow`の修正（imageInfoMap対応）

4. **全フィールドの動作確認**
   - [x] ciid: ✅ 取得成功（例: "1"）
   - [x] imgHash: ✅ 取得成功（例: "ixM9cUpGwT8_wcEF5XNJQw"）
   - [x] pendulumScale: ✅ 取得成功（例: 5）
   - [x] pendulumEffect: ✅ 取得成功（全文）

### 修正ファイル
- `extension/src/api/card-search.ts`
  - extractImageInfo関数追加（HTMLからciid/imgHash抽出）
  - parseSearchResults関数修正（画像情報マップ生成）
  - parseCardBase関数修正（画像情報マップから取得）
  - parseSearchResultRow関数修正（引数追加）
  - ペンデュラムセレクタ修正（2箇所）

### ビルドとデプロイ
- [x] TypeScriptコンパイル成功
- [x] webpackビルド成功（content.js: 20KB）
- [x] デプロイ完了（~/user/Mine/_chex/src_ygoNeuronHelper）
- [x] Chrome拡張の再起動と動作確認

### テスト結果
- **検索成功率**: 100%（全カードタイプで正常動作）
- **未知の値**: 0件（マップ定義が完全）
- **フィールド取得**: 100%（ciid, imgHash, pendulum情報すべて取得成功）

### バージョン更新
- v0.1.0 → v0.2.0（新機能の追加: ciid/imgHash取得）

