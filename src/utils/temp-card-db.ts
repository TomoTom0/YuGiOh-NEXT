/**
 * 一時的なカード情報データベース
 * デッキ編集中のセッションでカード情報を一元管理する
 */

import type { CardInfo } from '../types/card';

/**
 * TempCardDB - カード情報の一時的なキャッシュ
 * cidをキーとしてCardInfoを保持する
 */
export class TempCardDB {
  private cards: Map<string, CardInfo> = new Map();

  /**
   * カード情報を取得
   * @param cid カードID
   * @returns カード情報、存在しない場合はundefined
   */
  get(cid: string): CardInfo | undefined {
    return this.cards.get(cid);
  }

  /**
   * カード情報を設定
   * @param cid カードID
   * @param card カード情報
   */
  set(cid: string, card: CardInfo): void {
    this.cards.set(cid, card);
  }

  /**
   * カード情報が存在するか確認
   * @param cid カードID
   * @returns 存在する場合true
   */
  has(cid: string): boolean {
    return this.cards.has(cid);
  }

  /**
   * カード情報を削除
   * @param cid カードID
   * @returns 削除された場合true
   */
  delete(cid: string): boolean {
    return this.cards.delete(cid);
  }

  /**
   * 全てのカード情報をクリア
   */
  clear(): void {
    this.cards.clear();
  }

  /**
   * 保持しているカード数を取得
   */
  get size(): number {
    return this.cards.size;
  }

  /**
   * 全てのカードIDを取得
   */
  keys(): IterableIterator<string> {
    return this.cards.keys();
  }

  /**
   * 全てのカード情報を取得
   */
  values(): IterableIterator<CardInfo> {
    return this.cards.values();
  }

  /**
   * 全てのエントリを取得
   */
  entries(): IterableIterator<[string, CardInfo]> {
    return this.cards.entries();
  }

  /**
   * DeckCardRefから画像URLを取得するためのヘルパー
   * @param cid カードID
   * @param ciid 画像識別子
   * @returns 画像ハッシュ、見つからない場合はundefined
   */
  getImageHash(cid: string, ciid: string): string | undefined {
    const card = this.cards.get(cid);
    if (!card) return undefined;

    const imgInfo = card.imgs.find(img => img.ciid === ciid);
    return imgInfo?.imgHash;
  }

  /**
   * 複数のカード情報を一括登録
   * @param cards cidとCardInfoのペア配列
   */
  setMany(cards: Array<[string, CardInfo]>): void {
    for (const [cid, card] of cards) {
      this.cards.set(cid, card);
    }
  }

  /**
   * Map形式でエクスポート（デバッグ用）
   */
  toMap(): Map<string, CardInfo> {
    return new Map(this.cards);
  }
}

// シングルトンインスタンス（デッキ編集セッション用）
let instance: TempCardDB | null = null;

/**
 * TempCardDBのシングルトンインスタンスを取得
 */
export function getTempCardDB(): TempCardDB {
  if (!instance) {
    instance = new TempCardDB();
  }
  return instance;
}

/**
 * TempCardDBのシングルトンインスタンスをリセット
 * 新しいデッキを読み込む際などに使用
 */
export function resetTempCardDB(): void {
  if (instance) {
    instance.clear();
  }
  instance = new TempCardDB();
}
