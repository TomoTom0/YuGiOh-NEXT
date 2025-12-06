import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CardInfo } from '../types/card';

/**
 * Card Detail ストア
 * CardDetail.vue で使用される状態を管理
 * - selectedCard: 現在選択中のカード情報
 * - cardTab: 現在表示中のタブ（info/qa/related/products）
 */
export const useCardDetailStore = defineStore('cardDetail', () => {
  // ===== 状態 =====

  /** 選択中のカード情報 */
  const selectedCard = ref<CardInfo | null>(null);

  /** 現在のタブ */
  const cardTab = ref<'info' | 'qa' | 'related' | 'products'>('info');

  /** カード読み込み中フラグ */
  const isLoadingCard = ref(false);

  // ===== アクション =====

  /**
   * selectedCard を更新
   */
  const setSelectedCard = (card: CardInfo | null) => {
    selectedCard.value = card;
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
   * リセット（初期化）
   */
  const reset = () => {
    selectedCard.value = null;
    cardTab.value = 'info';
    isLoadingCard.value = false;
  };

  return {
    selectedCard,
    cardTab,
    isLoadingCard,
    setSelectedCard,
    setCardTab,
    startLoadingCard,
    endLoadingCard,
    reset
  };
});
