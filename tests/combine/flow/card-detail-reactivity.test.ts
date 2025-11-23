
import { ref, computed, watch, nextTick, reactive } from 'vue';
import { CardInfo, CardDetail } from '../../../src/types/card';

// Mock Store
const deckStore = reactive({
    selectedCard: null as CardInfo | null
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

async function testReactivity() {
    console.log('=== Testing Component Reactivity ===\n');

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
    console.log('1. Initial Store State:', deckStore.selectedCard.name, 'Ruby:', deckStore.selectedCard.ruby);

    // 2. Mount CardInfo
    const cardInfo = useCardInfo();
    console.log('   CardInfo computed:', cardInfo.card.value?.name, 'Ruby:', cardInfo.card.value?.ruby);

    // 3. Mount CardDetail
    const cardDetail = useCardDetail(searchResultCard);

    // 4. Simulate Fetch & Update
    console.log('2. Fetching details...');
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

    console.log('3. Store Updated State:', deckStore.selectedCard?.name, 'Ruby:', deckStore.selectedCard?.ruby);
    console.log('   CardInfo computed:', cardInfo.card.value?.name, 'Ruby:', cardInfo.card.value?.ruby);

    if (cardInfo.card.value?.ruby !== 'ブルーアイズ・ホワイト・ドラゴン') {
        console.error('ERROR: CardInfo did not receive ruby update');
        process.exit(1);
    }

    // 5. Test Toggle
    console.log('4. Testing Toggle...');
    if (!cardInfo.showRuby.value) {
        console.error('ERROR: showRuby should be true initially');
    }

    cardInfo.toggleRuby();

    if (cardInfo.showRuby.value) {
        console.error('ERROR: toggleRuby failed (should hide)');
        process.exit(1);
    }
    console.log('   showRuby is now false');

    console.log('\n=== Test Passed ===');
}

testReactivity().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
