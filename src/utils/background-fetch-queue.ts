/**
 * バックグラウンドでカード詳細情報を非同期に取得するためのキューシステム
 *
 * 機能：
 * - 複数カードの優先度付きキューイング
 * - 並行リクエスト数の制限（3-5並行）
 * - リトライロジック（失敗時の再試行）
 * - UI反応性への配慮（ユーザー操作を優先）
 */

import { getCardDetail } from '../api/card-search';
import type { MonsterCard, SpellCard, TrapCard } from '../types/card';

export type CardInfo = MonsterCard | SpellCard | TrapCard;

/** キューの優先度 */
export type QueuePriority = 'high' | 'normal' | 'low';

/** キュー内のアイテム */
interface QueueItem {
  cardId: string;
  priority: QueuePriority;
  retryCount: number;
  maxRetries: number;
  onComplete: (result: CardInfo | null) => void;
  onError?: (error: Error) => void;
}

/** バックグラウンド取得キューのシングルトンインスタンス */
let queueInstance: BackgroundFetchQueue | null = null;

/**
 * バックグラウンド取得キュー
 */
class BackgroundFetchQueue {
  private queue: QueueItem[] = [];
  private activeRequests: Map<string, Promise<void>> = new Map();
  private maxConcurrent = 3;
  private isProcessing = false;
  private retryDelay = 5000; // 5秒

  /** キューにアイテムを追加 */
  enqueue(
    cardId: string,
    priority: QueuePriority = 'normal',
    onComplete: (result: CardInfo | null) => void,
    onError?: (error: Error) => void
  ): void {
    // 同じカードIDが既にキューまたは処理中なら無視
    if (
      this.queue.some(item => item.cardId === cardId) ||
      this.activeRequests.has(cardId)
    ) {
      return;
    }

    const item: QueueItem = {
      cardId,
      priority,
      retryCount: 0,
      maxRetries: 2,
      onComplete,
      onError
    };

    this.queue.push(item);
    this.sortQueue();
    this.processQueue();
  }

  /** キューを優先度でソート */
  private sortQueue(): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    this.queue.sort(
      (a, b) =>
        priorityOrder[a.priority] - priorityOrder[b.priority] ||
        this.queue.indexOf(a) - this.queue.indexOf(b)
    );
  }

  /** キューを処理 */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (
        this.queue.length > 0 &&
        this.activeRequests.size < this.maxConcurrent
      ) {
        const item = this.queue.shift();
        if (!item) break;

        // 非アクティブ化に向けてrequestIdを生成
        const requestId = `${item.cardId}`;
        const promise = this.fetchCard(item).then(() => {
          this.activeRequests.delete(requestId);
        });

        this.activeRequests.set(requestId, promise);

        // 次のアイテムの処理を直ぐに開始
        setImmediate(() => this.processQueue());

        // UI反応性への配慮：リクエスト間に小さな遅延を入れる
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessing = false;
      // キューに残りがあれば再度処理開始
      if (this.queue.length > 0 && this.activeRequests.size < this.maxConcurrent) {
        this.processQueue();
      }
    }
  }

  /** 個別カードを取得 */
  private async fetchCard(item: QueueItem): Promise<void> {
    try {
      const result = await getCardDetail(item.cardId);
      if (result) {
        item.onComplete(result as any);
      } else {
        item.onComplete(null);
      }
    } catch (error) {
      if (item.retryCount < item.maxRetries) {
        item.retryCount++;
        // リトライの場合は待機してからキューに戻す
        await new Promise(resolve =>
          setTimeout(resolve, this.retryDelay * Math.pow(2, item.retryCount - 1))
        );
        this.queue.push(item);
        this.sortQueue();
        this.processQueue();
      } else {
        const err = error instanceof Error ? error : new Error(String(error));
        item.onError?.(err);
      }
    }
  }

  /** キューをクリア */
  clear(): void {
    this.queue = [];
  }

  /** キューのサイズを取得 */
  size(): number {
    return this.queue.length;
  }

  /** アクティブなリクエスト数を取得 */
  activeCount(): number {
    return this.activeRequests.size;
  }
}

/**
 * グローバルなバックグラウンド取得キューのインスタンスを取得
 */
export function getBackgroundFetchQueue(): BackgroundFetchQueue {
  if (!queueInstance) {
    queueInstance = new BackgroundFetchQueue();
  }
  return queueInstance;
}
