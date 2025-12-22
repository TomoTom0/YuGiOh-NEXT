import {
  createNewDeckInternal,
  saveDeckInternal,
  deleteDeckInternal,
  getDeckListInternal,
  issueDeckCodeInternal
} from '@/api/deck-operations';
import { fetchYtknFromEditForm } from '@/utils/ytkn-fetcher';
import type { DeckInfo, DeckListItem, OperationResult } from '@/types/deck';

/**
 * セッション管理クラス
 *
 * cgidを内部管理し、デッキ操作の統一インターフェースを提供する
 */
class SessionManager {
  private cgid: string | null = null;

  /**
   * cgidを取得（キャッシュあり）
   */
  private async ensureCgid(): Promise<string> {
    if (this.cgid) {
      return this.cgid;
    }

    // フッターの「マイデッキ」リンクからcgidを取得
    const mydeckLink = document.querySelector<HTMLAnchorElement>('a[href*="member_deck.action"][href*="cgid="]');
    if (mydeckLink) {
      const match = mydeckLink.href.match(/cgid=([a-f0-9]{32})/);
      if (match && match[1]) {
        this.cgid = match[1];
        return this.cgid;
      }
    }

    // フッター以外の任意のcgidリンクからも取得を試みる
    const anyLink = document.querySelector<HTMLAnchorElement>('a[href*="cgid="]');
    if (anyLink) {
      const match = anyLink.href.match(/cgid=([a-f0-9]{32})/);
      if (match && match[1]) {
        this.cgid = match[1];
        return this.cgid;
      }
    }

    throw new Error('cgid not found in page');
  }

  /**
   * ytknを取得（CSRFトークンのため毎回新規取得）
   *
   * @param cgid ユーザー識別子
   * @param dno デッキ番号
   * @param request_locale リクエストロケール（例: 'request_locale=ja'）
   * @returns ytkn、取得失敗時はnull
   */
  private async fetchYtkn(cgid: string, dno: number, _request_locale: string): Promise<string | null> {
    // 共通util関数を使用（buildApiUrl経由で自動で request_locale が付与される）
    const { detectCardGameType } = await import('@/utils/page-detector');
    const gameType = detectCardGameType();
    return fetchYtknFromEditForm(cgid, dno, gameType);
  }

  /**
   * cgidを取得（テスト用の公開メソッド）
   */
  async getCgid(): Promise<string> {
    return this.ensureCgid();
  }

  /**
   * 新規デッキを作成
   *
   * @returns 新しいデッキ番号、失敗時は0
   */
  async createDeck(): Promise<number> {
    const cgid = await this.ensureCgid();
    return createNewDeckInternal(cgid);
  }


  /**
   * デッキを削除
   *
   * @param dno デッキ番号
   * @returns 成功時true、失敗時false
   */
  async deleteDeck(dno: number): Promise<boolean> {
    const cgid = await this.ensureCgid();
    return deleteDeckInternal(cgid, dno);
  }

  /**
   * デッキを保存
   *
   * @param dno デッキ番号
   * @param deckData デッキ情報
   * @returns 操作結果
   */
  async saveDeck(dno: number, deckData: DeckInfo): Promise<OperationResult> {
    const startTime = performance.now();

    const cgid = await this.ensureCgid();

    // プリロードされたytknを優先的に使用
    let ytkn: string | null = null;

    // ytkn取得のPromiseを待つ（最大1秒）
    if (window.ygoNextPreloadedYtknPromise && !window.ygoNextPreloadedYtkn) {
      try {
        await Promise.race([
          window.ygoNextPreloadedYtknPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('ytkn preload timeout')), 1000))
        ]);
      } catch (error) {
        console.warn('[SessionManager.saveDeck] ytkn preload wait failed or timed out:', error);
      }
      // 使用後は Promise を削除
      window.ygoNextPreloadedYtknPromise = null;
    }

    // プリロードされたytknを使用
    if (window.ygoNextPreloadedYtkn) {
      ytkn = window.ygoNextPreloadedYtkn;
      window.ygoNextPreloadedYtkn = null; // 使い捨てのため削除
      console.debug('[SessionManager.saveDeck] Using preloaded ytkn');
    }

    // プリロードがない場合は通常取得
    if (!ytkn) {
      const ytknStartTime = performance.now();
      ytkn = await this.fetchYtkn(cgid, dno, 'request_locale=ja');
      const ytknDuration = performance.now() - ytknStartTime;
      console.debug(`[SessionManager.saveDeck] ytkn取得時間（通常取得）: ${ytknDuration.toFixed(2)}ms`);
    }

    if (!ytkn) {
      throw new Error('ytkn not found for saveDeck');
    }

    const saveStartTime = performance.now();
    const result = await saveDeckInternal(cgid, dno, deckData, ytkn);
    const saveDuration = performance.now() - saveStartTime;
    console.debug(`[SessionManager.saveDeck] 保存API呼び出し時間: ${saveDuration.toFixed(2)}ms`);

    // 保存成功後、次回用のytknを非同期でプリロード（UIをブロックしない）
    if (result.success) {
      this.preloadNextYtkn(cgid, dno).catch(error => {
        console.warn('[SessionManager.saveDeck] Failed to preload next ytkn:', error);
      });
    }

    const totalDuration = performance.now() - startTime;
    console.debug(`[SessionManager.saveDeck] 合計時間: ${totalDuration.toFixed(2)}ms`);

    return result;
  }

  /**
   * 次回のセーブ用にytknを非同期でプリロード
   *
   * @param cgid ユーザー識別子
   * @param dno デッキ番号
   */
  private async preloadNextYtkn(cgid: string, dno: number): Promise<void> {
    try {
      const ytkn = await this.fetchYtkn(cgid, dno, 'request_locale=ja');
      window.ygoNextPreloadedYtkn = ytkn;
      console.debug('[SessionManager.preloadNextYtkn] Next ytkn preloaded');
    } catch (error) {
      console.warn('[SessionManager.preloadNextYtkn] Failed to preload:', error);
    }
  }

  /**
   * マイデッキ一覧を取得
   *
   * @returns デッキ一覧
   */
  async getDeckList(): Promise<DeckListItem[]> {
    const cgid = await this.ensureCgid();
    return getDeckListInternal(cgid);
  }

  /**
   * デッキのいいね数を取得
   *
   * TODO: 現在実装不可
   * JavaScriptが動的に生成するいいね数要素を取得する必要があり、
   * 静的なHTMLパースでは対応できません。
   * ブラウザ実行環境でDOMを操作して要素を取得する必要があります。
   *
   * @param dno デッキ番号
   * @returns いいね数、取得失敗時は0
   */
  async getDeckLikes(dno: number): Promise<number> {
    // TODO: 実装待ち
    return 0;
  }

  /**
   * デッキコードを発行
   *
   * 1. ope=13 でデッキコードを発行
   * 2. ope=1 で発行済みのデッキコードを取得
   *
   * @param dno デッキ番号
   * @returns デッキコード、発行失敗時は空文字列
   */
  async issueDeckCode(dno: number): Promise<string> {
    const cgid = await this.ensureCgid();
    return issueDeckCodeInternal(cgid, dno);
  }
}

/**
 * グローバルSessionManagerインスタンス
 */
export const sessionManager = new SessionManager();

/**
 * 後方互換性のため、getCgidをエクスポート
 * @deprecated sessionManager.getCgid()を使用してください
 */
export async function getCgid(): Promise<string | null> {
  try {
    return await sessionManager.getCgid();
  } catch (error) {
    console.error('[getCgid]', error);
    return null;
  }
}
