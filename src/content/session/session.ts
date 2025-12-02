import {
  createNewDeckInternal,
  saveDeckInternal,
  deleteDeckInternal,
  getDeckListInternal
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
    console.log('[ensureCgid] Looking for mydeckLink with selector a[href*="member_deck.action"][href*="cgid="]');
    console.log('[ensureCgid] mydeckLink found:', !!mydeckLink);

    if (mydeckLink) {
      const match = mydeckLink.href.match(/cgid=([a-f0-9]{32})/);
      console.log('[ensureCgid] mydeckLink.href:', mydeckLink.href);
      console.log('[ensureCgid] cgid match:', !!match && match[1]);
      if (match && match[1]) {
        this.cgid = match[1];
        console.log('[ensureCgid] cgid found from footer link:', this.cgid.substring(0, 16) + '...');
        return this.cgid;
      }
    }

    // フッター以外の任意のcgidリンクからも取得を試みる
    const anyLink = document.querySelector<HTMLAnchorElement>('a[href*="cgid="]');
    console.log('[ensureCgid] Looking for anyLink with selector a[href*="cgid="]');
    console.log('[ensureCgid] anyLink found:', !!anyLink);
    if (anyLink) {
      const match = anyLink.href.match(/cgid=([a-f0-9]{32})/);
      console.log('[ensureCgid] anyLink.href:', anyLink.href);
      if (match && match[1]) {
        this.cgid = match[1];
        console.log('[ensureCgid] cgid found from page link:', this.cgid.substring(0, 16) + '...');
        return this.cgid;
      }
    }

    console.log('[ensureCgid] cgid not found - throwing error');
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
  private async fetchYtkn(cgid: string, dno: number, request_locale: string): Promise<string | null> {
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
    const cgid = await this.ensureCgid();
    // CSRFトークンは使い捨てのため毎回新規取得
    const ytkn = await this.fetchYtkn(cgid, dno, 'request_locale=ja');
    if (!ytkn) {
      throw new Error('ytkn not found for saveDeck');
    }
    return saveDeckInternal(cgid, dno, deckData, ytkn);
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
