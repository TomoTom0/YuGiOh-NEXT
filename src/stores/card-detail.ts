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
   * リセット（初期化）
   */
  const reset = () => {
    selectedCard.value = null;
    cardTab.value = 'info';
  };

  return {
    selectedCard,
    cardTab,
    setSelectedCard,
    setCardTab,
    reset
  };
});
