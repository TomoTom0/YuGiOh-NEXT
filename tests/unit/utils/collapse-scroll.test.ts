import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { collapseWithScroll } from '@/utils/collapse-scroll';

/**
 * collapse-scroll.ts のユニットテスト
 *
 * tests/design/collapse-scroll/conditions.toml の [covers:<id>] タグ運用に対応する。
 * happy-dom はレイアウトエンジンを持たないため、scrollHeight/clientHeight/scrollTop/
 * getBoundingClientRect は実装コードが参照する値をテストごとに明示的に上書きする。
 */

/** DOMRect互換オブジェクトを作る（asキャスト禁止のため全プロパティを明示） */
function makeRect(top: number): DOMRect {
  return {
    x: 0,
    y: top,
    width: 0,
    height: 0,
    top,
    right: 0,
    bottom: top,
    left: 0,
    toJSON() {
      return this;
    },
  };
}

/** scrollHeightをテスト中に動的に変更できるgetter付きitemElを作る */
function createItemEl(initialScrollHeight: number): { el: HTMLDivElement; setScrollHeight: (v: number) => void } {
  const el = document.createElement('div');
  let current = initialScrollHeight;
  Object.defineProperty(el, 'scrollHeight', {
    get: () => current,
    configurable: true,
  });
  return { el, setScrollHeight: (v: number) => (current = v) };
}

function createContainer(options: { clientHeight: number; scrollTop: number; top: number; className?: string }): HTMLDivElement {
  const container = document.createElement('div');
  container.className = options.className ?? 'card-tab-content';
  Object.defineProperty(container, 'clientHeight', {
    value: options.clientHeight,
    configurable: true,
  });
  Object.defineProperty(container, 'scrollTop', {
    value: options.scrollTop,
    configurable: true,
  });
  container.getBoundingClientRect = () => makeRect(options.top);
  container.scrollTo = vi.fn();
  return container;
}

describe('collapse-scroll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('collapseWithScroll', () => {
    it('[covers:collapse_with_scroll.set_collapsed_called_synchronously] setCollapsedはsetTimeoutスケジュール前に同期的に1回呼ばれる', () => {
      const { el } = createItemEl(200);
      const setCollapsed = vi.fn();

      collapseWithScroll(el, setCollapsed, 100);

      expect(setCollapsed).toHaveBeenCalledTimes(1);
      // タイマーを一切進めていない時点で既に呼ばれている
      expect(vi.getTimerCount()).toBe(1);
    });

    it('[covers:collapse_with_scroll.default_container_selector] containerSelector省略時は既定の.card-tab-contentが検索に使われる', async () => {
      const { el, setScrollHeight } = createItemEl(200);
      el.getBoundingClientRect = () => makeRect(50);
      const container = createContainer({ clientHeight: 300, scrollTop: 100, top: 0, className: 'card-tab-content' });
      container.appendChild(el);

      collapseWithScroll(el, vi.fn(), 100);
      setScrollHeight(150); // heightDiff = 50 > 0

      await vi.advanceTimersByTimeAsync(100);

      expect(container.scrollTo).toHaveBeenCalledTimes(1);
    });

    it('[covers:collapse_with_scroll.height_diff_non_positive_returns_early] heightDiffが0以下の場合はcontainer探索・scrollToを行わず早期returnする', async () => {
      const { el, setScrollHeight } = createItemEl(200);
      const closestSpy = vi.spyOn(el, 'closest');

      collapseWithScroll(el, vi.fn(), 100);
      setScrollHeight(200); // heightDiff = 0

      await vi.advanceTimersByTimeAsync(100);

      expect(closestSpy).not.toHaveBeenCalled();
    });

    it('[covers:collapse_with_scroll.container_not_found_returns_early] heightDiff>0でもclosestがnullを返す場合はscrollToを呼ばず例外も投げない', async () => {
      const { el, setScrollHeight } = createItemEl(200);
      el.closest = vi.fn(() => null);

      collapseWithScroll(el, vi.fn(), 100, '.no-such-container');
      setScrollHeight(150); // heightDiff = 50 > 0

      await expect(vi.advanceTimersByTimeAsync(100)).resolves.not.toThrow();
      expect(el.closest).toHaveBeenCalledWith('.no-such-container');
    });

    it('[covers:collapse_with_scroll.item_within_visible_area_scrolls] アイテム上端がコンテナ可視領域内ならscrollTo({top, behavior:"smooth"})が呼ばれる', async () => {
      const { el, setScrollHeight } = createItemEl(200);
      el.getBoundingClientRect = () => makeRect(100); // itemTop = 100
      const container = createContainer({ clientHeight: 300, scrollTop: 200, top: 0, className: 'custom-container' }); // containerTop + clientHeight = 300 > 100
      container.appendChild(el);

      collapseWithScroll(el, vi.fn(), 100, '.custom-container');
      setScrollHeight(150); // heightDiff = 50

      await vi.advanceTimersByTimeAsync(100);

      expect(container.scrollTo).toHaveBeenCalledTimes(1);
      expect(container.scrollTo).toHaveBeenCalledWith({ top: 150, behavior: 'smooth' });
    });

    it('[covers:collapse_with_scroll.scroll_top_clamped_at_zero] heightDiffがscrollTopを上回る場合はtopが0にクランプされる', async () => {
      const { el, setScrollHeight } = createItemEl(200);
      el.getBoundingClientRect = () => makeRect(100);
      const container = createContainer({ clientHeight: 300, scrollTop: 10, top: 0, className: 'custom-container' });
      container.appendChild(el);

      collapseWithScroll(el, vi.fn(), 100, '.custom-container');
      setScrollHeight(150); // heightDiff = 50 > scrollTop(10)

      await vi.advanceTimersByTimeAsync(100);

      expect(container.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('[covers:collapse_with_scroll.item_below_visible_area_no_scroll] アイテム上端がコンテナ可視領域より下ならscrollToは呼ばれない', async () => {
      const { el, setScrollHeight } = createItemEl(200);
      el.getBoundingClientRect = () => makeRect(500); // itemTop = 500
      const container = createContainer({ clientHeight: 300, scrollTop: 200, top: 0, className: 'custom-container' }); // containerTop + clientHeight = 300 <= 500
      container.appendChild(el);

      collapseWithScroll(el, vi.fn(), 100, '.custom-container');
      setScrollHeight(150); // heightDiff = 50 > 0

      await vi.advanceTimersByTimeAsync(100);

      expect(container.scrollTo).not.toHaveBeenCalled();
    });

    it('[covers:collapse_with_scroll.timeout_delays_measurement] timeout未経過ではDOM再計測・scrollToは行われない', async () => {
      const { el, setScrollHeight } = createItemEl(200);
      el.getBoundingClientRect = () => makeRect(100);
      const container = createContainer({ clientHeight: 300, scrollTop: 200, top: 0, className: 'custom-container' });
      container.appendChild(el);
      const closestSpy = vi.spyOn(el, 'closest');

      collapseWithScroll(el, vi.fn(), 100, '.custom-container');
      setScrollHeight(150); // heightDiff = 50 > 0

      await vi.advanceTimersByTimeAsync(50);
      expect(closestSpy).not.toHaveBeenCalled();
      expect(container.scrollTo).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(50);
      expect(closestSpy).toHaveBeenCalledTimes(1);
      expect(container.scrollTo).toHaveBeenCalledTimes(1);
    });
  });
});
