/**
 * Window オブジェクトの拡張定義
 *
 * プロジェクト固有のグローバル変数を型安全に管理するための型定義
 */

import type { AppSettings } from './settings';
import type { DeckInfo } from './deck';

declare global {
  interface Window {
    /**
     * 言語切り替え関数
     * 公式サイトの言語変更を実行し、拡張機能の状態を同期する
     */
    ygoChangeLanguage?: (lang: string) => void;

    /**
     * 現在の拡張機能設定のキャッシュ
     * パフォーマンス最適化のため、chrome.storage.local からの読み取りを減らす
     */
    ygoNextCurrentSettings?: AppSettings;

    /**
     * プリロードされたデッキ詳細データ
     * バックグラウンドスクリプトで事前取得されたデッキ情報
     */
    ygoNextPreloadedDeckDetail?: DeckInfo | null;

    /**
     * デッキ詳細プリロードのPromise
     * getDeckDetail の完了を待てるようにする
     */
    ygoNextPreloadedDeckDetailPromise?: Promise<void> | null;

    /**
     * プリロードされたデッキ一覧データ
     * バックグラウンドスクリプトで事前取得されたデッキリスト
     */
    ygoNextPreloadedDeckList?: unknown;

    /**
     * プリロードされたytkn（CSRFトークン）
     * 編集ページで事前取得されたytknをキャッシュ
     */
    ygoNextPreloadedYtkn?: string | null;

    /**
     * ytkn取得のPromise
     * loadDeck と同様に、ytkn取得を待機できるようにする
     */
    ygoNextPreloadedYtknPromise?: Promise<void> | null;

    /**
     * loader.js（先行ローダー）のフェイルセーフ状態機械: 評価開始通知
     * content.js モジュール評価冒頭に呼ぶ。フェイルセーフタイマーは解除されず
     * カウントダウンが1回再始動されるのみ（loaderがytomo系hashでのみ登録）
     */
    __ygoNextLoaderNotifyStart?: () => void;

    /**
     * loader.js（先行ローダー）のフェイルセーフ状態機械: 引き継ぎ成功通知
     * loader由来の early-hide/overlay の引き継ぎが確定した時点で呼び、
     * フェイルセーフタイマーを解除する（loaderがytomo系hashでのみ登録）
     */
    __ygoNextLoaderHandoff?: () => void;
  }
}

export {};
