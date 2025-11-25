
import { CardDetail, CardInfo } from '../../../src/types/card';

function shouldUpdate(current: CardDetail, fresh: CardDetail): boolean {
    const currentName = current.card.name;
    const freshName = fresh.card.name;
    const currentRuby = current.card.ruby;
    const freshRuby = fresh.card.ruby;
    const currentPacks = current.packs.length;
    const freshPacks = fresh.packs.length;
    const currentRelated = current.relatedCards.length;
    const freshRelated = fresh.relatedCards.length;

    return currentName !== freshName || currentRuby !== freshRuby || currentPacks !== freshPacks || currentRelated !== freshRelated;
}

async function testRevalidationLogic() {
    console.log('=== Testing Revalidation Logic ===\n');

    const staleCard: CardInfo = {
        cardId: '4007',
        name: '青眼の白龍',
        ruby: undefined, // Missing ruby
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

    const freshCard: CardInfo = {
        ...staleCard,
        ruby: 'ブルーアイズ・ホワイト・ドラゴン' // Has ruby
    };

    const staleDetail: CardDetail = {
        card: staleCard,
        packs: [],
        relatedCards: [],
        qaList: []
    };

    const freshDetail: CardDetail = {
        card: freshCard,
        packs: [],
        relatedCards: [],
        qaList: []
    };

    console.log('Comparing stale (no ruby) vs fresh (with ruby)...');
    const result = shouldUpdate(staleDetail, freshDetail);

    if (result) {
        console.log('✓ Logic correctly detected difference');
    } else {
        console.error('ERROR: Logic failed to detect difference');
        process.exit(1);
    }

    console.log('\n=== Test Passed ===');
}

testRevalidationLogic().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
