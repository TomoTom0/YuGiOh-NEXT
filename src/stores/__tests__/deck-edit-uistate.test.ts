import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDeckEditStore } from '../deck-edit';
import type { CardInfo } from '@/types/card';

/**
 * deck-edit.ts の UI状態管理テスト
 *
 * 以下の状態を検証：
 * 1. 検索・フィルター状態（searchQuery, isGlobalSearchMode, currentPage, hasMore, isLoading）
 * 2. ダイアログ表示状態（showDetail, overlayVisible, 各showXXXDialog）
 * 3. Undo/Redo状態（canUndo, canRedo）
 */

const mockCard = (id: string, name: string = 'Test Card'): CardInfo => ({
  name,
  cardId: id,
  ciid: '1',
  imgs: [{ ciid: '1', imgHash: `${id}_1_1_1` }],
  cardType: 'monster' as const,
  attribute: 'dark' as const,
  levelType: 'level' as const,
  levelValue: 4,
  race: 'spellcaster' as const,
  types: ['normal' as const],
  isExtraDeck: false
});

describe('deck-edit store: UI状態管理', () => {
  let store: ReturnType<typeof useDeckEditStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useDeckEditStore();
  });

  describe('初期状態', () => {
    it('初期状態で検索クエリが空である', () => {
      expect(store.searchQuery).toBe('');
    });

    it('初期状態で詳細表示がtrueである', () => {
      expect(store.showDetail).toBe(true);
    });

    it('初期状態でローディングがfalseである', () => {
      expect(store.isLoading).toBe(false);
    });

    it('初期状態で現在ページが0である', () => {
      expect(store.currentPage).toBe(0);
    });

    it('初期状態で次ページがないである', () => {
      expect(store.hasMore).toBe(false);
    });

    it('初期状態でグローバルサーチモードがfalseである', () => {
      expect(store.isGlobalSearchMode).toBe(false);
    });

    it('初期状態でオーバーレイが非表示である', () => {
      expect(store.overlayVisible).toBe(false);
    });

    it('初期状態でcanUndoがfalseである', () => {
      expect(store.canUndo).toBe(false);
    });

    it('初期状態でcanRedoがfalseである', () => {
      expect(store.canRedo).toBe(false);
    });
  });

  describe('検索状態管理', () => {
    it('searchQueryを設定できる', () => {
      store.searchQuery = 'ブラック・マジシャン';
      expect(store.searchQuery).toBe('ブラック・マジシャン');
    });

    it('searchQueryを空にできる', () => {
      store.searchQuery = 'テスト';
      store.searchQuery = '';
      expect(store.searchQuery).toBe('');
    });

    it('isGlobalSearchModeをtrueに設定できる', () => {
      store.isGlobalSearchMode = true;
      expect(store.isGlobalSearchMode).toBe(true);
    });

    it('isGlobalSearchModeをfalseに戻せる', () => {
      store.isGlobalSearchMode = true;
      store.isGlobalSearchMode = false;
      expect(store.isGlobalSearchMode).toBe(false);
    });

    it('currentPageをインクリメント可能', () => {
      expect(store.currentPage).toBe(0);
      store.currentPage = 1;
      expect(store.currentPage).toBe(1);
      store.currentPage = 2;
      expect(store.currentPage).toBe(2);
    });

    it('currentPageをリセットできる', () => {
      store.currentPage = 5;
      store.currentPage = 0;
      expect(store.currentPage).toBe(0);
    });

    it('hasMoreをtrueに設定できる', () => {
      store.hasMore = true;
      expect(store.hasMore).toBe(true);
    });

    it('hasMoreをfalseに戻せる', () => {
      store.hasMore = true;
      store.hasMore = false;
      expect(store.hasMore).toBe(false);
    });

    it('isLoadingをtrueに設定できる', () => {
      store.isLoading = true;
      expect(store.isLoading).toBe(true);
    });

    it('isLoadingをfalseに戻せる', () => {
      store.isLoading = true;
      store.isLoading = false;
      expect(store.isLoading).toBe(false);
    });
  });

  describe('詳細表示状態', () => {
    it('showDetailをfalseに設定できる', () => {
      expect(store.showDetail).toBe(true);
      store.showDetail = false;
      expect(store.showDetail).toBe(false);
    });

    it('showDetailをtrueに戻せる', () => {
      store.showDetail = false;
      store.showDetail = true;
      expect(store.showDetail).toBe(true);
    });

    it('showDetailとは独立して検索クエリを管理できる', () => {
      store.showDetail = false;
      store.searchQuery = 'テスト';
      expect(store.showDetail).toBe(false);
      expect(store.searchQuery).toBe('テスト');
    });
  });

  describe('オーバーレイ状態', () => {
    it('overlayVisibleをtrueに設定できる', () => {
      expect(store.overlayVisible).toBe(false);
      store.overlayVisible = true;
      expect(store.overlayVisible).toBe(true);
    });

    it('overlayVisibleをfalseに戻せる', () => {
      store.overlayVisible = true;
      store.overlayVisible = false;
      expect(store.overlayVisible).toBe(false);
    });

    it('overlayZIndexを変更できる', () => {
      const initialZIndex = store.overlayZIndex;
      store.overlayZIndex = 20000;
      expect(store.overlayZIndex).toBe(20000);
      expect(store.overlayZIndex).not.toBe(initialZIndex);
    });

    it('overlayVisibleとoverlayZIndexは独立して管理される', () => {
      store.overlayVisible = true;
      store.overlayZIndex = 15000;
      expect(store.overlayVisible).toBe(true);
      expect(store.overlayZIndex).toBe(15000);
    });
  });

  describe('ダイアログ表示状態', () => {
    it('showExportDialogをトグル可能', () => {
      expect(store.showExportDialog).toBe(false);
      store.showExportDialog = true;
      expect(store.showExportDialog).toBe(true);
      store.showExportDialog = false;
      expect(store.showExportDialog).toBe(false);
    });

    it('showImportDialogをトグル可能', () => {
      expect(store.showImportDialog).toBe(false);
      store.showImportDialog = true;
      expect(store.showImportDialog).toBe(true);
      store.showImportDialog = false;
      expect(store.showImportDialog).toBe(false);
    });

    it('showOptionsDialogをトグル可能', () => {
      expect(store.showOptionsDialog).toBe(false);
      store.showOptionsDialog = true;
      expect(store.showOptionsDialog).toBe(true);
      store.showOptionsDialog = false;
      expect(store.showOptionsDialog).toBe(false);
    });

    it('showLoadDialogをトグル可能', () => {
      expect(store.showLoadDialog).toBe(false);
      store.showLoadDialog = true;
      expect(store.showLoadDialog).toBe(true);
      store.showLoadDialog = false;
      expect(store.showLoadDialog).toBe(false);
    });

    it('showDeleteConfirmをトグル可能', () => {
      expect(store.showDeleteConfirm).toBe(false);
      store.showDeleteConfirm = true;
      expect(store.showDeleteConfirm).toBe(true);
      store.showDeleteConfirm = false;
      expect(store.showDeleteConfirm).toBe(false);
    });

    it('showUnsavedChangesDialogをトグル可能', () => {
      expect(store.showUnsavedChangesDialog).toBe(false);
      store.showUnsavedChangesDialog = true;
      expect(store.showUnsavedChangesDialog).toBe(true);
      store.showUnsavedChangesDialog = false;
      expect(store.showUnsavedChangesDialog).toBe(false);
    });

    it('複数ダイアログの状態は独立している', () => {
      store.showExportDialog = true;
      store.showImportDialog = true;
      store.showOptionsDialog = false;

      expect(store.showExportDialog).toBe(true);
      expect(store.showImportDialog).toBe(true);
      expect(store.showOptionsDialog).toBe(false);
    });

    it('すべてのダイアログを同時に開くことができる', () => {
      store.showExportDialog = true;
      store.showImportDialog = true;
      store.showOptionsDialog = true;
      store.showLoadDialog = true;
      store.showDeleteConfirm = true;
      store.showUnsavedChangesDialog = true;

      expect(store.showExportDialog).toBe(true);
      expect(store.showImportDialog).toBe(true);
      expect(store.showOptionsDialog).toBe(true);
      expect(store.showLoadDialog).toBe(true);
      expect(store.showDeleteConfirm).toBe(true);
      expect(store.showUnsavedChangesDialog).toBe(true);
    });

    it('すべてのダイアログを閉じることができる', () => {
      // 全て開く
      store.showExportDialog = true;
      store.showImportDialog = true;
      store.showOptionsDialog = true;
      store.showLoadDialog = true;
      store.showDeleteConfirm = true;
      store.showUnsavedChangesDialog = true;

      // 全て閉じる
      store.showExportDialog = false;
      store.showImportDialog = false;
      store.showOptionsDialog = false;
      store.showLoadDialog = false;
      store.showDeleteConfirm = false;
      store.showUnsavedChangesDialog = false;

      expect(store.showExportDialog).toBe(false);
      expect(store.showImportDialog).toBe(false);
      expect(store.showOptionsDialog).toBe(false);
      expect(store.showLoadDialog).toBe(false);
      expect(store.showDeleteConfirm).toBe(false);
      expect(store.showUnsavedChangesDialog).toBe(false);
    });
  });

  describe('Undo/Redo状態', () => {
    it('初期状態ではcanUndoがfalseである', () => {
      expect(store.canUndo).toBe(false);
    });

    it('初期状態ではcanRedoがfalseである', () => {
      expect(store.canRedo).toBe(false);
    });

    it('コマンド実行後canUndoがtrueになる', () => {
      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');

      expect(store.canUndo).toBe(true);
    });

    it('undoする前はcanRedoがfalseである', () => {
      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');

      expect(store.canRedo).toBe(false);
    });

    it('undo実行後canRedoがtrueになる', () => {
      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');
      expect(store.canUndo).toBe(true);

      store.undo();
      expect(store.canRedo).toBe(true);
    });

    it('redo実行後canRedoがfalseに戻る', () => {
      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');

      store.undo();
      expect(store.canRedo).toBe(true);

      store.redo();
      expect(store.canRedo).toBe(false);
    });

    it('複数のコマンド実行後、複数回undoできる', () => {
      const cardA = mockCard('1001', 'カードA');
      const cardB = mockCard('1002', 'カードB');

      store.addCard(cardA, 'main');
      expect(store.canUndo).toBe(true);
      expect(store.canRedo).toBe(false);

      store.addCard(cardB, 'main');
      expect(store.canUndo).toBe(true);
      expect(store.canRedo).toBe(false);

      store.undo();
      expect(store.canUndo).toBe(true);
      expect(store.canRedo).toBe(true);

      store.undo();
      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(true);
    });

    it('複数のコマンド実行後、複数回redoできる', () => {
      const cardA = mockCard('1001', 'カードA');
      const cardB = mockCard('1002', 'カードB');

      store.addCard(cardA, 'main');
      store.addCard(cardB, 'main');

      store.undo();
      store.undo();
      expect(store.canRedo).toBe(true);

      store.redo();
      expect(store.canRedo).toBe(true);

      store.redo();
      expect(store.canRedo).toBe(false);
    });
  });

  describe('UIと編集状態の同時管理', () => {
    it('カード追加しながら検索状態を変更できる', () => {
      store.searchQuery = 'テスト';
      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');

      expect(store.searchQuery).toBe('テスト');
      expect(store.deckInfo.mainDeck).toHaveLength(1);
      expect(store.canUndo).toBe(true);
    });

    it('ダイアログ表示中にカード削除できる', () => {
      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');

      store.showExportDialog = true;
      store.removeCard('1001', 'main');

      expect(store.showExportDialog).toBe(true);
      expect(store.deckInfo.mainDeck).toHaveLength(0);
      expect(store.canUndo).toBe(true);
    });

    it('UIスクロール位置（currentPage）とカード操作は独立している', () => {
      store.currentPage = 5;
      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');

      expect(store.currentPage).toBe(5);
      expect(store.deckInfo.mainDeck).toHaveLength(1);
    });

    it('オーバーレイ表示中にundo/redoできる', () => {
      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');

      store.overlayVisible = true;
      store.overlayZIndex = 20000;

      store.undo();
      expect(store.deckInfo.mainDeck).toHaveLength(0);
      expect(store.overlayVisible).toBe(true);
      expect(store.overlayZIndex).toBe(20000);

      store.redo();
      expect(store.deckInfo.mainDeck).toHaveLength(1);
      expect(store.overlayVisible).toBe(true);
      expect(store.overlayZIndex).toBe(20000);
    });

    it('複数ダイアログが同時に開いた状態でもカード操作可能', () => {
      store.showExportDialog = true;
      store.showImportDialog = true;
      store.showOptionsDialog = true;

      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');

      expect(store.showExportDialog).toBe(true);
      expect(store.showImportDialog).toBe(true);
      expect(store.showOptionsDialog).toBe(true);
      expect(store.deckInfo.mainDeck).toHaveLength(1);
    });
  });

  describe('エラー状態（limitErrorCardId）', () => {
    it('初期状態ではlimitErrorCardIdがnullである', () => {
      expect(store.limitErrorCardId).toBeNull();
    });

    it('limitErrorCardIdをカードIDに設定できる', () => {
      store.limitErrorCardId = '1001';
      expect(store.limitErrorCardId).toBe('1001');
    });

    it('limitErrorCardIdをnullにリセットできる', () => {
      store.limitErrorCardId = '1001';
      store.limitErrorCardId = null;
      expect(store.limitErrorCardId).toBeNull();
    });

    it('異なるカードIDに変更できる', () => {
      store.limitErrorCardId = '1001';
      store.limitErrorCardId = '1002';
      expect(store.limitErrorCardId).toBe('1002');
    });
  });

  describe('ドラッグ状態（draggingCard）', () => {
    it('初期状態ではdraggingCardがnullである', () => {
      expect(store.draggingCard).toBeNull();
    });

    it('ドラッグ中のカード情報を設定できる', () => {
      const card = mockCard('1001', 'カードA');
      store.draggingCard = { card, sectionType: 'main' };

      expect(store.draggingCard).not.toBeNull();
      expect(store.draggingCard?.card.cardId).toBe('1001');
      expect(store.draggingCard?.sectionType).toBe('main');
    });

    it('ドラッグ終了時にdraggingCardをnullにリセットできる', () => {
      const card = mockCard('1001', 'カードA');
      store.draggingCard = { card, sectionType: 'main' };
      store.draggingCard = null;

      expect(store.draggingCard).toBeNull();
    });

    it('異なるセクションへのドラッグ情報に更新できる', () => {
      const cardA = mockCard('1001', 'カードA');
      const cardB = mockCard('1002', 'カードB');

      store.draggingCard = { card: cardA, sectionType: 'main' };
      expect(store.draggingCard?.sectionType).toBe('main');

      store.draggingCard = { card: cardB, sectionType: 'extra' };
      expect(store.draggingCard?.card.cardId).toBe('1002');
      expect(store.draggingCard?.sectionType).toBe('extra');
    });
  });
});
