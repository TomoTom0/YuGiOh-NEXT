import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { animateCardMove, animateCardsMoveInSection } from '../../src/utils/card-animation';

/**
 * card-animation.ts のユニットテスト
 *
 * FLIP(First, Last, Invert, Play)技法によるカード移動アニメーションのロジックを検証。
 * tests/design/card-animation/conditions.toml の [covers:<id>] タグ運用に対応する。
 *
 * 両関数とも outer requestAnimationFrame 内で Last計測・Invert・リフロー強制を行い、
 * さらにネストした inner requestAnimationFrame 内で Play(transition解除)を行う二段構成のため、
 * requestAnimationFrame をキュー化してステップごとに手動でflushし、Invert直後・Play直後の
 * 中間状態を検証できるようにする。setTimeout は vi.useFakeTimers() で制御する。
 */

interface MockRect {
  top: number;
  left: number;
  width?: number;
  height?: number;
}

function mockRectValue(rect: MockRect): DOMRect {
  const width = rect.width ?? 100;
  const height = rect.height ?? 100;
  return {
    top: rect.top,
    left: rect.left,
    width,
    height,
    right: rect.left + width,
    bottom: rect.top + height,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({}),
  } as DOMRect;
}

/** getBoundingClientRectを呼び出し順に異なる座標を返すようにモックする */
function mockRectSequence(el: HTMLElement, rects: MockRect[]): void {
  let callCount = 0;
  el.getBoundingClientRect = vi.fn(() => {
    const rect = rects[Math.min(callCount, rects.length - 1)];
    callCount++;
    return mockRectValue(rect);
  });
}

describe('card-animation.ts', () => {
  let rafQueue: FrameRequestCallback[];

  /** キューに積まれたrAFコールバックを1フレーム分だけ実行する */
  function flushRaf(): void {
    const queue = rafQueue;
    rafQueue = [];
    queue.forEach(cb => cb(Date.now()));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    rafQueue = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('animateCardMove', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      mockElement = document.createElement('div');
      mockElement.className = 'deck-card';
      document.body.appendChild(mockElement);
    });

    afterEach(() => {
      document.body.removeChild(mockElement);
    });

    // [covers:animate_card_move.no_movement_no_animation]
    it('移動がない場合、Invert/Playを行わず即returnする', () => {
      mockRectSequence(mockElement, [{ top: 100, left: 100 }, { top: 100, left: 100 }]);

      animateCardMove(mockElement, 100);
      flushRaf(); // outer rAF: Last計測 -> delta=0,0 -> 早期return

      expect(mockElement.style.transform).toBe('');
      expect(mockElement.style.transition).toBe('');
      expect(rafQueue.length).toBe(0); // inner rAFは登録されない

      vi.advanceTimersByTime(1000);
      expect(mockElement.style.transform).toBe('');
    });

    // [covers:animate_card_move.movement_triggers_invert_and_play]
    it('移動がある場合、Invert(transform設定)後Play(transition設定・transform解除)を行う', () => {
      mockRectSequence(mockElement, [{ top: 100, left: 100 }, { top: 150, left: 150 }]);

      animateCardMove(mockElement, 100);
      flushRaf(); // outer rAF: Last計測 -> Invert

      expect(mockElement.style.transition).toBe('none');
      expect(mockElement.style.transform).toBe('translate(-50px, -50px)');

      flushRaf(); // inner rAF: Play

      expect(mockElement.style.transition).toBe('transform 100ms cubic-bezier(0.4, 0.0, 0.2, 1)');
      expect(mockElement.style.transform).toBe('');
    });

    // [covers:animate_card_move.cleanup_after_duration]
    it('duration ms後にtransition/transformがクリーンアップされる', () => {
      mockRectSequence(mockElement, [{ top: 100, left: 100 }, { top: 150, left: 150 }]);

      animateCardMove(mockElement, 100);
      flushRaf();
      flushRaf();

      vi.advanceTimersByTime(99);
      expect(mockElement.style.transition).not.toBe('');

      vi.advanceTimersByTime(1);
      expect(mockElement.style.transition).toBe('');
      expect(mockElement.style.transform).toBe('');
    });

    // [covers:animate_card_move.default_duration_fallback]
    it('duration省略時はデフォルト値300msが使われる', () => {
      mockRectSequence(mockElement, [{ top: 100, left: 100 }, { top: 150, left: 150 }]);

      animateCardMove(mockElement);
      flushRaf();
      flushRaf();

      expect(mockElement.style.transition).toContain('300ms');

      vi.advanceTimersByTime(299);
      expect(mockElement.style.transition).not.toBe('');

      vi.advanceTimersByTime(1);
      expect(mockElement.style.transition).toBe('');
      expect(mockElement.style.transform).toBe('');
    });
  });

  describe('animateCardsMoveInSection', () => {
    let sectionElement: HTMLElement;
    let card1: HTMLElement;
    let card2: HTMLElement;

    beforeEach(() => {
      sectionElement = document.createElement('div');
      sectionElement.className = 'deck-section';

      card1 = document.createElement('div');
      card1.className = 'deck-card';

      card2 = document.createElement('div');
      card2.className = 'deck-card';

      sectionElement.appendChild(card1);
      sectionElement.appendChild(card2);
      document.body.appendChild(sectionElement);
    });

    afterEach(() => {
      document.body.removeChild(sectionElement);
    });

    // [covers:animate_cards_move_in_section.null_section_guard]
    it('sectionElementがnullの場合、何もせず即returnする', () => {
      expect(() => {
        animateCardsMoveInSection(null as unknown as HTMLElement, 100);
      }).not.toThrow();

      expect(rafQueue.length).toBe(0);
    });

    // [covers:animate_cards_move_in_section.empty_cards_no_op]
    it('カードが存在しない場合、forEachは何もせずリフローだけ実行される', () => {
      const emptySection = document.createElement('div');
      document.body.appendChild(emptySection);
      const reflowSpy = vi.spyOn(emptySection, 'getBoundingClientRect');

      expect(() => {
        animateCardsMoveInSection(emptySection, 100);
      }).not.toThrow();

      flushRaf();
      expect(reflowSpy).toHaveBeenCalled();

      expect(() => flushRaf()).not.toThrow();
      vi.advanceTimersByTime(100);

      document.body.removeChild(emptySection);
    });

    // [covers:animate_cards_move_in_section.per_card_no_movement_skipped]
    it('移動していないカードはInvert処理がスキップされ、他カードの処理に影響しない', () => {
      mockRectSequence(card1, [{ top: 100, left: 100 }, { top: 100, left: 150 }]);
      mockRectSequence(card2, [{ top: 220, left: 100 }, { top: 220, left: 100 }]);

      animateCardsMoveInSection(sectionElement, 100);
      flushRaf(); // outer rAF: per-card Invert

      expect(card2.style.transform).toBe('');
      expect(card2.style.transition).toBe('');
    });

    // [covers:animate_cards_move_in_section.per_card_movement_invert]
    it('移動したカードにはtransition=noneとtransform=translateが設定される', () => {
      mockRectSequence(card1, [{ top: 100, left: 100 }, { top: 100, left: 150 }]);
      mockRectSequence(card2, [{ top: 220, left: 100 }, { top: 220, left: 100 }]);

      animateCardsMoveInSection(sectionElement, 100);
      flushRaf();

      expect(card1.style.transition).toBe('none');
      expect(card1.style.transform).toBe('translate(-50px, 0px)');
    });

    // [covers:animate_cards_move_in_section.play_step_conditional_on_transform]
    it('Playステップは移動したカードのみ対象で、移動していないカードのtransitionは変更されない', () => {
      mockRectSequence(card1, [{ top: 100, left: 100 }, { top: 100, left: 150 }]);
      mockRectSequence(card2, [{ top: 220, left: 100 }, { top: 220, left: 100 }]);

      animateCardsMoveInSection(sectionElement, 100);
      flushRaf(); // outer: Invert
      flushRaf(); // inner: Play

      expect(card1.style.transition).toBe('transform 100ms cubic-bezier(0.4, 0.0, 0.2, 1)');
      expect(card1.style.transform).toBe('');
      expect(card2.style.transition).toBe('');
      expect(card2.style.transform).toBe('');
    });

    // [covers:animate_cards_move_in_section.cleanup_unconditional_all_cards]
    it('duration ms後は移動有無に関わらず全カードがクリーンアップされる', () => {
      mockRectSequence(card1, [{ top: 100, left: 100 }, { top: 100, left: 150 }]);
      mockRectSequence(card2, [{ top: 220, left: 100 }, { top: 220, left: 100 }]);

      animateCardsMoveInSection(sectionElement, 100);
      flushRaf();
      flushRaf();

      vi.advanceTimersByTime(100);

      expect(card1.style.transition).toBe('');
      expect(card1.style.transform).toBe('');
      expect(card2.style.transition).toBe('');
      expect(card2.style.transform).toBe('');
    });

    // [covers:animate_cards_move_in_section.default_duration_fallback]
    it('duration省略時はデフォルト値300msが使われる', () => {
      mockRectSequence(card1, [{ top: 100, left: 100 }, { top: 100, left: 150 }]);
      mockRectSequence(card2, [{ top: 220, left: 100 }, { top: 220, left: 220 }]);

      animateCardsMoveInSection(sectionElement);
      flushRaf();
      flushRaf();

      expect(card1.style.transition).toContain('300ms');

      vi.advanceTimersByTime(299);
      expect(card1.style.transition).not.toBe('');

      vi.advanceTimersByTime(1);
      expect(card1.style.transition).toBe('');
      expect(card2.style.transition).toBe('');
    });
  });
});
