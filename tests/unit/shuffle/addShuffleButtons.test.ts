/**
 * addShuffleButtons.ts の実装条件テスト
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EXTENSION_IDS } from '../../../src/utils/dom-selectors';

type AddShuffleButtonsModule = typeof import('../../../src/content/shuffle/addShuffleButtons');

function setUrl(url: string): void {
  window.history.pushState({}, '', url);
}

function setReadyState(value: DocumentReadyState): void {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    get: () => value,
  });
}

function createSection(sectionId: 'main' | 'extra' | 'side', countText: string, options: {
  omitCardSet?: boolean;
  omitTop?: boolean;
  omitCountSpan?: boolean;
} = {}): void {
  let deckImage = document.querySelector('#deck_image');
  if (!deckImage) {
    deckImage = document.createElement('div');
    deckImage.id = 'deck_image';
    document.body.appendChild(deckImage);
  }

  if (options.omitCardSet) {
    return;
  }

  const section = document.createElement('div');
  section.id = sectionId;
  section.className = 'card_set';

  if (!options.omitTop) {
    const subcategory = document.createElement('div');
    subcategory.className = 'subcatergory';
    const top = document.createElement('div');
    top.className = 'top';

    top.appendChild(document.createElement('span'));
    top.appendChild(document.createElement('span'));
    if (!options.omitCountSpan) {
      const count = document.createElement('span');
      count.textContent = countText;
      top.appendChild(count);
    }

    subcategory.appendChild(top);
    section.appendChild(subcategory);
  }

  deckImage.appendChild(section);
}

function buttonIds(sectionId: 'main' | 'extra' | 'side'): { shuffle: string; sort: string } {
  const keyPrefix = sectionId as 'main' | 'extra' | 'side';
  return {
    shuffle: EXTENSION_IDS.shuffle[`${keyPrefix}ShuffleButton`],
    sort: EXTENSION_IDS.shuffle[`${keyPrefix}SortButton`],
  };
}

function topChildren(sectionId: 'main' | 'extra' | 'side'): string[] {
  const top = document.querySelector(`#deck_image #${sectionId}.card_set div.subcatergory > div.top`);
  return Array.from(top?.children ?? []).map(child => child.id || child.tagName);
}

async function loadModule(): Promise<AddShuffleButtonsModule> {
  vi.resetModules();
  return import('../../../src/content/shuffle/addShuffleButtons');
}

describe('addShuffleButtons - 実装条件', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setUrl('/yugiohdb/');
    setReadyState('complete');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('main/extra/sideすべてにボタンを追加しmainのshuffleボタンを返す [covers:add_shuffle_section.positive_count_adds_buttons] [covers:add_shuffle.all_sections_returns_main_button] [covers:add_shuffle_create_button.attributes_and_prevent_default]', async () => {
    createSection('main', '3');
    createSection('extra', '2');
    createSection('side', '1');
    const mod = await loadModule();

    const returned = mod.addShuffleButtons();
    const mainIds = buttonIds('main');

    expect(returned?.id).toBe(mainIds.shuffle);
    expect(topChildren('main')).toEqual(['SPAN', 'SPAN', mainIds.shuffle, mainIds.sort, 'SPAN']);
    expect(document.querySelector(`#${buttonIds('extra').shuffle}`)).toBeInstanceOf(HTMLAnchorElement);
    expect(document.querySelector(`#${buttonIds('side').shuffle}`)).toBeInstanceOf(HTMLAnchorElement);

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    returned?.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(returned?.className).toBe('ygo-next ygo-next-shuffle-sort-btn');
    expect(returned?.getAttribute('href')).toBe('#');
    expect(returned?.title).toBe('シャッフル');
    expect(returned?.innerHTML).toContain('svg');
  });

  it('カード枚数spanの手前に他要素(拡張機能の別UI等)が挿入されていてもシャッフルボタンを追加できる [covers:add_shuffle_section.count_span_is_last_element_child]', async () => {
    createSection('main', '3');
    const top = document.querySelector('#deck_image #main.card_set div.subcatergory > div.top')!;
    const countSpan = top.lastElementChild!;
    const inserted = document.createElement('div');
    inserted.className = 'other-extension-ui';
    top.insertBefore(inserted, countSpan);
    const mod = await loadModule();

    const returned = mod.addShuffleButtons();

    expect(returned?.id).toBe(buttonIds('main').shuffle);
    expect(topChildren('main')).toEqual(['SPAN', 'SPAN', 'DIV', buttonIds('main').shuffle, buttonIds('main').sort, 'SPAN']);
  });

  it('既存shuffleボタンがあるsectionはnullになり、addShuffleButtonsはmainがnullでもextra/sideを処理する [covers:add_shuffle_section.existing_button_returns_null] [covers:add_shuffle.main_null_still_processes_other_sections]', async () => {
    createSection('main', '3');
    createSection('extra', '1');
    createSection('side', '1');
    const existing = document.createElement('a');
    existing.id = buttonIds('main').shuffle;
    document.body.appendChild(existing);
    const mod = await loadModule();

    const returned = mod.addShuffleButtons();

    expect(returned).toBeNull();
    expect(document.querySelectorAll(`#${buttonIds('main').shuffle}`)).toHaveLength(1);
    expect(document.querySelector(`#${buttonIds('extra').shuffle}`)).toBeInstanceOf(HTMLAnchorElement);
    expect(document.querySelector(`#${buttonIds('side').shuffle}`)).toBeInstanceOf(HTMLAnchorElement);
  });

  it('必要なDOMが無いsectionとカード枚数0のsectionにはボタンを追加しない [covers:add_shuffle_section.card_set_missing_returns_null] [covers:add_shuffle_section.top_missing_returns_null] [covers:add_shuffle_section.count_span_missing_returns_null] [covers:add_shuffle_section.zero_count_returns_null]', async () => {
    createSection('main', '1', { omitCardSet: true });
    createSection('extra', '1', { omitTop: true });
    createSection('side', '1', { omitCountSpan: true });
    const mod = await loadModule();

    expect(mod.addShuffleButtons()).toBeNull();
    expect(document.querySelector(`#${buttonIds('main').shuffle}`)).toBeNull();
    expect(document.querySelector(`#${buttonIds('extra').shuffle}`)).toBeNull();
    expect(document.querySelector(`#${buttonIds('side').shuffle}`)).toBeNull();

    document.body.innerHTML = '';
    createSection('main', '0');
    expect(mod.addShuffleButtons()).toBeNull();
    expect(document.querySelector(`#${buttonIds('main').shuffle}`)).toBeNull();
  });

  it('カード枚数テキストがNaNの場合は0判定に入らずボタンを追加する [covers:add_shuffle_section.nan_count_adds_buttons]', async () => {
    createSection('main', 'abc');
    const mod = await loadModule();

    const returned = mod.addShuffleButtons();

    expect(returned?.id).toBe(buttonIds('main').shuffle);
    expect(document.querySelector(`#${buttonIds('main').sort}`)).toBeInstanceOf(HTMLAnchorElement);
  });

  it('デッキ表示ページでない場合はタイマーを予約しない [covers:init_shuffle.not_deck_display_returns]', async () => {
    setUrl('/yugiohdb/member_deck.action?ope=2');
    const timeoutSpy = vi.spyOn(window, 'setTimeout');
    const mod = await loadModule();

    mod.initShuffleButtons();

    expect(timeoutSpy).not.toHaveBeenCalled();
  });

  it('readyStateがcompleteのデッキ表示ページでは100msタイマーでボタン追加を予約する [covers:init_shuffle.ready_schedules_timeout]', async () => {
    setUrl('/yugiohdb/member_deck.action?cgid=abc&dno=1');
    setReadyState('complete');
    createSection('main', '1');
    const mod = await loadModule();

    mod.initShuffleButtons();
    expect(document.querySelector(`#${buttonIds('main').shuffle}`)).toBeNull();

    vi.advanceTimersByTime(100);
    expect(document.querySelector(`#${buttonIds('main').shuffle}`)).toBeInstanceOf(HTMLAnchorElement);
  });

  it('readyStateがloadingのデッキ表示ページではDOMContentLoaded後に100msタイマーを予約する [covers:init_shuffle.loading_waits_dom_content_loaded]', async () => {
    setUrl('/rushdb/member_deck.action?ope=1');
    setReadyState('loading');
    createSection('main', '1');
    const mod = await loadModule();

    mod.initShuffleButtons();
    vi.advanceTimersByTime(100);
    expect(document.querySelector(`#${buttonIds('main').shuffle}`)).toBeNull();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    vi.advanceTimersByTime(100);
    expect(document.querySelector(`#${buttonIds('main').shuffle}`)).toBeInstanceOf(HTMLAnchorElement);
  });
});
