import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePracticeDragState } from '@/composables/practice/usePracticeDragState';

function dragoverEvent(clientX: number, clientY: number): Event {
  return new MouseEvent('dragover', { clientX, clientY });
}

function dragendEvent(): Event {
  return new Event('dragend');
}

function contextmenuEvent(): Event {
  return new MouseEvent('contextmenu', { cancelable: true });
}

function keydownEvent(key: string): Event {
  return new KeyboardEvent('keydown', { key });
}

function makeContainer(rect: { top: number; bottom: number }): HTMLElement {
  const el = document.createElement('div');
  el.className = 'practice-field-container';
  el.scrollTop = 0;
  el.getBoundingClientRect = () =>
    ({
      top: rect.top,
      bottom: rect.bottom,
      left: 0,
      right: 0,
      width: 0,
      height: rect.bottom - rect.top,
      x: 0,
      y: rect.top,
      toJSON: () => ({})
    }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

describe('usePracticeDragState conditions', () => {
  // usePracticeDragStateはモジュールスコープの単一stateを返すシングルトン実装のため、
  // 全テストで同一インスタンスを共有する。
  const state = usePracticeDragState();

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    state.endDrag();
    // 前テストで仕込まれたcontextmenuクリーンアップ用タイマー(200ms/250ms)を実行しきり、
    // rotateTimeoutId/contextmenuListenerをモジュール内部で確実にnullへ戻す
    // (clearAllTimersはタイマー参照を破棄するだけでコールバックを実行しないため使わない)。
    vi.advanceTimersByTime(1000);
    state.postDragRotation.value = false;
  });

  afterEach(() => {
    state.endDrag();
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('[covers:auto_scroll.throttle_skips_within_50ms] [covers:auto_scroll.bottom_threshold_scrolls_down] [covers:auto_scroll.top_threshold_scrolls_up] [covers:auto_scroll.middle_zone_no_scroll] dragover時の自動スクロールはしきい値と50msスロットルに従う', () => {
    const container = makeContainer({ top: 100, bottom: 500 });
    state.startDrag('c1', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 });

    document.dispatchEvent(dragoverEvent(0, 450)); // bottom-80=420 より下 -> 下スクロール
    expect(container.scrollTop).toBe(8);

    document.dispatchEvent(dragoverEvent(0, 450)); // 50ms未満なのでスロットルされ変化なし
    expect(container.scrollTop).toBe(8);

    vi.advanceTimersByTime(51);
    document.dispatchEvent(dragoverEvent(0, 150)); // top+80=180 より上 -> 上スクロール
    expect(container.scrollTop).toBe(0);

    vi.advanceTimersByTime(51);
    document.dispatchEvent(dragoverEvent(0, 300)); // 中間帯 -> 変化なし
    expect(container.scrollTop).toBe(0);
  });

  it('[covers:start_drag.orientation_horizontal_sets_rotated] [covers:start_drag.orientation_vertical_clears_rotated] startDragはorientationに応じてdraggingRotatedを設定する', () => {
    state.startDrag('c1', 'horizontal', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 });
    expect(state.draggingRotated.value).toBe(true);

    state.endDrag();
    state.startDrag('c2', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 });
    expect(state.draggingRotated.value).toBe(false);
  });

  it('[covers:start_drag.dragend_schedules_cleanup_when_right_click_enabled] dragendはonRightClick指定時のみ200ms後にcontextmenuリスナー解除タイマーを仕込む', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const onRightClick = vi.fn();
    state.startDrag('c1', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 }, onRightClick);

    document.dispatchEvent(dragendEvent());
    expect(removeSpy).not.toHaveBeenCalledWith('contextmenu', expect.any(Function));

    vi.advanceTimersByTime(200);
    expect(removeSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function));

    removeSpy.mockClear();
    state.startDrag('c2', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 }); // onRightClickなし
    document.dispatchEvent(dragendEvent());
    vi.advanceTimersByTime(200);
    expect(removeSpy).not.toHaveBeenCalledWith('contextmenu', expect.any(Function));

    removeSpy.mockRestore();
  });

  it('[covers:start_drag.right_click_listeners_registered_only_when_callback_given] onRightClick未指定時はcontextmenu/keydownリスナーが登録されない', () => {
    state.startDrag('c1', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 });

    document.dispatchEvent(keydownEvent('r'));
    document.dispatchEvent(contextmenuEvent());

    expect(state.postDragRotation.value).toBe(false);
    expect(state.draggingCardId.value).toBe('c1');
  });

  it('[covers:start_drag.contextmenu_within_rotate_timeout_sets_post_drag_rotation] dragend後200ms以内のcontextmenuはpostDragRotationをtrueにしonRightClickは呼ばない', () => {
    const onRightClick = vi.fn();
    state.startDrag('c1', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 }, onRightClick);
    document.dispatchEvent(dragendEvent());

    vi.advanceTimersByTime(100);
    document.dispatchEvent(contextmenuEvent());

    expect(state.postDragRotation.value).toBe(true);
    expect(onRightClick).not.toHaveBeenCalled();
  });

  it('[covers:start_drag.contextmenu_mid_drag_calls_right_click_handler] dragend前のcontextmenuはonRightClickを直接呼ぶ', () => {
    const onRightClick = vi.fn();
    state.startDrag('c1', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 }, onRightClick);

    document.dispatchEvent(contextmenuEvent());

    expect(onRightClick).toHaveBeenCalledTimes(1);
    expect(state.postDragRotation.value).toBe(false);
  });

  it('[covers:start_drag.contextmenu_after_drag_cleared_is_noop] clearDragCard後のcontextmenuは何もしない', () => {
    const onRightClick = vi.fn();
    state.startDrag('c1', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 }, onRightClick);
    state.clearDragCard();

    document.dispatchEvent(contextmenuEvent());

    expect(onRightClick).not.toHaveBeenCalled();
    expect(state.postDragRotation.value).toBe(false);
  });

  it('[covers:start_drag.keydown_r_triggers_right_click_others_ignored] keydownはr/RのみonRightClickを呼ぶ', () => {
    const onRightClick = vi.fn();
    state.startDrag('c1', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 }, onRightClick);

    document.dispatchEvent(keydownEvent('a'));
    expect(onRightClick).not.toHaveBeenCalled();

    document.dispatchEvent(keydownEvent('r'));
    expect(onRightClick).toHaveBeenCalledTimes(1);

    document.dispatchEvent(keydownEvent('R'));
    expect(onRightClick).toHaveBeenCalledTimes(2);
  });

  it('[covers:toggle_drag_rotation.guarded_by_dragging_card_id] toggleDragRotationはdraggingCardIdがある時だけ反転する', () => {
    expect(state.draggingCardId.value).toBeNull();
    state.toggleDragRotation();
    expect(state.draggingRotated.value).toBe(false);

    state.startDrag('c1', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 });
    expect(state.draggingRotated.value).toBe(false);
    state.toggleDragRotation();
    expect(state.draggingRotated.value).toBe(true);
    state.toggleDragRotation();
    expect(state.draggingRotated.value).toBe(false);
  });

  it('[covers:end_drag.resets_state_to_defaults] endDragは全stateを初期値へ戻す', () => {
    state.startDrag('c1', 'horizontal', 'img.png', { x: 5, y: 5 }, { width: 80, height: 120 });
    state.setDraggingFaceDown(true);
    state.setDraggingStackTop(true);

    state.endDrag();

    expect(state.draggingCardId.value).toBeNull();
    expect(state.draggingRotated.value).toBe(false);
    expect(state.draggingFaceDown.value).toBe(false);
    expect(state.draggingImageUrl.value).toBeNull();
    expect(state.draggingPos.value).toEqual({ x: -9999, y: -9999 });
    expect(state.draggingStackTop.value).toBeNull();
    expect(state.draggingCardSize.value).toEqual({ width: 36, height: 53 });
  });

  it('[covers:end_drag.removes_listeners_only_if_registered] endDragは同じリスナーを二重に解除しようとしない', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    state.startDrag('c1', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 });

    state.endDrag();
    expect(removeSpy).toHaveBeenCalledWith('dragover', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('dragend', expect.any(Function));

    removeSpy.mockClear();
    expect(() => state.endDrag()).not.toThrow();
    expect(removeSpy).not.toHaveBeenCalledWith('dragover', expect.any(Function));
    expect(removeSpy).not.toHaveBeenCalledWith('dragend', expect.any(Function));
    expect(removeSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));

    removeSpy.mockRestore();
  });

  it('[covers:end_drag.contextmenu_listener_deferred_cleanup_only_when_registered] endDragはcontextmenuListener登録時のみ250ms後に解除する', () => {
    const onRightClick = vi.fn();
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    state.startDrag('c1', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 }, onRightClick);
    state.endDrag();

    expect(removeSpy).not.toHaveBeenCalledWith('contextmenu', expect.any(Function));
    vi.advanceTimersByTime(250);
    expect(removeSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function));

    removeSpy.mockClear();
    state.startDrag('c2', 'vertical', 'img.png', { x: 0, y: 0 }, { width: 36, height: 53 }); // onRightClickなし
    state.endDrag();
    vi.advanceTimersByTime(250);
    expect(removeSpy).not.toHaveBeenCalledWith('contextmenu', expect.any(Function));

    removeSpy.mockRestore();
  });
});
