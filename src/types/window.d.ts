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
  }
}

export {};
