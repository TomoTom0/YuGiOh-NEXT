/**
 * addImageButton.ts のテスト
 *
 * tests/design/add-image-button/conditions.toml (TASK-330) のconditionをカバーする。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EXTENSION_IDS } from '@/utils/dom-selectors';

const mockShowImageDialog = vi.fn();
vi.mock('@/content/deck-recipe/imageDialog', () => ({
  showImageDialog: (...args: unknown[]) => mockShowImageDialog(...args)
}));

const mockIsDeckDisplayPage = vi.fn();
const mockDetectCardGameType = vi.fn();
const mockIsOwnDeck = vi.fn();
const mockGetDeckCgid = vi.fn();
vi.mock('@/utils/page-detector', () => ({
  isDeckDisplayPage: (...args: unknown[]) => mockIsDeckDisplayPage(...args),
  detectCardGameType: (...args: unknown[]) => mockDetectCardGameType(...args),
  isOwnDeck: (...args: unknown[]) => mockIsOwnDeck(...args),
  getDeckCgid: (...args: unknown[]) => mockGetDeckCgid(...args)
}));

const mockGetVueEditUrl = vi.fn();
vi.mock('@/utils/url-builder', () => ({
  getVueEditUrl: (...args: unknown[]) => mockGetVueEditUrl(...args)
}));

const mockEnsureParsedDeckInfo = vi.fn();
vi.mock('@/content/deck-display/card-detail-ui', () => ({
  ensureParsedDeckInfo: (...args: unknown[]) => mockEnsureParsedDeckInfo(...args)
}));

const mockCreateDeck = vi.fn();
const mockSaveDeck = vi.fn();
vi.mock('@/content/session/session', () => ({
  sessionManager: {
    createDeck: (...args: unknown[]) => mockCreateDeck(...args),
    saveDeck: (...args: unknown[]) => mockSaveDeck(...args)
  }
}));

import { addDeckImageButton, isDeckPage, initDeckImageButton } from '@/content/deck-recipe/addImageButton';

const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};

describe('addImageButton.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    mockDetectCardGameType.mockReturnValue('ocg');
    Object.defineProperty(window, 'location', {
      value: { href: 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?dno=5', search: '?dno=5' },
      writable: true
    });
  });

  function createBottomBtnSet(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'bottom_btn_set';
    document.body.appendChild(el);
    return el;
  }

  describe('addDeckImageButton', () => {
    it('[covers:add-deck-image-button.no-bottom-btn-set-returns-null] #bottom_btn_setが無ければnullを返す', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = addDeckImageButton();

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('[covers:add-deck-image-button.already-added-returns-null] 既にボタンがある場合nullを返す', () => {
      createBottomBtnSet();
      const existing = document.createElement('a');
      existing.id = EXTENSION_IDS.deckImage.deckImageButton;
      document.body.appendChild(existing);

      const result = addDeckImageButton();

      expect(result).toBeNull();
    });

    it('[covers:add-deck-image-button.success-adds-button-and-next-edit-button][covers:add-next-edit-button.own-deck-shows-edit-label] 正常時はボタンとNEXT編集ボタンを両方追加する', () => {
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(true);

      const result = addDeckImageButton();

      expect(result).not.toBeNull();
      expect(document.getElementById(EXTENSION_IDS.deckImage.deckImageButton)).not.toBeNull();
      const editBtn = document.getElementById(EXTENSION_IDS.deckEdit.editButton);
      expect(editBtn).not.toBeNull();
      expect(editBtn?.textContent).toBe('NEXT編集');
    });

    it('[covers:add-deck-image-button.click-opens-image-dialog] クリックでshowImageDialogが呼ばれる', async () => {
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(true);
      const button = addDeckImageButton();

      button?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(mockShowImageDialog).toHaveBeenCalled();
    });

    it('[covers:preload-deck-info.failure-logged-as-debug-only] preloadDeckInfoが失敗してもボタン追加は成功する', async () => {
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(true);
      mockEnsureParsedDeckInfo.mockRejectedValue(new Error('parse failed'));
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const result = addDeckImageButton();
      await flush();

      expect(result).not.toBeNull();
      expect(debugSpy).toHaveBeenCalled();
    });
  });

  describe('addNextEditButton (addDeckImageButton経由)', () => {
    it('[covers:add-next-edit-button.already-added-returns-null] 既にeditButtonがある場合は追加しない', () => {
      const bottomBtnSet = createBottomBtnSet();
      const existing = document.createElement('a');
      existing.id = EXTENSION_IDS.deckEdit.editButton;
      bottomBtnSet.appendChild(existing);
      mockIsOwnDeck.mockReturnValue(true);

      addDeckImageButton();

      // 既存の1個のみ（重複追加されない）
      expect(document.querySelectorAll(`#${EXTENSION_IDS.deckEdit.editButton}`).length).toBe(1);
    });

    it('[covers:add-next-edit-button.no-dno-in-url-returns-null] URLにdnoが無い場合はeditButtonを追加しない', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action', search: '' },
        writable: true
      });
      createBottomBtnSet();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      addDeckImageButton();

      expect(document.getElementById(EXTENSION_IDS.deckEdit.editButton)).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith('[YGO Helper] dno not found in URL');
    });

    it('[covers:add-next-edit-button.other-deck-shows-copy-label] 他人のデッキの場合ラベルは「NEXTコピー編集」', () => {
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(false);

      addDeckImageButton();

      expect(document.getElementById(EXTENSION_IDS.deckEdit.editButton)?.textContent).toBe('NEXTコピー編集');
    });

    it('[covers:add-next-edit-button.click-own-deck-navigates-to-edit-url] 自分のデッキはクリックで直接遷移する', async () => {
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(true);
      mockGetVueEditUrl.mockReturnValue('https://example.com/edit?dno=5');
      addDeckImageButton();
      await flush();
      const editBtn = document.getElementById(EXTENSION_IDS.deckEdit.editButton)!;

      editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(window.location.href).toBe('https://example.com/edit?dno=5');
      expect(mockCreateDeck).not.toHaveBeenCalled();
    });

    it('[covers:add-next-edit-button.click-other-deck-no-cgid-warns-only] 他人のデッキでcgid取得失敗時はコピー処理を開始しない', async () => {
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(false);
      mockGetDeckCgid.mockReturnValue(null);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      addDeckImageButton();
      await flush();
      const editBtn = document.getElementById(EXTENSION_IDS.deckEdit.editButton)!;

      editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(warnSpy).toHaveBeenCalledWith('[YGO Helper] Failed to get deck cgid');
      expect(mockCreateDeck).not.toHaveBeenCalled();
    });

    it('[covers:add-next-edit-button.click-other-deck-parsed-deck-null-stays-loading-silently] parsedDeckInfoがnullの場合はloading状態のまま何も起きない', async () => {
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(false);
      mockGetDeckCgid.mockReturnValue('cgid123');
      mockEnsureParsedDeckInfo.mockResolvedValue(null);
      addDeckImageButton();
      await flush();
      const editBtn = document.getElementById(EXTENSION_IDS.deckEdit.editButton)!;

      editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(editBtn.classList.contains('loading')).toBe(true);
      expect(mockCreateDeck).not.toHaveBeenCalled();
    });

    it('[covers:add-next-edit-button.click-other-deck-create-deck-fails-resets-button] createDeckが0を返す場合ボタンをリセットする', async () => {
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(false);
      mockGetDeckCgid.mockReturnValue('cgid123');
      mockEnsureParsedDeckInfo.mockResolvedValue({ mainDeck: [], extraDeck: [], sideDeck: [] });
      mockCreateDeck.mockResolvedValue(0);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      addDeckImageButton();
      await flush();
      const editBtn = document.getElementById(EXTENSION_IDS.deckEdit.editButton)!;

      editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(editBtn.classList.contains('loading')).toBe(false);
      expect(editBtn.textContent).toBe('NEXTコピー編集');
      expect(warnSpy).toHaveBeenCalledWith('[YGO Helper] Failed to create new deck');
    });

    it('[covers:add-next-edit-button.click-other-deck-save-fails-resets-button] saveDeckが失敗する場合ボタンをリセットし遷移しない', async () => {
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(false);
      mockGetDeckCgid.mockReturnValue('cgid123');
      mockEnsureParsedDeckInfo.mockResolvedValue({ mainDeck: [], extraDeck: [], sideDeck: [] });
      mockCreateDeck.mockResolvedValue(999);
      mockSaveDeck.mockResolvedValue({ success: false, error: ['error'] });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const hrefBefore = window.location.href;
      addDeckImageButton();
      await flush();
      const editBtn = document.getElementById(EXTENSION_IDS.deckEdit.editButton)!;

      editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(editBtn.classList.contains('loading')).toBe(false);
      expect(editBtn.classList.contains('loading2')).toBe(false);
      expect(window.location.href).toBe(hrefBefore);
      expect(warnSpy).toHaveBeenCalledWith('[YGO Helper] Failed to save copied deck');
    });

    it('[covers:add-next-edit-button.click-other-deck-success-navigates-with-new-dno] コピー成功時は新dnoで遷移する', async () => {
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(false);
      mockGetDeckCgid.mockReturnValue('cgid123');
      mockEnsureParsedDeckInfo.mockResolvedValue({ mainDeck: [], extraDeck: [], sideDeck: [] });
      mockCreateDeck.mockResolvedValue(999);
      mockSaveDeck.mockResolvedValue({ success: true });
      mockGetVueEditUrl.mockReturnValue('https://example.com/edit?dno=999');
      addDeckImageButton();
      await flush();
      const editBtn = document.getElementById(EXTENSION_IDS.deckEdit.editButton)!;

      editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(mockGetVueEditUrl).toHaveBeenCalledWith('ocg', 999, expect.anything());
      expect(window.location.href).toBe('https://example.com/edit?dno=999');
    });

    it('[covers:add-next-edit-button.click-other-deck-exception-resets-button] コピー処理中に例外が発生した場合ボタンをリセットする', async () => {
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(false);
      mockGetDeckCgid.mockReturnValue('cgid123');
      mockEnsureParsedDeckInfo.mockResolvedValue({ mainDeck: [], extraDeck: [], sideDeck: [] });
      mockCreateDeck.mockRejectedValue(new Error('network error'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      addDeckImageButton();
      await flush();
      const editBtn = document.getElementById(EXTENSION_IDS.deckEdit.editButton)!;

      editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(editBtn.classList.contains('loading')).toBe(false);
      expect(editBtn.textContent).toBe('NEXTコピー編集');
      expect(warnSpy).toHaveBeenCalledWith('[YGO Helper] Failed to copy deck:', expect.any(Error));
    });
  });

  describe('isDeckPage', () => {
    it('[covers:is-deck-page.delegates-to-is-deck-display-page] isDeckDisplayPageの結果をそのまま返す', () => {
      mockIsDeckDisplayPage.mockReturnValue(true);
      expect(isDeckPage()).toBe(true);

      mockIsDeckDisplayPage.mockReturnValue(false);
      expect(isDeckPage()).toBe(false);
    });
  });

  describe('initDeckImageButton', () => {
    it('[covers:init-deck-image-button.not-deck-display-page-does-nothing] デッキ表示ページでなければ何もしない', async () => {
      mockIsDeckDisplayPage.mockReturnValue(false);
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(true);

      initDeckImageButton();
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(document.getElementById(EXTENSION_IDS.deckImage.deckImageButton)).toBeNull();
    });

    it('[covers:init-deck-image-button.ready-schedules-timeout-immediately] readyState=completeなら100ms後にボタンが追加される', async () => {
      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
      mockIsDeckDisplayPage.mockReturnValue(true);
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(true);

      initDeckImageButton();
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(document.getElementById(EXTENSION_IDS.deckImage.deckImageButton)).not.toBeNull();
    });

    it('[covers:init-deck-image-button.loading-waits-dom-content-loaded] readyState=loadingならDOMContentLoaded後にボタンが追加される', async () => {
      Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
      mockIsDeckDisplayPage.mockReturnValue(true);
      createBottomBtnSet();
      mockIsOwnDeck.mockReturnValue(true);

      initDeckImageButton();
      expect(document.getElementById(EXTENSION_IDS.deckImage.deckImageButton)).toBeNull();

      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(document.getElementById(EXTENSION_IDS.deckImage.deckImageButton)).not.toBeNull();
    });
  });
});
