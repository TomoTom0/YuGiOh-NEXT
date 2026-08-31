/**
 * sortfixCards.ts のテスト
 *
 * tests/design/sortfix-cards/conditions.toml (TASK-330) のconditionをカバーする。
 * 実装が`:scope > a`セレクタを使用しており、happy-domは:scope結合子を
 * elem.querySelectorAll()で正しく解決できないため、jsdom環境で実行する
 * （tests/unit/shuffle/shuffleCards.test.tsと同じ対処）。
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initSortfixForCards, getSortfixedCards } from '@/content/shuffle/sortfixCards';
// jsdom環境ではSVG要素のinnerHTML再シリアライズ時に自己終了タグが明示的な閉じタグに
// 正規化されるため、アイコン定数との完全一致比較は避け、path d属性の値で判別する
const LOCK_CLOSED_PATH_D = 'M7 11V7a5 5 0 0 1 10 0v4';
const LOCK_OPEN_PATH_D = 'M7 11V7a5 5 0 0 1 5-5c1.5 0 2.8 0.6 3.7 1.5M17 11V8';

function createDeckImage(sections: Record<string, string[]>): HTMLElement {
  const deckImage = document.createElement('div');
  deckImage.id = 'deck_image';

  for (const [sectionId, cardIds] of Object.entries(sections)) {
    const section = document.createElement('div');
    section.id = sectionId;
    section.className = 'card_set';
    const imageSet = document.createElement('div');
    imageSet.className = 'image_set';
    cardIds.forEach(cid => {
      const link = document.createElement('a');
      link.setAttribute('data-cid', cid);
      const controls = document.createElement('div');
      controls.className = 'ygo-next-card-controls';
      const topRight = document.createElement('button');
      topRight.className = 'ygo-next-card-btn top-right';
      controls.appendChild(topRight);
      link.appendChild(controls);
      imageSet.appendChild(link);
    });
    section.appendChild(imageSet);
    deckImage.appendChild(section);
  }

  document.body.appendChild(deckImage);
  return deckImage;
}

describe('sortfixCards.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('initSortfixForCards', () => {
    it('[covers:init_sortfix_for_cards.missing_section_skipped] セクションが無くてもエラーにならない', () => {
      createDeckImage({ main: ['1'] });

      expect(() => initSortfixForCards()).not.toThrow();
    });

    it('[covers:init_sortfix_for_cards.processes_direct_card_links] 各セクションの直下のカードリンク全てに初期化マーカーが付与される', () => {
      createDeckImage({ main: ['1', '2'], extra: ['3'] });

      initSortfixForCards();

      const links = document.querySelectorAll('a[data-cid]');
      expect(links.length).toBe(3);
      links.forEach(link => {
        expect(link.hasAttribute('data-ygo-next-sortfix-initialized')).toBe(true);
      });
    });

    it('[covers:init_sortfix_for_card.success_sets_icon_and_registers_click] 初期状態はLOCK_OPEN_ICONが設定される', () => {
      createDeckImage({ main: ['1'] });

      initSortfixForCards();

      const topRightBtn = document.querySelector('a[data-cid] .top-right')!;
      expect(topRightBtn.innerHTML).toContain(LOCK_OPEN_PATH_D);
      expect(topRightBtn.classList.contains('is-sortfixed')).toBe(false);
    });

    it('[covers:init_sortfix_for_card.already_initialized_skips] 2回呼んでも重複初期化しない', () => {
      createDeckImage({ main: ['1'] });

      initSortfixForCards();
      const link = document.querySelector('a[data-cid]')!;
      const addEventListenerSpy = vi.spyOn(link.querySelector('.top-right')!, 'addEventListener');

      initSortfixForCards();

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it('[covers:init_sortfix_for_card.no_controls_debug_logs_and_returns] card-controlsが無い場合デバッグログのみでエラーにならない', () => {
      const deckImage = document.createElement('div');
      deckImage.id = 'deck_image';
      const section = document.createElement('div');
      section.id = 'main';
      section.className = 'card_set';
      const imageSet = document.createElement('div');
      imageSet.className = 'image_set';
      const link = document.createElement('a'); // controlsを付けない
      imageSet.appendChild(link);
      section.appendChild(imageSet);
      deckImage.appendChild(section);
      document.body.appendChild(deckImage);
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      expect(() => initSortfixForCards()).not.toThrow();
      expect(debugSpy).toHaveBeenCalled();
    });

    it('[covers:init_sortfix_for_card.no_top_right_button_returns_silently] top-rightボタンが無い場合ログ無しで終了する', () => {
      const deckImage = document.createElement('div');
      deckImage.id = 'deck_image';
      const section = document.createElement('div');
      section.id = 'main';
      section.className = 'card_set';
      const imageSet = document.createElement('div');
      imageSet.className = 'image_set';
      const link = document.createElement('a');
      const controls = document.createElement('div');
      controls.className = 'ygo-next-card-controls'; // top-rightは無し
      link.appendChild(controls);
      imageSet.appendChild(link);
      section.appendChild(imageSet);
      deckImage.appendChild(section);
      document.body.appendChild(deckImage);
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      expect(() => initSortfixForCards()).not.toThrow();
      expect(debugSpy).not.toHaveBeenCalled();
    });
  });

  describe('toggleSortfix (topRightBtnクリック経由)', () => {
    it('[covers:toggle_sortfix.turns_on_when_off][covers:update_sortfix_icon.sortfixed_shows_closed_lock][covers:top_right_click.prevents_default_and_stops_propagation] 未sortfix状態でクリックするとONになりアイコンが変わる', () => {
      createDeckImage({ main: ['1'] });
      initSortfixForCards();
      const link = document.querySelector('a[data-cid]')!;
      const topRightBtn = link.querySelector('.top-right')!;

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      topRightBtn.dispatchEvent(clickEvent);

      expect(link.getAttribute('data-ygo-next-sortfix')).toBe('true');
      expect(topRightBtn.innerHTML).toContain(LOCK_CLOSED_PATH_D);
      expect(topRightBtn.classList.contains('is-sortfixed')).toBe(true);
      expect(clickEvent.defaultPrevented).toBe(true);
    });

    it('[covers:toggle_sortfix.turns_off_when_on][covers:update_sortfix_icon.not_sortfixed_shows_open_lock] sortfix済み状態でクリックするとOFFになりアイコンが戻る', () => {
      createDeckImage({ main: ['1'] });
      initSortfixForCards();
      const link = document.querySelector('a[data-cid]')!;
      const topRightBtn = link.querySelector('.top-right')!;

      // 1回目クリックでON
      topRightBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(link.getAttribute('data-ygo-next-sortfix')).toBe('true');

      // 2回目クリックでOFF
      topRightBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(link.hasAttribute('data-ygo-next-sortfix')).toBe(false);
      expect(topRightBtn.innerHTML).toContain(LOCK_OPEN_PATH_D);
      expect(topRightBtn.classList.contains('is-sortfixed')).toBe(false);
    });
  });

  describe('getSortfixedCards', () => {
    it('[covers:get_sortfixed_cards.missing_section_contributes_none] セクションが無くてもエラーにならず空を返す', () => {
      createDeckImage({ main: ['1'] });

      expect(() => getSortfixedCards()).not.toThrow();
    });

    it('[covers:get_sortfixed_cards.collects_across_all_sections] 全セクションのsortfix済みカードのみを収集する', () => {
      createDeckImage({ main: ['1', '2'], extra: ['3'], side: ['4'] });
      initSortfixForCards();

      const links = document.querySelectorAll('a[data-cid]');
      const link1 = document.querySelector('a[data-cid="1"]')!;
      const link4 = document.querySelector('a[data-cid="4"]')!;
      link1.setAttribute('data-ygo-next-sortfix', 'true');
      link4.setAttribute('data-ygo-next-sortfix', 'true');

      const result = getSortfixedCards();

      expect(result.length).toBe(2);
      expect(result).toContain(link1);
      expect(result).toContain(link4);
      expect(links.length).toBe(4);
    });
  });
});
