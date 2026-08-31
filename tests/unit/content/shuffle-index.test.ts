/**
 * shuffle/index.ts のテスト
 *
 * tests/design/shuffle-index/conditions.toml (TASK-330) のconditionをカバーする。
 * addShuffleButtons/shuffleCards自体はtests/design/add-shuffle-buttons、
 * tests/design/shuffle-cardsで別途検証済みのため、ここではinitShuffleの
 * 重複初期化防止・イベントリスナー登録のリトライロジックのみを対象とする。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EXTENSION_IDS } from '@/utils/dom-selectors';

const mockInitShuffleButtons = vi.fn();
const mockShuffleCards = vi.fn();
const mockSortCards = vi.fn();
const mockShuffleCardsExtra = vi.fn();
const mockSortCardsExtra = vi.fn();
const mockShuffleCardsSide = vi.fn();
const mockSortCardsSide = vi.fn();
vi.mock('@/content/shuffle/addShuffleButtons', () => ({
  addShuffleButtons: vi.fn(),
  initShuffleButtons: (...args: unknown[]) => mockInitShuffleButtons(...args)
}));
vi.mock('@/content/shuffle/shuffleCards', () => ({
  shuffleCards: (...args: unknown[]) => mockShuffleCards(...args),
  sortCards: (...args: unknown[]) => mockSortCards(...args),
  shuffleCardsExtra: (...args: unknown[]) => mockShuffleCardsExtra(...args),
  sortCardsExtra: (...args: unknown[]) => mockSortCardsExtra(...args),
  shuffleCardsSide: (...args: unknown[]) => mockShuffleCardsSide(...args),
  sortCardsSide: (...args: unknown[]) => mockSortCardsSide(...args)
}));

const mockInitSortfixForCards = vi.fn();
vi.mock('@/content/shuffle/sortfixCards', () => ({
  initSortfixForCards: (...args: unknown[]) => mockInitSortfixForCards(...args)
}));

type ShuffleIndexModule = typeof import('@/content/shuffle/index');

function createButtons(ids: string[]) {
  ids.forEach(id => {
    const btn = document.createElement('button');
    btn.id = id;
    document.body.appendChild(btn);
  });
}

describe('shuffle/index.ts', () => {
  let mod: ShuffleIndexModule;

  beforeEach(async () => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.useFakeTimers();
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
    vi.resetModules();
    mod = await import('@/content/shuffle/index');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('[covers:init_shuffle.already_initialized_skips] 2回目の呼び出しは何もしない', () => {
    mod.initShuffle();
    expect(mockInitShuffleButtons).toHaveBeenCalledTimes(1);

    mod.initShuffle();
    expect(mockInitShuffleButtons).toHaveBeenCalledTimes(1);
  });

  it('[covers:init_shuffle.ready_schedules_immediately][covers:attach_event_listeners.success_attaches_all_six_buttons] readyState=completeなら150ms後に全ボタンへリスナーが登録される', () => {
    createButtons([
      EXTENSION_IDS.shuffle.mainShuffleButton,
      EXTENSION_IDS.shuffle.mainSortButton,
      EXTENSION_IDS.shuffle.extraShuffleButton,
      EXTENSION_IDS.shuffle.extraSortButton,
      EXTENSION_IDS.shuffle.sideShuffleButton,
      EXTENSION_IDS.shuffle.sideSortButton
    ]);

    mod.initShuffle();
    vi.advanceTimersByTime(150);

    document.getElementById(EXTENSION_IDS.shuffle.mainShuffleButton)!.click();
    expect(mockShuffleCards).toHaveBeenCalledTimes(1);
    document.getElementById(EXTENSION_IDS.shuffle.mainSortButton)!.click();
    expect(mockSortCards).toHaveBeenCalledTimes(1);
    document.getElementById(EXTENSION_IDS.shuffle.extraShuffleButton)!.click();
    expect(mockShuffleCardsExtra).toHaveBeenCalledTimes(1);
    document.getElementById(EXTENSION_IDS.shuffle.extraSortButton)!.click();
    expect(mockSortCardsExtra).toHaveBeenCalledTimes(1);
    document.getElementById(EXTENSION_IDS.shuffle.sideShuffleButton)!.click();
    expect(mockShuffleCardsSide).toHaveBeenCalledTimes(1);
    document.getElementById(EXTENSION_IDS.shuffle.sideSortButton)!.click();
    expect(mockSortCardsSide).toHaveBeenCalledTimes(1);
  });

  it('[covers:init_shuffle.ready_schedules_immediately] readyState=completeなら200ms後にinitSortfixForCardsが呼ばれる', () => {
    mod.initShuffle();
    vi.advanceTimersByTime(200);

    expect(mockInitSortfixForCards).toHaveBeenCalledTimes(1);
  });

  it('[covers:init_shuffle.loading_waits_dom_content_loaded] readyState=loadingならDOMContentLoaded後に登録される', () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    createButtons([EXTENSION_IDS.shuffle.mainShuffleButton, EXTENSION_IDS.shuffle.mainSortButton]);

    mod.initShuffle();
    vi.advanceTimersByTime(1000);
    expect(mockShuffleCards).not.toHaveBeenCalled();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    vi.advanceTimersByTime(200);

    document.getElementById(EXTENSION_IDS.shuffle.mainShuffleButton)!.click();
    expect(mockShuffleCards).toHaveBeenCalledTimes(1);
    expect(mockInitSortfixForCards).toHaveBeenCalledTimes(1);
  });

  it('[covers:attach_event_listeners.main_buttons_missing_retries] メインボタンが無い場合100ms間隔で再試行する', () => {
    mod.initShuffle();
    vi.advanceTimersByTime(150); // 初回試行（ボタン無し）

    createButtons([EXTENSION_IDS.shuffle.mainShuffleButton, EXTENSION_IDS.shuffle.mainSortButton]);
    vi.advanceTimersByTime(100); // 1回目の再試行で見つかる

    document.getElementById(EXTENSION_IDS.shuffle.mainShuffleButton)!.click();
    expect(mockShuffleCards).toHaveBeenCalledTimes(1);
  });

  it('[covers:attach_event_listeners.max_retries_exceeded_logs_error] 50回再試行しても見つからない場合エラーログを出して終了する', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mod.initShuffle();
    // 初回(150ms) + 50回のリトライ(100ms間隔)を進める
    vi.advanceTimersByTime(150 + 100 * 51);

    expect(errorSpy).toHaveBeenCalledWith(
      '[Shuffle] Failed to attach event listeners after',
      50,
      'retries. Main shuffle buttons not found.'
    );
  });

  it('[covers:attach_button_listener.button_not_found_returns_false] extraボタンが無い場合はそのボタンだけスキップされる', () => {
    createButtons([EXTENSION_IDS.shuffle.mainShuffleButton, EXTENSION_IDS.shuffle.mainSortButton]);
    // extra/sideボタンは作らない

    mod.initShuffle();
    vi.advanceTimersByTime(150);

    expect(document.getElementById(EXTENSION_IDS.shuffle.extraShuffleButton)).toBeNull();
    document.getElementById(EXTENSION_IDS.shuffle.mainShuffleButton)!.click();
    expect(mockShuffleCards).toHaveBeenCalledTimes(1);
  });
});
