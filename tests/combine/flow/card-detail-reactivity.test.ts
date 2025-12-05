import { describe, it, expect, beforeEach } from 'vitest';
import { ref, computed, watch, nextTick, reactive } from 'vue';
import { CardInfo, CardDetail } from '../../../src/types/card';

describe('Flow: Component Reactivity', () => {
  let deckStore: any;

  beforeEach(() => {
    // Mock Store
    deckStore = reactive({
      selectedCard: null as CardInfo | null
    });
  });

  // Mock CardInfo Component Logic
  function useCardInfo() {
    const showRuby = ref(true);
    const card = computed(() => deckStore.selectedCard);

    const toggleRuby = () => {
      showRuby.value = !showRuby.value;
    };

    watch(() => card.value?.cardId, () => {
      showRuby.value = false;
    });

    return { card, showRuby, toggleRuby };
  }

  // Mock CardDetail Component Logic
  function useCardDetail(propsCard: CardInfo) {
    const detail = ref<CardDetail | null>(null);

    // Initialize like CardDetail.vue
    detail.value = {
      card: propsCard,
      packs: [],
      relatedCards: [],
      qaList: []
    };

    // Watcher from CardDetail.vue
    watch(() => detail.value, (newDetail) => {
      if (newDetail && newDetail.card) {
        const oldCiid = deckStore.selectedCard?.ciid;
        deckStore.selectedCard = {
          ...newDetail.card,
          imgs: [...newDetail.card.imgs],
          ciid: (deckStore.selectedCard?.cardId === newDetail.card.cardId && oldCiid) || newDetail.card.ciid
        };
      }
    }, { deep: false });

    return { detail };
  }

  it('should correctly propagate ruby through component reactivity', async () => {
    // 1. Initial State (Search Result Click)
    const searchResultCard: CardInfo = {
      cardId: '4007',
      name: '青眼の白龍',
      ruby: undefined, // No ruby initially
      ciid: '1',
      imgs: [],
      cardType: 'monster',
      attribute: 'light',
      levelType: 'level',
      levelValue: 8,
      race: 'dragon',
      types: ['normal'],
      atk: 3000,
      def: 2500,
      isExtraDeck: false
    };

    deckStore.selectedCard = searchResultCard;
    expect(deckStore.selectedCard.name).toBe('青眼の白龍');

    // 2. Mount CardInfo
    const cardInfo = useCardInfo();
    expect(cardInfo.card.value?.name).toBe('青眼の白龍');

    // 3. Mount CardDetail
    const cardDetail = useCardDetail(searchResultCard);

    // 4. Simulate Fetch & Update
    const fetchedDetail: CardDetail = {
      card: {
        ...searchResultCard,
        ruby: 'ブルーアイズ・ホワイト・ドラゴン' // Ruby present in fetch
      },
      packs: [],
      relatedCards: [],
      qaList: []
    };

    // Update detail.value (simulating getCardDetailWithCache return)
    cardDetail.detail.value = fetchedDetail;

    await nextTick();

    expect(deckStore.selectedCard?.ruby).toBe('ブルーアイズ・ホワイト・ドラゴン');
    expect(cardInfo.card.value?.ruby).toBe('ブルーアイズ・ホワイト・ドラゴン');

    // 5. Test Toggle
    expect(cardInfo.showRuby.value).toBe(true);

    cardInfo.toggleRuby();
    expect(cardInfo.showRuby.value).toBe(false);
  });
});
