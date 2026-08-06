import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCardDetailStore } from '@/stores/card-detail';
import type { CardInfo } from '@/types/card';

describe('stores/card-detail', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // サンプルカード情報を作成するヘルパー
  const createCard = (id: string, ciid: string = 'ciid1'): CardInfo => ({
    cardId: id,
    ciid,
    cid: id,
    name: `Card ${id}`,
    nameRuby: '',
    imageUrl: '',
    cardType: 'monster',
    cardTypeText: 'Monster',
    attribute: 'light',
    level: 4,
    atk: 1800,
    def: 1000,
    race: 'dragon',
    effect: 'Sample effect',
    forbidden: null
  });

  describe('初期状態', () => {
    it('selectedCardはnull', () => {
      const store = useCardDetailStore();
      expect(store.selectedCard).toBeNull();
    });

    it('cardTabはinfo', () => {
      const store = useCardDetailStore();
      expect(store.cardTab).toBe('info');
    });

    it('isLoadingCardはfalse', () => {
      const store = useCardDetailStore();
      expect(store.isLoadingCard).toBe(false);
    });

    it('canGoBackはfalse', () => {
      const store = useCardDetailStore();
      expect(store.canGoBack).toBe(false);
    });

    it('canGoForwardはfalse', () => {
      const store = useCardDetailStore();
      expect(store.canGoForward).toBe(false);
    });
  });

  describe('setSelectedCard', () => {
    it('カードを選択できる', () => {
      const store = useCardDetailStore();
      const card = createCard('card1');

      store.setSelectedCard(card);

      expect(store.selectedCard).toMatchObject(card);
    });

    it('nullを設定できる [covers:set_selected_card.null_card_skips_history_update]', () => {
      const store = useCardDetailStore();
      const card = createCard('card1');

      store.setSelectedCard(card);
      store.setSelectedCard(null);

      expect(store.selectedCard).toBeNull();
      expect(store.canGoBack).toBe(false); // nullは履歴に追加されない
    });

    it('カードを選択すると履歴に追加される', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1');

      store.setSelectedCard(card1);

      expect(store.canGoBack).toBe(false); // 履歴は1つだけなので戻れない
      expect(store.canGoForward).toBe(false);
    });

    it('同じカードを連続で選択しても履歴に追加されない [covers:set_selected_card.same_card_as_last_is_noop_for_history]', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1');

      store.setSelectedCard(card1);
      store.setSelectedCard(card1);

      expect(store.canGoBack).toBe(false);
    });

    it('異なるカードを選択すると履歴に追加される', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1');
      const card2 = createCard('card2');

      store.setSelectedCard(card1);
      store.setSelectedCard(card2);

      expect(store.canGoBack).toBe(true); // card1に戻れる
      expect(store.canGoForward).toBe(false);
    });
  });

  describe('updateSelectedCardCiid', () => {
    it('selectedCardがnullの場合は何もしない [covers:update_ciid.no_selected_card_is_noop]', () => {
      const store = useCardDetailStore();

      store.updateSelectedCardCiid('999');

      expect(store.selectedCard).toBeNull();
    });

    it('selectedCardが存在する場合ciidのみ更新される [covers:update_ciid.selected_card_present_updates_in_place]', () => {
      const store = useCardDetailStore();
      const card = createCard('card1', 'old');

      store.setSelectedCard(card);
      store.updateSelectedCardCiid('new');

      expect(store.selectedCard?.ciid).toBe('new');
      expect(store.selectedCard?.cardId).toBe('card1');
    });
  });

  describe('setCardTab', () => {
    it('タブを切り替えられる', () => {
      const store = useCardDetailStore();

      store.setCardTab('qa');
      expect(store.cardTab).toBe('qa');

      store.setCardTab('related');
      expect(store.cardTab).toBe('related');

      store.setCardTab('products');
      expect(store.cardTab).toBe('products');

      store.setCardTab('info');
      expect(store.cardTab).toBe('info');
    });
  });

  describe('startLoadingCard / endLoadingCard', () => {
    it('ローディング状態を管理できる', () => {
      const store = useCardDetailStore();

      expect(store.isLoadingCard).toBe(false);

      store.startLoadingCard();
      expect(store.isLoadingCard).toBe(true);

      store.endLoadingCard();
      expect(store.isLoadingCard).toBe(false);
    });
  });

  describe('履歴機能', () => {
    it('複数のカードを選択すると履歴が蓄積される', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1');
      const card2 = createCard('card2');
      const card3 = createCard('card3');

      store.setSelectedCard(card1);
      store.setSelectedCard(card2);
      store.setSelectedCard(card3);

      expect(store.selectedCard).toMatchObject(card3);
      expect(store.canGoBack).toBe(true);
      expect(store.canGoForward).toBe(false);
    });

    it('goBackで前のカードに戻れる [covers:go_back.moves_index_and_sets_selected_card]', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1');
      const card2 = createCard('card2');

      store.setSelectedCard(card1);
      store.setSelectedCard(card2);

      store.goBack();

      expect(store.selectedCard).toMatchObject(card1);
      expect(store.canGoBack).toBe(false);
      expect(store.canGoForward).toBe(true);
    });

    it('goForwardで次のカードに進める [covers:go_forward.moves_index_and_sets_selected_card]', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1');
      const card2 = createCard('card2');

      store.setSelectedCard(card1);
      store.setSelectedCard(card2);
      store.goBack();

      store.goForward();

      expect(store.selectedCard).toMatchObject(card2);
      expect(store.canGoBack).toBe(true);
      expect(store.canGoForward).toBe(false);
    });

    it('戻れない状態でgoBackを呼んでも何も起こらない [covers:go_back.cannot_go_back_is_noop]', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1');

      store.setSelectedCard(card1);
      store.goBack();

      expect(store.selectedCard).toMatchObject(card1);
    });

    it('進めない状態でgoForwardを呼んでも何も起こらない [covers:go_forward.cannot_go_forward_is_noop]', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1');

      store.setSelectedCard(card1);
      store.goForward();

      expect(store.selectedCard).toMatchObject(card1);
    });

    it('履歴の途中で新しいカードを選択すると、その後の履歴が削除される [covers:set_selected_card.truncates_forward_history_on_branch]', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1');
      const card2 = createCard('card2');
      const card3 = createCard('card3');
      const card4 = createCard('card4');

      store.setSelectedCard(card1);
      store.setSelectedCard(card2);
      store.setSelectedCard(card3);
      store.goBack(); // card2
      store.goBack(); // card1

      // ここでcard4を選択すると、card2とcard3の履歴が削除される
      store.setSelectedCard(card4);

      expect(store.selectedCard).toMatchObject(card4);
      expect(store.canGoBack).toBe(true); // card1に戻れる
      expect(store.canGoForward).toBe(false); // card2, card3には進めない

      store.goBack();
      expect(store.selectedCard).toMatchObject(card1);
    });

    it('履歴操作中は履歴に追加されない [covers:set_selected_card.navigating_history_skips_history_update]', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1');
      const card2 = createCard('card2');

      store.setSelectedCard(card1);
      store.setSelectedCard(card2);

      const beforeGoBack = store.canGoBack;

      store.goBack();

      // goBackで戻った後も履歴が増えていない
      expect(store.canGoBack).toBe(false); // card1に戻った状態
      expect(store.canGoForward).toBe(true); // card2に進める
    });

    it('履歴の最大サイズ（50）を超えると古い履歴が削除される [covers:set_selected_card.exceeds_max_history_size_shifts_oldest]', () => {
      const store = useCardDetailStore();

      // 51個のカードを追加
      for (let i = 1; i <= 51; i++) {
        const card = createCard(`card${i}`);
        store.setSelectedCard(card);
      }

      // 最後のカードがselectedCardになっている
      expect(store.selectedCard?.cardId).toBe('card51');

      // 最初まで戻る（最大50回戻れる）
      for (let i = 0; i < 49; i++) {
        store.goBack();
      }

      // 最初のカードはcard2（card1は削除されている）
      expect(store.selectedCard?.cardId).toBe('card2');
      expect(store.canGoBack).toBe(false);
    });
  });

  describe('reset', () => {
    it('全ての状態がリセットされる', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1');
      const card2 = createCard('card2');

      store.setSelectedCard(card1);
      store.setSelectedCard(card2);
      store.setCardTab('qa');
      store.startLoadingCard();

      store.reset();

      expect(store.selectedCard).toBeNull();
      expect(store.cardTab).toBe('info');
      expect(store.isLoadingCard).toBe(false);
      expect(store.canGoBack).toBe(false);
      expect(store.canGoForward).toBe(false);
    });
  });

  describe('異なるciidの同じcidのカード', () => {
    it('ciidが異なれば履歴に追加される', () => {
      const store = useCardDetailStore();
      const card1 = createCard('card1', 'ciid1');
      const card2 = createCard('card1', 'ciid2'); // 同じcid、異なるciid

      store.setSelectedCard(card1);
      store.setSelectedCard(card2);

      expect(store.canGoBack).toBe(true);
    });

    it('cidとciidが同じなら履歴に追加されない', () => {
      const store = useCardDetailStore();
      const card1a = createCard('card1', 'ciid1');
      const card1b = { ...createCard('card1', 'ciid1') }; // 別のオブジェクトだが同じ内容

      store.setSelectedCard(card1a);
      store.setSelectedCard(card1b);

      expect(store.canGoBack).toBe(false);
    });
  });
});
