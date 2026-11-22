/**
 * shuffleCards.ts の実装条件テスト
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type ShuffleModule = typeof import('../../../src/content/shuffle/shuffleCards');

function cardTexts(sectionId: 'main' | 'extra' | 'side'): string[] {
  return Array.from(
    document.querySelectorAll(`#deck_image #${sectionId}.card_set div.image_set > a`)
  ).map(card => card.textContent ?? '');
}

function imageSet(sectionId: 'main' | 'extra' | 'side'): HTMLElement {
  const found = document.querySelector<HTMLElement>(`#deck_image #${sectionId}.card_set div.image_set`);
  if (!found) {
    throw new Error(`missing image_set for ${sectionId}`);
  }
  return found;
}

function createDeck(sections: Partial<Record<'main' | 'extra' | 'side', string[]>>): void {
  const deckImage = document.createElement('div');
  deckImage.id = 'deck_image';

  (['main', 'extra', 'side'] as const).forEach(sectionId => {
    if (!sections[sectionId]) {
      return;
    }

    const section = document.createElement('div');
    section.id = sectionId;
    section.className = 'card_set';

    const set = document.createElement('div');
    set.className = 'image_set';

    sections[sectionId]!.forEach(text => {
      const card = document.createElement('a');
      card.href = '#';
      card.textContent = text;
      set.appendChild(card);
    });

    section.appendChild(set);
    deckImage.appendChild(section);
  });

  document.body.appendChild(deckImage);
}

async function loadModule(): Promise<ShuffleModule> {
  vi.resetModules();
  return import('../../../src/content/shuffle/shuffleCards');
}

describe('shuffleCards - 実装条件', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('対象sectionのimage_setが無い場合は何もしない [covers:shuffle-section.image-set-missing-returns] [covers:sort-section.image-set-missing-returns]', async () => {
    const mod = await loadModule();

    expect(() => mod.shuffleCards()).not.toThrow();
    expect(() => mod.sortCards()).not.toThrow();
    expect(document.body.innerHTML).toBe('');
  });

  it('初回shuffleで元順序を保存し、2回目shuffle後もsortで初回順序へ戻す [covers:shuffle-fisher-yates.copies-input] [covers:shuffle-fisher-yates.loop-swaps-from-tail] [covers:shuffle-section.first-call-saves-original-order] [covers:shuffle-section.subsequent-call-keeps-original-order] [covers:shuffle-section.normal-cards-shuffled-only] [covers:sort-section.sortfixed-from-all-sections-then-original-normals] [covers:shuffle-export.main-shuffle-delegates] [covers:shuffle-export.main-sort-delegates]', async () => {
    createDeck({ main: ['M1', 'M2', 'M3'] });
    const mod = await loadModule();

    mod.shuffleCards();
    expect(cardTexts('main')).toEqual(['M2', 'M3', 'M1']);

    mod.shuffleCards();
    expect(cardTexts('main')).toEqual(['M3', 'M1', 'M2']);

    mod.sortCards();
    expect(cardTexts('main')).toEqual(['M1', 'M2', 'M3']);
  });

  it('空または1枚のsectionは順序を変えず、FLIP後にstyleとanimatingを片付ける [covers:shuffle-fisher-yates.empty-or-single-unchanged] [covers:shuffle-flip.reorders-and-animates]', async () => {
    createDeck({ main: ['M1'], extra: [] });
    const mod = await loadModule();

    mod.shuffleCards();

    const mainSet = imageSet('main');
    const onlyCard = mainSet.querySelector<HTMLElement>('a');
    expect(cardTexts('main')).toEqual(['M1']);
    expect(mainSet.classList.contains('animating')).toBe(true);
    expect(onlyCard?.style.transition).toContain('transform 400ms cubic-bezier');

    vi.advanceTimersByTime(400);

    expect(mainSet.classList.contains('animating')).toBe(false);
    expect(onlyCard?.style.transition).toBe('');
    expect(onlyCard?.style.transform).toBe('');

    mod.shuffleCardsExtra();
    expect(cardTexts('extra')).toEqual([]);
  });

  it('sortfixカードは全セクション分が対象sectionの先頭へ移動し、元section外カードはInvert初期styleを設定されない [covers:shuffle-section.sortfixed-from-all-sections-first] [covers:shuffle-flip.skips-invert-when-position-missing]', async () => {
    createDeck({ main: ['M1', 'M2'], extra: ['E1'] });
    const extraCard = imageSet('extra').querySelector<HTMLElement>('a');
    extraCard?.setAttribute('data-ygo-next-sortfix', 'true');
    vi.stubGlobal('requestAnimationFrame', () => 1);
    const mod = await loadModule();

    mod.shuffleCards();

    expect(cardTexts('main')).toEqual(['E1', 'M2', 'M1']);
    expect(cardTexts('extra')).toEqual([]);
    expect(extraCard?.style.transition).toBe('');
    expect(extraCard?.style.transform).toBe('');
  });

  it('sortはshuffle未実行なら何もしない [covers:sort-section.original-order-missing-returns]', async () => {
    createDeck({ main: ['M1', 'M2'] });
    const mod = await loadModule();

    mod.sortCards();

    expect(cardTexts('main')).toEqual(['M1', 'M2']);
  });

  it('extra/sideのexport関数は対応sectionだけを処理する [covers:shuffle-export.extra-shuffle-delegates] [covers:shuffle-export.extra-sort-delegates] [covers:shuffle-export.side-shuffle-delegates] [covers:shuffle-export.side-sort-delegates]', async () => {
    createDeck({
      main: ['M1', 'M2', 'M3'],
      extra: ['E1', 'E2', 'E3'],
      side: ['S1', 'S2', 'S3'],
    });
    const mod = await loadModule();

    mod.shuffleCardsExtra();
    expect(cardTexts('main')).toEqual(['M1', 'M2', 'M3']);
    expect(cardTexts('extra')).toEqual(['E2', 'E3', 'E1']);
    expect(cardTexts('side')).toEqual(['S1', 'S2', 'S3']);

    mod.sortCardsExtra();
    expect(cardTexts('extra')).toEqual(['E1', 'E2', 'E3']);

    mod.shuffleCardsSide();
    expect(cardTexts('main')).toEqual(['M1', 'M2', 'M3']);
    expect(cardTexts('extra')).toEqual(['E1', 'E2', 'E3']);
    expect(cardTexts('side')).toEqual(['S2', 'S3', 'S1']);

    mod.sortCardsSide();
    expect(cardTexts('side')).toEqual(['S1', 'S2', 'S3']);
  });
});
