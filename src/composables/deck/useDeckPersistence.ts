import { Ref } from 'vue';
import { DeckInfo, OperationResult } from '@/types/deck';
import { getDeckDetail as getDeckDetailAPI } from '@/api/deck-operations';
import { URLStateManager } from '@/utils/url-state';
import { recordDeckOpen } from '@/utils/temp-card-db';
import { useToastStore } from '@/stores/toast-notification';

/**
 * SessionManager のインターフェース（最小限の型定義）
 */
interface ISessionManager {
  getCgid(): Promise<string>;
  saveDeck(dno: number, deckInfo: DeckInfo): Promise<OperationResult>;
}

/**
 * デッキの永続化層を管理するComposable（Facade Pattern）
 *
 * 複数の副作用（API通信、Store更新、URL同期、ローカルストレージ更新、通知）を
 * 集約し、Store側にはシンプルなインターフェースのみを公開する。
 *
 * @param options 依存するStateと関数
 * @returns loadDeck, saveDeck 関数
 */
export function useDeckPersistence(options: {
  sessionManager: ISessionManager;
  deckInfo: Ref<DeckInfo>;
  lastUsedDno: Ref<number | null>;
  initializeDisplayOrder: () => void;
  clearHistory: () => void;
  captureDeckSnapshot: () => string;
  savedDeckSnapshot: Ref<string | null>;
}) {
  const {
    sessionManager,
    deckInfo,
    lastUsedDno,
    initializeDisplayOrder,
    clearHistory,
    captureDeckSnapshot,
    savedDeckSnapshot
  } = options;

  /**
   * デッキを読み込む
   *
   * プリロードデータの取得、API呼び出し、Store更新、URL同期、
   * ローカルストレージ更新、履歴リセット、スナップショット保存、
   * Toast通知などの一連の処理を集約して実行する。
   *
   * @param dno デッキ番号
   * @throws API呼び出しに失敗した場合
   */
  async function loadDeck(dno: number): Promise<void> {
    try {
      const cgid = await sessionManager.getCgid();

      // メモリからプリロード済みデータを取得
      let loadedDeck: DeckInfo | null = null;

      // getDeckDetail の完了を待つ（最大1秒）
      if (window.ygoNextPreloadedDeckDetailPromise && !window.ygoNextPreloadedDeckDetail) {
        try {
          await Promise.race([
            window.ygoNextPreloadedDeckDetailPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Preload timeout')), 1000))
          ]);
        } catch (error) {
          console.warn('[loadDeck] Preload wait failed or timed out:', error);
        }
        // 使用後は Promise を削除
        window.ygoNextPreloadedDeckDetailPromise = null;
      }

      if (window.ygoNextPreloadedDeckDetail) {
        loadedDeck = window.ygoNextPreloadedDeckDetail;
        window.ygoNextPreloadedDeckDetail = null; // 使用後は削除
      }

      // プリロードデータがなければ通常の getDeckDetailAPI を実行
      if (!loadedDeck) {
        loadedDeck = await getDeckDetailAPI(dno, cgid);
      }

      if (loadedDeck) {
        // originalNameを保存してからdeckInfoを更新
        deckInfo.value = {
          ...loadedDeck,
          originalName: loadedDeck.name,
          name: '' // デッキ名を空にする
        };

        // URLにdnoを同期
        URLStateManager.setDno(dno);

        // displayOrderを初期化
        initializeDisplayOrder();

        // ロード時はアニメーション不要（新規表示のため）

        lastUsedDno.value = dno;
        localStorage.setItem('ygo-deck-helper:lastUsedDno', String(dno));

        // デッキオープンを記録（Tier 5管理用）
        const allCardIds = [
          ...loadedDeck.mainDeck.map(card => card.cid),
          ...loadedDeck.extraDeck.map(card => card.cid),
          ...loadedDeck.sideDeck.map(card => card.cid)
        ];
        recordDeckOpen(dno, allCardIds);

        // メモリ内に保存されたカード情報を Chrome Storage に同期（非同期で実行、UIをブロックしない）
        // Table A, B, B2 を cache db に保存
        const { saveUnifiedCacheDB } = await import('@/utils/unified-cache-db');
        saveUnifiedCacheDB().catch(error => {
          console.error('Failed to save UnifiedCacheDB to storage:', error);
        });

        // コマンド履歴をリセット
        clearHistory();

        // Load時点のスナップショットを保存
        savedDeckSnapshot.value = captureDeckSnapshot();

        // 未発売カード通知を表示（skippedCards があれば）
        if (loadedDeck.skippedCardsCount && loadedDeck.skippedCardsCount > 0) {
          const skippedCards = loadedDeck.skippedCards || [];
          const toastStore = useToastStore();

          // 最大3枚までのカード名を表示（改行で区切る）
          const bodyLines: string[] = [];
          if (skippedCards.length > 0) {
            const displayCards = skippedCards.slice(0, 3);
            displayCards.forEach((card: any) => {
              bodyLines.push(card.name);
            });

            const remainCount = skippedCards.length - displayCards.length;
            if (remainCount > 0) {
              bodyLines.push(`ほか${remainCount}枚`);
            }
          }

          toastStore.showToast(
            `${loadedDeck.skippedCardsCount}枚の未発売カードをスキップしました`,
            'warning',
            bodyLines.join('\n')
          );
        }
      }
    } catch (error) {
      console.error('Failed to load deck:', error);
      throw error;
    }
  }

  /**
   * デッキを保存する
   *
   * @param dno デッキ番号
   * @returns 保存結果
   */
  async function saveDeck(dno: number): Promise<OperationResult> {
    try {
      deckInfo.value.dno = dno;

      // 保存用のデータを作成（deckInfo自体は変更しない）
      const dataToSave = {
        ...deckInfo.value,
        name: deckInfo.value.name || deckInfo.value.originalName || ''
      };

      const result = await sessionManager.saveDeck(dno, dataToSave);

      if (result.success) {
        // 保存成功時にスナップショットを更新
        savedDeckSnapshot.value = captureDeckSnapshot();
      }

      return result;
    } catch (error) {
      console.error('Failed to save deck:', error);
      return { success: false, error: [String(error)] };
    }
  }

  return {
    loadDeck,
    saveDeck
  };
}
