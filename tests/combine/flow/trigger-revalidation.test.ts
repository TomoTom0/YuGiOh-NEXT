
import { CardDetail, CardInfo } from '../../../src/types/card';

// Mock of the trigger logic in CardDetail.vue
function shouldTriggerRevalidation(cacheResult: { fromCache: boolean; isFresh: boolean; detail: CardDetail }): boolean {
    return cacheResult.fromCache && (!cacheResult.isFresh || !cacheResult.detail.card.ruby);
}

async function testTriggerLogic() {
    console.log('=== Testing Revalidation Trigger Logic ===\n');

    const cardNoRuby: CardInfo = {
        cardId: '4007',
        name: '青眼の白龍',
        ruby: undefined,
        ciid: '1',
        imgs: [],
        cardType: 'monster',
        attribute: 'light',
        levelType: 'level',
        levelValue: 8,
        race: 'dragon',
        types: ['normal'],
        atk: 3000,
        def: 2500
    };

    const cardWithRuby: CardInfo = {
        ...cardNoRuby,
        ruby: 'ブルーアイズ・ホワイト・ドラゴン'
    };

    const detailNoRuby: CardDetail = { card: cardNoRuby, packs: [], relatedCards: [], qaList: [] };
    const detailWithRuby: CardDetail = { card: cardWithRuby, packs: [], relatedCards: [], qaList: [] };

    // Case 1: Stale cache (should trigger)
    if (!shouldTriggerRevalidation({ fromCache: true, isFresh: false, detail: detailWithRuby })) {
        console.error('ERROR: Failed to trigger on stale cache');
        process.exit(1);
    }
    console.log('✓ Triggered on stale cache');

    // Case 2: Fresh cache with ruby (should NOT trigger)
    if (shouldTriggerRevalidation({ fromCache: true, isFresh: true, detail: detailWithRuby })) {
        console.error('ERROR: Triggered on fresh cache with ruby');
        process.exit(1);
    }
    console.log('✓ Did NOT trigger on fresh cache with ruby');

    // Case 3: Fresh cache WITHOUT ruby (should trigger - NEW FIX)
    if (!shouldTriggerRevalidation({ fromCache: true, isFresh: true, detail: detailNoRuby })) {
        console.error('ERROR: Failed to trigger on fresh cache without ruby');
        process.exit(1);
    }
    console.log('✓ Triggered on fresh cache without ruby');

    console.log('\n=== Test Passed ===');
}

testTriggerLogic().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
