import axios from 'axios';
import {
  createNewDeckInternal,
  duplicateDeckInternal,
  saveDeckInternal,
  deleteDeckInternal,
  getDeckListInternal
} from '@/api/deck-operations';
import type { DeckInfo, DeckListItem, OperationResult } from '@/types/deck';

/**
 * セッション管理クラス
 *
 * cgidとytknを内部管理し、デッキ操作の統一インターフェースを提供する
 */
class SessionManager {
  private cgid: string | null = null;
  private ytknCache: Map<number, string> = new Map();

  /**
   * cgidを取得（キャッシュあり）
   */
  private async ensureCgid(): Promise<string> {
    if (this.cgid) {
      console.log('[SessionManager] Using cached cgid:', this.cgid.substring(0, 16) + '...');
      return this.cgid;
    }

    console.log('[SessionManager] Fetching cgid from page...');

    // フッターの「マイデッキ」リンクからcgidを取得
    const mydeckLink = document.querySelector<HTMLAnchorElement>('a[href*="member_deck.action"][href*="cgid="]');

    if (mydeckLink) {
      const match = mydeckLink.href.match(/cgid=([a-f0-9]{32})/);
      if (match && match[1]) {
        this.cgid = match[1];
        console.log('[SessionManager] ✅ cgid found from footer link');
        return this.cgid;
      }
    }

    // フッター以外の任意のcgidリンクからも取得を試みる
    const anyLink = document.querySelector<HTMLAnchorElement>('a[href*="cgid="]');
    if (anyLink) {
      const match = anyLink.href.match(/cgid=([a-f0-9]{32})/);
      if (match && match[1]) {
        this.cgid = match[1];
        console.log('[SessionManager] ✅ cgid found from page link');
        return this.cgid;
      }
    }

    throw new Error('cgid not found in page');
  }

  /**
   * ytknを取得（キャッシュあり）
   */
  private async ensureYtkn(dno: number, forceRefresh = false): Promise<string> {
    // キャッシュチェック（強制更新時はスキップ）
    if (!forceRefresh) {
      const cached = this.ytknCache.get(dno);
      if (cached) {
        console.log('[SessionManager] Using cached ytkn for dno:', dno);
        return cached;
      }
    }

    console.log('[SessionManager] Fetching ytkn for dno:', dno);

    const cgid = await this.ensureCgid();

    // デッキ編集ページを取得
    const url = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&dno=${dno}&cgid=${cgid}&request_locale=ja`;
    const response = await axios.get(url, {
      withCredentials: true
    });

    const html = response.data;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const input = doc.querySelector('input[name="ytkn"]') as HTMLInputElement;
    if (!input || !input.value) {
      throw new Error('ytkn not found in page');
    }

    const ytkn = input.value.trim();
    // forceRefreshの場合はキャッシュしない（CSRFトークンは使い捨て）
    if (!forceRefresh) {
      this.ytknCache.set(dno, ytkn);
    }
    console.log('[SessionManager] ✅ ytkn found for dno:', dno);

    return ytkn;
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
   * デッキを複製
   *
   * @param dno 複製元のデッキ番号
   * @returns 新しいデッキ番号、失敗時は0
   */
  async duplicateDeck(dno: number): Promise<number> {
    const cgid = await this.ensureCgid();
    return duplicateDeckInternal(cgid, dno);
  }

  async getYtkn(cgid: string, dno: number, request_locale: string): Promise<string | null> {
      // https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&wname=MemberDeck&cgid=3d839f01a4d87b01928c60f262150bec&dno=4&request_locale=ja
      const edit_url = `/yugiohdb/member_deck.action?ope=2&wname=MemberDeck&cgid=${cgid}&dno=${dno}&${request_locale}`;
      const doc = await axios.get(edit_url);
      const text = doc.data;
      // input#ytkn の値をparseで取得
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(text, 'text/html');
      const ytkn_input = htmlDoc.querySelector('input#ytkn') as HTMLInputElement | null;
      return ytkn_input ? ytkn_input.value : null;
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
    // 保存時は必ずytknを再取得（CSRFトークンは使い捨て）
    // const ytkn = await this.ensureYtkn(dno, true);
    const ytkn = await this.getYtkn(cgid, dno, 'request_locale=ja');
    if (!ytkn) {
      throw new Error('ytkn not found for saveDeck');
    }
    return saveDeckInternal(cgid, dno, deckData, ytkn);
  }

  /**
   * デッキを削除
   *
   * @param dno デッキ番号
   * @returns 操作結果
   */
  async deleteDeck(dno: number): Promise<OperationResult> {
    const cgid = await this.ensureCgid();
    const ytkn = await this.ensureYtkn(dno);
    const result = await deleteDeckInternal(cgid, dno, ytkn);

    // 削除成功時はキャッシュをクリア
    if (result.success) {
      this.ytknCache.delete(dno);
    }

    return result;
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
