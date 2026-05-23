import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CardInfo } from '../types/card';

/**
 * Card Detail ストア
 * CardDetail.vue で使用される状態を管理
 * - selectedCard: 現在選択中のカード情報
 * - cardTab: 現在表示中のタブ（info/qa/related/products）
 * - history: カード閲覧履歴（戻る/進む機能用）
 */
export const useCardDetailStore = defineStore('cardDetail', () => {
  // ===== 状態 =====

  /** 選択中のカード情報 */
  const selectedCard = ref<CardInfo | null>(null);

  /** 現在のタブ */
  const cardTab = ref<'info' | 'qa' | 'related' | 'products'>('info');

  /** カード読み込み中フラグ */
  const isLoadingCard = ref(false);

  /** カード閲覧履歴 */
  const history = ref<CardInfo[]>([]);

  /** 現在の履歴位置 */
  const historyIndex = ref(-1);

  /** 履歴操作中フラグ（戻る/進む操作時にhistoryに追加しないため） */
  const isNavigatingHistory = ref(false);

  /** 履歴の最大サイズ */
  const MAX_HISTORY_SIZE = 50;

  // ===== 算出プロパティ =====

  /** 戻ることができるか */
  const canGoBack = computed(() => historyIndex.value > 0);

  /** 進むことができるか */
  const canGoForward = computed(() => historyIndex.value < history.value.length - 1);

  // ===== アクション =====

  /**
   * selectedCard を更新
   */
  const setSelectedCard = (card: CardInfo | null) => {
    selectedCard.value = card;

    // 履歴操作中でない場合のみhistoryに追加
    if (!isNavigatingHistory.value && card) {
      // 同じカードを連続で選択した場合は追加しない
      const lastCard = history.value[historyIndex.value];
      if (lastCard && lastCard.cardId === card.cardId && lastCard.ciid === card.ciid) {
        return;
      }

      // 現在位置が履歴の末尾でない場合、その後ろの履歴を削除
      if (historyIndex.value < history.value.length - 1) {
        history.value = history.value.slice(0, historyIndex.value + 1);
      }

      // 履歴に追加
      history.value.push(card);
      historyIndex.value = history.value.length - 1;

      // 履歴サイズが上限を超えたら古い履歴を削除
      if (history.value.length > MAX_HISTORY_SIZE) {
        history.value.shift();
        historyIndex.value--;
      }
    }
  };

  /**
   * cardTab を更新
   */
  const setCardTab = (tab: 'info' | 'qa' | 'related' | 'products') => {
    cardTab.value = tab;
  };

  /**
   * カード読み込み開始
   */
  const startLoadingCard = () => {
    isLoadingCard.value = true;
  };

  /**
   * カード読み込み終了
   */
  const endLoadingCard = () => {
    isLoadingCard.value = false;
  };

  /**
   * 履歴を戻る
   */
  const goBack = () => {
    if (!canGoBack.value) return;

    isNavigatingHistory.value = true;
    historyIndex.value--;
    selectedCard.value = history.value[historyIndex.value];
    isNavigatingHistory.value = false;
  };

  /**
   * 履歴を進む
   */
  const goForward = () => {
    if (!canGoForward.value) return;

    isNavigatingHistory.value = true;
    historyIndex.value++;
    selectedCard.value = history.value[historyIndex.value];
    isNavigatingHistory.value = false;
  };

  /**
   * リセット（初期化）
   */
  const reset = () => {
    selectedCard.value = null;
    cardTab.value = 'info';
    isLoadingCard.value = false;
    history.value = [];
    historyIndex.value = -1;
    isNavigatingHistory.value = false;
  };

  return {
    selectedCard,
    cardTab,
    isLoadingCard,
    canGoBack,
    canGoForward,
    setSelectedCard,
    setCardTab,
    startLoadingCard,
    endLoadingCard,
    goBack,
    goForward,
    reset
  };
});
