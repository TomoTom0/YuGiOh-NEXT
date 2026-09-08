/**
 * regulation-ui.ts setupRegulationDisplay の適用パスのテスト
 * （PR#151レビュー指摘 Thread 2/3 対応で追加）。
 *
 * 対象:
 *   1. 適用対象リスト（OCG過去版）の取得失敗時: 取得不能な版を「無制限」と同じ扱いで
 *      描画せず、直前の選択（初回auto適用の失敗時はネイティブ表示）に戻し、
 *      tooltip・トリガー警告色で報告する
 *   2. 未キャッシュ過去版のfetch中に別版を選択した場合: 遅く完了した古い選択（stale世代）は
 *      新しい選択の描画結果（バッジ・tooltip・ネイティブ表示切替）を上書きしない
 *   3. 正常系: OCG過去版適用成功時に上書きバッジを描画しネイティブ表示を隠す
 *
 * 実装参照: src/content/deck-display/regulation-ui.ts（applyResolved / renderApplied /
 * ensureResolvedList / renderRegulationControl.update）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  ocg: {
    init: vi.fn(),
    checkAndUpdate: vi.fn(),
    getAvailableDates: vi.fn(),
    ensureList: vi.fn(),
    hasList: vi.fn(),
    getRegulation: vi.fn()
  },
  genesys: {
    init: vi.fn(),
    checkAndUpdate: vi.fn(),
    getAvailableListParams: vi.fn(),
    ensureList: vi.fn(),
    ensureCurrentList: vi.fn(),
    getPoint: vi.fn()
  },
  deckName: { value: 'テストデッキ' },
  ensureParsedDeckInfo: vi.fn()
}));

vi.mock('@/utils/forbidden-limited-cache', () => ({ forbiddenLimitedCache: mocks.ocg }));
vi.mock('@/utils/genesys-cache', () => ({ genesysPointCache: mocks.genesys }));
vi.mock('@/utils/temp-cache-db', () => ({ getTempCacheDB: () => null }));
vi.mock('../../parser/deck-detail-parser', () => ({
  extractDeckNameFromMeta: () => mocks.deckName.value
}));

import { setupRegulationDisplay } from '../regulation-ui';

/** マイクロタスク・タイマーを一巡させ、applyResolvedのawait連鎖を進める */
const flushAsync = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
};

/** 閲覧ページ相当のDOM（メインデッキ1枚 + ネイティブの禁止バッジ付きカード） */
const setupDom = (): void => {
  document.body.innerHTML = `
    <div id="message"><p>制限カードが2枚を超えています</p></div>
    <div id="deck_image">
      <div id="main">
        <div class="subcatergory">
          <div class="top"><h3>メインデッキ <span>(40枚)</span></h3></div>
        </div>
        <div class="image_set">
          <span class="forbidden"><div>forbidden</div></span>
          <a href="https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=10000">card</a>
        </div>
      </div>
    </div>
  `;
};

const trigger = (): HTMLElement => document.querySelector<HTMLElement>('.ygo-next-regulation-trigger')!;
const nativeOverlay = (): HTMLElement =>
  document.querySelector<HTMLElement>('#deck_image .image_set span.forbidden > div')!;
const cardBadges = (className: string): NodeListOf<HTMLElement> =>
  document.querySelectorAll<HTMLElement>(`.ygo-next-regulation-card-badge.${className}`);
const selectedItemValue = (): string | null => {
  const item = document.querySelector<HTMLElement>('.ygo-next-regulation-menu-item.is-selected');
  return item?.dataset.value ?? null;
};
const clickMenuItem = (value: string): void => {
  const item = document.querySelector<HTMLElement>(`.ygo-next-regulation-menu-item[data-value="${value}"]`);
  if (!item) throw new Error(`menu item not found: ${value}`);
  item.click();
};

describe('setupRegulationDisplay の適用パス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deckName.value = 'テストデッキ';
    mocks.ocg.init.mockResolvedValue(undefined);
    mocks.ocg.checkAndUpdate.mockResolvedValue(undefined);
    mocks.ocg.getAvailableDates.mockReturnValue(['2025-04-01', '2025-01-01', '2024-01-01', '2023-01-01']);
    mocks.ocg.ensureList.mockResolvedValue({ list: true });
    mocks.ocg.hasList.mockReturnValue(true);
    mocks.ocg.getRegulation.mockReturnValue(undefined);
    mocks.genesys.init.mockResolvedValue(undefined);
    mocks.genesys.checkAndUpdate.mockResolvedValue(undefined);
    mocks.genesys.getAvailableListParams.mockReturnValue([]);
    mocks.ensureParsedDeckInfo.mockResolvedValue(null);
    setupDom();
  });

  it('[covers:regulation_apply.ocg_past_success_renders_override_badges] OCG過去版の適用成功時、上書きバッジを描画しネイティブ表示を隠す', async () => {
    mocks.deckName.value = '[OCG-2401] テストデッキ';
    mocks.ocg.getRegulation.mockReturnValue('limited');

    await setupRegulationDisplay(mocks.ensureParsedDeckInfo);

    expect(cardBadges('ygo-next-limit-limited')).toHaveLength(1);
    expect(nativeOverlay().style.display).toBe('none');
    expect(trigger().title).toContain('OCG 2024年01月版');
    expect(trigger().title).not.toContain('リストを取得できなかった');
    expect(trigger().classList.contains('is-unavailable')).toBe(false);
  });

  it('[covers:regulation_apply.list_fetch_failure_on_initial_auto_reverts_to_native] 初回auto適用でリスト取得に失敗した場合、ネイティブ表示を維持し警告を出す', async () => {
    mocks.deckName.value = '[OCG-2401] テストデッキ';
    mocks.ocg.ensureList.mockResolvedValue(null);
    mocks.ocg.hasList.mockReturnValue(false);

    await setupRegulationDisplay(mocks.ensureParsedDeckInfo);

    // タグ無し扱いに戻る: ネイティブの禁止表示は非表示にされず、独自バッジも描画しない
    expect(nativeOverlay().style.display).toBe('');
    expect(cardBadges('ygo-next-limit-limited')).toHaveLength(0);
    expect(cardBadges('ygo-next-limit-forbidden')).toHaveLength(0);
    // tooltipとトリガー警告色で取得失敗を報告する
    expect(trigger().title).toContain('指定 OCG 2024年01月版 のリストを取得できなかったため、直前の選択に戻しました');
    expect(trigger().classList.contains('is-unavailable')).toBe(true);
  });

  it('[covers:regulation_apply.list_fetch_failure_on_manual_selection_keeps_previous] 手動選択した過去版の取得に失敗した場合、直前の選択（メニュー選択状態含む）に戻し警告を出す', async () => {
    await setupRegulationDisplay(mocks.ensureParsedDeckInfo);
    // 初期状態: デッキ名タグ無し → ネイティブ表示（AUTO選択）
    expect(selectedItemValue()).toBe('auto');
    expect(nativeOverlay().style.display).toBe('');

    mocks.ocg.ensureList.mockResolvedValue(null);
    mocks.ocg.hasList.mockReturnValue(false);
    clickMenuItem('ocg:2024-01-01');
    await flushAsync();

    // 直前の選択（auto = ネイティブ表示）に戻る。メニューの選択状態も戻す
    expect(selectedItemValue()).toBe('auto');
    expect(nativeOverlay().style.display).toBe('');
    expect(cardBadges('ygo-next-limit-forbidden')).toHaveLength(0);
    expect(trigger().title).toContain('指定 OCG 2024年01月版 のリストを取得できなかったため、直前の選択に戻しました');
    expect(trigger().classList.contains('is-unavailable')).toBe(true);
  });

  it('[covers:regulation_apply.stale_completion_does_not_overwrite_newer_selection] 取得の遅い古い選択は、後から選択した新しい版の描画結果を上書きしない', async () => {
    await setupRegulationDisplay(mocks.ensureParsedDeckInfo);

    // 1回目の選択（2024-01-01）はリスト取得が遅くpendingする
    let resolveSlowFetch: (value: unknown) => void = () => { /* flushAsync後に setter が代入される */ };
    mocks.ocg.ensureList.mockImplementation(async (date: string) => {
      if (date === '2024-01-01') {
        await new Promise(resolve => { resolveSlowFetch = resolve; });
      }
      return { list: true };
    });
    mocks.ocg.getRegulation.mockImplementation((_cid: string, date: string) =>
      date === '2023-01-01' ? 'forbidden' : undefined
    );

    clickMenuItem('ocg:2024-01-01');
    await flushAsync();

    // pendingの間に別版（2023-01-01）を選択 → こちらが先に描画される
    clickMenuItem('ocg:2023-01-01');
    await flushAsync();

    expect(trigger().title).toContain('OCG 2023年01月版');
    expect(cardBadges('ygo-next-limit-forbidden')).toHaveLength(1);
    expect(nativeOverlay().style.display).toBe('none');

    // 1回目の選択のリスト取得が遅れて完了しても、2023年の描画結果を上書きしない
    resolveSlowFetch({});
    await flushAsync();

    expect(trigger().title).toContain('OCG 2023年01月版');
    expect(cardBadges('ygo-next-limit-forbidden')).toHaveLength(1);
    expect(nativeOverlay().style.display).toBe('none');
  });
});
