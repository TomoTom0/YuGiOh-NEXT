import { defineStore } from 'pinia';
import { ref, computed, nextTick, watch } from 'vue';
import type { DeckInfo, DeckCardRef } from '../types/deck';
import type { CardInfo } from '../types/card';
import { sessionManager } from '../content/session/session';
import { getDeckDetail as getDeckDetailAPI } from '../api/deck-operations';
import { URLStateManager } from '../utils/url-state';
import { useSettingsStore } from './settings';
import { getCardLimit } from '../utils/card-limit';
import { getTempCardDB, initTempCardDBFromStorage, saveTempCardDBToStorage } from '../utils/temp-card-db';
import { getUnifiedCacheDB } from '../utils/unified-cache-db';
import { detectLanguage } from '../utils/language-detector';
import { generateDeckCardUUID, clearDeckUUIDState } from '../utils/deck-uuid-generator';
import { recordAllCardPositionsByUUID, animateCardMoveByUUID } from '../composables/deck/useFLIPAnimation';
import { fisherYatesShuffle } from '../utils/array-shuffle';
import { createDeckCardComparator } from '../composables/deck/useDeckCardSorter';
import { computeCategoryMatchedCardIds } from '../composables/deck/useCategoryMatcher';
import { canMoveCard as canMoveCardValidation } from '../composables/deck/useDeckValidation';
import { sortDisplayOrderForOfficial as sortDisplayOrderForOfficialLogic } from '../composables/deck/useDeckSorting';
import {
  addToDisplayOrder as addToDisplayOrderLogic,
  removeFromDisplayOrder as removeFromDisplayOrderLogic,
  moveInDisplayOrder as moveInDisplayOrderLogic,
  reorderWithinSection as reorderWithinSectionLogic,
  validateReorderParameters
} from '../composables/deck/useDeckDisplayOrder';
import {
  captureDeckSnapshot as captureDeckSnapshotLogic,
  hasOnlySortOrderChanges as hasOnlySortOrderChangesLogic
} from '../composables/deck/useDeckSnapshot';
import { useDeckUndoRedo, type Command } from '../composables/deck/useDeckUndoRedo';
import { useDeckPersistence } from '../composables/deck/useDeckPersistence';

export const useDeckEditStore = defineStore('deck-edit', () => {
  const deckInfo = ref<DeckInfo>({
    dno: 0,
    name: '',
    mainDeck: [],
    extraDeck: [],
    sideDeck: [],
    category: [],
    tags: [],
    comment: '',
    deckCode: ''
  });

  const trashDeck = ref<DeckCardRef[]>([]);

  // カテゴリID → ラベルのマップ（DeckMetadata.vue で設定）
  const categoryLabelMap = ref<Record<string, string>>({});

  // 枚数制限エラー表示用のcardId
  const limitErrorCardId = ref<string | null>(null);

  // ドラッグ中のカード情報（移動可否判定用）
  const draggingCard = ref<{ card: CardInfo; sectionType: string } | null>(null);

  // 表示順序データ構造: 画面上のカード画像の並び順
  interface DisplayCard {
    cid: string;      // カードID
    ciid: number;     // Card Image ID（画像のバリエーション番号）
    uuid: string;     // ユニークな識別子（アニメーション追跡用）
  }
  
  const displayOrder = ref<{
    main: DisplayCard[];
    extra: DisplayCard[];
    side: DisplayCard[];
    trash: DisplayCard[];
  }>({
    main: [],
    extra: [],
    side: [],
    trash: []
  });
  
  // displayOrderのバックアップ（保存キャンセル時に復元用）
  const displayOrderBackup = ref<{
    main: DisplayCard[];
    extra: DisplayCard[];
    side: DisplayCard[];
    trash: DisplayCard[];
  } | null>(null);

  // Undo/Redo機能 (composableから取得)
  const {
    commandHistory,
    commandIndex,
    canUndo,
    canRedo,
    pushCommand,
    undo: undoCommand,
    redo: redoCommand,
    clearHistory
  } = useDeckUndoRedo();

  // デッキ永続化機能 (composableから取得)
  // initializeDisplayOrder, captureDeckSnapshot は後で定義されるため、
  // persistence の初期化は関数内で遅延して行う
  let persistence: ReturnType<typeof useDeckPersistence> | null = null;

  function getPersistence() {
    if (!persistence) {
      persistence = useDeckPersistence({
        sessionManager,
        deckInfo,
        lastUsedDno,
        initializeDisplayOrder,
        clearHistory,
        captureDeckSnapshot,
        savedDeckSnapshot
      });
    }
    return persistence;
  }

  /**
   * カテゴリ優先アイコン表示対象のcidセット（2段階検索）
   *
   * 一段階目: カテゴリラベルを名前/ルビ/テキスト/p-textに含むcid
   * 二段階目: 一段階目で見つかったカード名をテキスト/p-textに含むcid（一段階目は除外）
   */
  const categoryMatchedCardIds = computed(() => {
    return computeCategoryMatchedCardIds(
      deckInfo.value?.category ?? [],
      categoryLabelMap.value || {},
      {
        main: deckInfo.value.mainDeck,
        extra: deckInfo.value.extraDeck,
        side: deckInfo.value.sideDeck,
        trash: trashDeck.value
      },
      (cid) => getTempCardDB().get(cid)
    );
  });

  // カード移動可否判定（useDeckValidation.tsから import）
  const canMoveCard = canMoveCardValidation;

  // displayOrderを初期化（deckInfoから生成）
  function initializeDisplayOrder() {
    // UUID生成器の状態をクリア（新しいデッキロード時に以前のインデックスが引き継がれないように）
    clearDeckUUIDState();

    const sections: Array<'main' | 'extra' | 'side' | 'trash'> = ['main', 'extra', 'side', 'trash'];

    sections.forEach(section => {
      const deck = section === 'main' ? deckInfo.value.mainDeck :
                   section === 'extra' ? deckInfo.value.extraDeck :
                   section === 'side' ? deckInfo.value.sideDeck :
                   trashDeck.value;

      displayOrder.value[section] = [];

      deck.forEach(deckCard => {
        for (let i = 0; i < deckCard.quantity; i++) {
          // 各カードのciid（Card Image ID）を使用
          const ciid = parseInt(String(deckCard.ciid), 10);
          const normalizedCiid = isNaN(ciid) ? 0 : ciid;
          const newUuid = generateDeckCardUUID(deckCard.cid, normalizedCiid);
          displayOrder.value[section].push({
            cid: deckCard.cid,
            ciid: normalizedCiid,
            uuid: newUuid
          });
        }
      });
    });
  }
  
  /**
   * displayOrderを公式保存フォーマットに並び替え（deckInfoも同期）
   * 
   * 公式API仕様:
   * - デッキ保存時は「モンスター→魔法→罠」の順序で送信する必要がある
   * - 同じカードは最初の登場位置でグループ化される
   * - 各カードのciid（同一カードの何枚目か）を正しく設定する必要がある
   * 
   * このソートを行わないと、公式サイトでデッキを開いた際に
   * カードの順序が意図しないものになる可能性がある。
   * 
   * ソートルール:
   * 1. カードタイプ優先度（monster=0, spell=1, trap=2）
   * 2. 同じタイプ内では最初の登場順を維持
   */
  function sortDisplayOrderForOfficial() {
    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();

    const sections: Array<'main' | 'extra' | 'side'> = ['main', 'extra', 'side'];

    sections.forEach(section => {
      const sectionOrder = displayOrder.value[section];
      const deck = section === 'main' ? deckInfo.value.mainDeck :
                   section === 'extra' ? deckInfo.value.extraDeck :
                   deckInfo.value.sideDeck;

      // useDeckSorting composable を使用してソート
      const result = sortDisplayOrderForOfficialLogic(sectionOrder, deck);

      // 結果を反映
      displayOrder.value[section] = result.sortedDisplayOrder;

      if (section === 'main') {
        deckInfo.value.mainDeck = result.sortedDeck;
      } else if (section === 'extra') {
        deckInfo.value.extraDeck = result.sortedDeck;
      } else {
        deckInfo.value.sideDeck = result.sortedDeck;
      }
    });

    // DOM更新後にアニメーション実行
    nextTick(() => {
      animateCardMoveByUUID(firstPositions, new Set(['main', 'extra', 'side']));
    });
  }
  
  /**
   * displayOrderをバックアップ
   */
  function backupDisplayOrder() {
    displayOrderBackup.value = {
      main: JSON.parse(JSON.stringify(displayOrder.value.main)),
      extra: JSON.parse(JSON.stringify(displayOrder.value.extra)),
      side: JSON.parse(JSON.stringify(displayOrder.value.side)),
      trash: JSON.parse(JSON.stringify(displayOrder.value.trash))
    };
  }
  
  /**
   * displayOrderをバックアップから復元
   */
  function restoreDisplayOrder() {
    if (displayOrderBackup.value) {
      // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
      const firstPositions = recordAllCardPositionsByUUID();
      
      displayOrder.value = displayOrderBackup.value;
      displayOrderBackup.value = null;
      
      // DOM更新後にアニメーション実行
      nextTick(() => {
        animateCardMoveByUUID(firstPositions, new Set(['main', 'extra', 'side', 'trash']));
      });
    }
  }
  
  /**
   * displayOrder内でカードを並び替え（同一セクション内での位置変更）
   * @param sourceUuid 移動するカードのUUID
   * @param targetUuid ドロップ先カードのUUID
   * @param section セクション
   */

  
  /**
   * displayOrderにカードを追加（deckInfoも更新）
   * 同じカードが既に存在する場合、最初に登場する位置の直後に挿入
   */
  function addToDisplayOrderInternal(card: CardInfo, section: 'main' | 'extra' | 'side' | 'trash') {
    // useDeckDisplayOrder composable を使用
    const deckState = {
      mainDeck: deckInfo.value.mainDeck,
      extraDeck: deckInfo.value.extraDeck,
      sideDeck: deckInfo.value.sideDeck,
      trashDeck: trashDeck.value
    };

    addToDisplayOrderLogic(
      displayOrder.value,
      deckState,
      card,
      section,
      generateDeckCardUUID
    );
  }
  
  function addToDisplayOrder(card: CardInfo, section: 'main' | 'extra' | 'side' | 'trash') {
    const command: Command = {
      execute: () => addToDisplayOrderInternal(card, section),
      undo: () => {
        // 追加の逆操作は削除
        // 追加されたカードのuuidを見つけて削除
        const sectionOrder = displayOrder.value[section];
        const addedIndex = sectionOrder.findIndex(dc =>
          dc.cid === card.cardId && dc.ciid === parseInt(String(card.ciid), 10)
        );
        if (addedIndex !== -1) {
          const displayCard = sectionOrder[addedIndex];
          if (displayCard) {
            removeFromDisplayOrderInternal(card.cardId, section, displayCard.uuid);
          }
        }
      }
    };
    
    command.execute();
    pushCommand(command);
  }
  
  /**
   * displayOrder内で同じセクション内のカードを並び替え
   * @param section セクション
   * @param sourceUuid 移動するカードのUUID
   * @param targetUuid 移動先の直前にあるカードのUUID（nullの場合は末尾に移動）
   */
  function reorderWithinSectionInternal(section: 'main' | 'extra' | 'side' | 'trash', fromIndex: number, toIndex: number) {
    // useDeckDisplayOrder composable を使用
    reorderWithinSectionLogic(
      displayOrder.value,
      section,
      fromIndex,
      toIndex
    );
  }
  
  function reorderWithinSection(section: 'main' | 'extra' | 'side' | 'trash', sourceUuid: string, targetUuid: string | null): { success: boolean; error?: string } {
    // バリデーション（共通化関数を使用）
    const validationError = validateReorderParameters(displayOrder.value, section, sourceUuid, targetUuid);
    if (validationError) {
      console.error(`[reorderWithinSection] ${validationError}`, { section, sourceUuid, targetUuid });
      return { success: false, error: validationError };
    }

    // 元の位置を事前に記録（バリデーション済み）
    const sectionOrder = displayOrder.value[section];

    const sourceIndex = sectionOrder.findIndex(dc => dc?.uuid === sourceUuid);

    // targetIndexを計算
    let targetIndex: number;
    if (targetUuid === null) {
      // 末尾に移動
      targetIndex = sectionOrder.length - 1;
    } else {
      const targetIdx = sectionOrder.findIndex(dc => dc?.uuid === targetUuid);
      // sourceがtargetより後ろにある場合は targetIdx、前にある場合は targetIdx + 1
      targetIndex = sourceIndex > targetIdx ? targetIdx : targetIdx + 1;
    }

    reorderWithinSectionInternal(section, sourceIndex, targetIndex);

    const command: Command = {
      execute: () => {
        // UUID ベースで再計算して実行（配列状態の変化に対応）
        const currentSectionOrder = displayOrder.value[section];
        const currentSourceIndex = currentSectionOrder.findIndex(dc => dc?.uuid === sourceUuid);
        if (currentSourceIndex === -1) return;

        let currentTargetIndex: number;
        if (targetUuid === null) {
          currentTargetIndex = currentSectionOrder.length - 1;
        } else {
          const currentTargetIdx = currentSectionOrder.findIndex(dc => dc?.uuid === targetUuid);
          if (currentTargetIdx === -1) return;
          currentTargetIndex = currentSourceIndex > currentTargetIdx ? currentTargetIdx : currentTargetIdx + 1;
        }

        reorderWithinSectionInternal(section, currentSourceIndex, currentTargetIndex);
      },
      undo: () => {
        // 逆操作も UUID ベースで計算
        const currentSectionOrder = displayOrder.value[section];
        const currentSourceIndex = currentSectionOrder.findIndex(dc => dc?.uuid === sourceUuid);
        if (currentSourceIndex === -1) return;

        // sourceUuid が元のインデックスに戻るような位置を計算
        // execute で移動されたので、元の sourceUuid の位置（現在の sourceIndex）から
        // 元の targetUuid の位置に対応するインデックスに移動させることで戻す
        let undoTargetIndex: number;
        if (targetUuid === null) {
          // 末尾への移動を戻すには、もう一度末尾から sourceIndex に戻す
          undoTargetIndex = sourceIndex;
        } else {
          const currentTargetIdx = currentSectionOrder.findIndex(dc => dc?.uuid === targetUuid);
          if (currentTargetIdx === -1) {
            undoTargetIndex = sourceIndex;
          } else {
            // sourceIndex が元の位置になるように計算
            undoTargetIndex = currentSourceIndex > currentTargetIdx ? currentTargetIdx + 1 : currentTargetIdx;
          }
        }

        reorderWithinSectionInternal(section, currentSourceIndex, undoTargetIndex);
      }
    };

    pushCommand(command);

    return { success: true };
  }




  /**
   * displayOrderからカードを削除（deckInfoも更新）
   * @param cardId カードID
   * @param section セクション
   * @param uuid 削除する特定のカードのUUID（省略時は最後の1枚）
   */
  function removeFromDisplayOrderInternal(cardId: string, section: 'main' | 'extra' | 'side' | 'trash', uuid?: string, ciid?: string): { removedCard?: CardInfo; removedCiid?: number } {
    // useDeckDisplayOrder composable を使用
    const deckState = {
      mainDeck: deckInfo.value.mainDeck,
      extraDeck: deckInfo.value.extraDeck,
      sideDeck: deckInfo.value.sideDeck,
      trashDeck: trashDeck.value
    };

    const result = removeFromDisplayOrderLogic(
      displayOrder.value,
      deckState,
      cardId,
      section,
      uuid,
      ciid
    );

    return { removedCard: result.removedCard, removedCiid: result.removedCiid };
  }
  
  function removeFromDisplayOrder(cardId: string, section: 'main' | 'extra' | 'side' | 'trash', uuid?: string, ciid?: string) {
    const result = removeFromDisplayOrderInternal(cardId, section, uuid, ciid);
    
    const command: Command = {
      execute: () => {
        removeFromDisplayOrderInternal(cardId, section, uuid, ciid);
      },
      undo: () => {
        // 削除の逆操作は追加
        if (result.removedCard) {
          addToDisplayOrderInternal(result.removedCard, section);
        }
      }
    };
    
    pushCommand(command);
  }
  
  /**
   * displayOrder内でカードを移動（deckInfoも更新）
   * @param cardId カードID
   * @param from 移動元セクション
   * @param to 移動先セクション
   * @param uuid 移動する特定のカードのUUID（省略時は最後の1枚）
   */
  function moveInDisplayOrderInternal(cardId: string, from: 'main' | 'extra' | 'side' | 'trash', to: 'main' | 'extra' | 'side' | 'trash', uuid?: string, targetIndex?: number): string | undefined {
    // useDeckDisplayOrder composable を使用
    const deckState = {
      mainDeck: deckInfo.value.mainDeck,
      extraDeck: deckInfo.value.extraDeck,
      sideDeck: deckInfo.value.sideDeck,
      trashDeck: trashDeck.value
    };

    const result = moveInDisplayOrderLogic(
      displayOrder.value,
      deckState,
      cardId,
      from,
      to,
      uuid,
      targetIndex
    );

    return result?.uuid;
  }
  
  function moveInDisplayOrder(cardId: string, from: 'main' | 'extra' | 'side' | 'trash', to: 'main' | 'extra' | 'side' | 'trash', uuid?: string) {
    // 元の位置を保存
    const fromOrder = displayOrder.value[from];
    let originalIndex = -1;
    if (uuid) {
      originalIndex = fromOrder.findIndex(dc => dc.uuid === uuid);
    } else {
      originalIndex = fromOrder.map(dc => dc.cid).lastIndexOf(cardId);
    }
    
    const movedUuid = moveInDisplayOrderInternal(cardId, from, to, uuid);
    
    const command: Command = {
      execute: () => {
        moveInDisplayOrderInternal(cardId, from, to, uuid);
      },
      undo: () => {
        // 移動の逆操作は元の位置への移動
        if (movedUuid) {
          moveInDisplayOrderInternal(cardId, to, from, movedUuid, originalIndex);
        }
      }
    };
    
    pushCommand(command);
  }
  
  // Deck list state
  const deckList = ref<Array<{ dno: number; name: string }>>([]);
  const lastUsedDno = ref<number | null>(null);
  
  // UI state only (search state moved to search.ts)

  // no debug watcher

  // 画面幅に応じて初期タブを設定（狭い画面ではdeck、広い画面ではmetadata）
  // ただし、URLにactiveTabがある場合はそれを優先
  const isMobile = window.innerWidth <= 768;
  const initialActiveTab = (() => {
    const uiState = URLStateManager.restoreUIStateFromURL();
    if (uiState.activeTab) return uiState.activeTab;
    return isMobile ? 'deck' : 'metadata';
  })();
  const activeTab = ref<'deck' | 'search' | 'card' | 'metadata'>(initialActiveTab);

  const showDetail = ref(true);
  const viewMode = ref<'list' | 'grid'>('list');
  const cardTab = ref<'info' | 'qa' | 'related' | 'products'>('info');

  // Sort order (UI state, not search state)
  const sortOrder = ref<string>('release_desc');
  
  // オーバーレイ表示状態（z-index統一管理）
  const overlayVisible = ref(false);
  const overlayZIndex = ref(10000);

  // ダイアログ表示状態
  const showExportDialog = ref(false);
  const showImportDialog = ref(false);
  const showOptionsDialog = ref(false);
  const showLoadDialog = ref(false);
  const showDeleteConfirm = ref(false);
  const showUnsavedChangesDialog = ref(false);
  const isFilterDialogVisible = ref(false);
  
  // Load時点でのデッキ情報を保存（変更検知用）
  const savedDeckSnapshot = ref<string | null>(null);

  // 設定ストアを取得
  const settingsStore = useSettingsStore();

  // UI状態の変更をURLに同期
  watch([viewMode, sortOrder, activeTab, cardTab, showDetail], () => {
    URLStateManager.syncUIStateToURL({
      viewMode: viewMode.value,
      sortOrder: sortOrder.value as any,
      activeTab: activeTab.value,
      cardTab: cardTab.value,
      showDetail: showDetail.value,
    });
  }, { deep: true });

  function addCard(card: CardInfo, section: 'main' | 'extra' | 'side') {
    const settingsStore = useSettingsStore();

    // 言語ごとの利用可能ciidをチェック
    const unifiedDB = getUnifiedCacheDB();
    if (unifiedDB.isInitialized()) {
      const { detectLanguage } = require('@/utils/language-detector');
      const lang = detectLanguage(document);
      const validCiids = unifiedDB.getValidCiidsForLang(card.cardId, lang);

      // validCiidsが存在する場合、ciidが含まれているかチェック
      if (validCiids.length > 0 && !validCiids.includes(String(card.ciid || card.imgs?.[0]?.ciid))) {
        // 無効なciid - 追加を拒否
        limitErrorCardId.value = card.cardId;
        setTimeout(() => {
          limitErrorCardId.value = null;
        }, 1000);
        return { success: false, error: 'invalid_ciid_for_language' };
      }
    }

    // main, extra, sideで同じcidのカードの合計枚数をカウント
    const allDecks = [
      ...deckInfo.value.mainDeck,
      ...deckInfo.value.extraDeck,
      ...deckInfo.value.sideDeck
    ];
    const totalCount = allDecks
      .filter(dc => dc.cid === card.cardId)
      .reduce((sum, dc) => sum + dc.quantity, 0);

    // 枚数制限をチェック
    const limit = settingsStore.cardLimitMode === 'all-3'
      ? 3
      : getCardLimit(card);

    if (totalCount >= limit) {
      // 制限枚数を超える場合は追加しない
      limitErrorCardId.value = card.cardId;
      setTimeout(() => {
        limitErrorCardId.value = null;
      }, 1000);
      return { success: false, error: 'max_copies_reached' };
    }

    // データ追加
    addToDisplayOrder(card, section);

    // TempCardDBをChrome Storageに保存（非同期で実行）
    saveTempCardDBToStorage().catch(error => {
      console.error('Failed to save TempCardDB to storage:', error);
    });

    // 新規追加されたカードは位置情報がないため、単純なフェードイン
    // FLIPアニメーションは移動のみに使用
    return { success: true };
  }

  function removeCard(cardId: string, section: 'main' | 'extra' | 'side' | 'trash') {
    const res = removeFromDisplayOrder(cardId, section);
    try {
      const unifiedDB = getUnifiedCacheDB();
      unifiedDB.recordMove({ action: 'remove', cardId, from: section });
    } catch (e) {
      // ignore
    }
    return res;
  }

  function moveCard(cardId: string, from: 'main' | 'extra' | 'side' | 'trash', to: 'main' | 'extra' | 'side' | 'trash', uuid?: string): { success: boolean; error?: string } {
    const fromDeck = from === 'main' ? deckInfo.value.mainDeck :
                     from === 'extra' ? deckInfo.value.extraDeck :
                     from === 'side' ? deckInfo.value.sideDeck :
                     trashDeck.value;

    const fromIndex = fromDeck.findIndex(dc => dc.cid === cardId);
    if (fromIndex === -1) return { success: false, error: 'カードが見つかりません' };

    // 移動先がmain/extra/sideの場合、言語ごとの利用可能ciidをチェック
    if (to === 'main' || to === 'extra' || to === 'side') {
      const movingCard = fromDeck[fromIndex];
      const unifiedDB = getUnifiedCacheDB();
      if (unifiedDB.isInitialized()) {
        const { detectLanguage } = require('@/utils/language-detector');
        const lang = detectLanguage(document);
        const validCiids = unifiedDB.getValidCiidsForLang(cardId, lang);

        // validCiidsが存在する場合、ciidが含まれているかチェック
        const currentCiid = movingCard?.ciid;
        if (validCiids.length > 0 && currentCiid !== undefined && !validCiids.includes(String(currentCiid))) {
          // 無効なciid - 移動を拒否
          limitErrorCardId.value = cardId;
          setTimeout(() => {
            limitErrorCardId.value = null;
          }, 1000);
          return { success: false, error: 'invalid_ciid_for_language' };
        }
      }
    }

    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();
    
    // displayOrder操作関数を使用（deckInfoも同時に更新）
    moveInDisplayOrder(cardId, from, to, uuid);
    
    // DOM更新後にアニメーション実行
    // nextTick + requestAnimationFrame でレイアウト計算完了を確実に待つ
    // 移動元と移動先の両方のセクションをアニメーション（カードが詰まる動きを表現）
    nextTick(() => {
      requestAnimationFrame(() => {
        animateCardMoveByUUID(firstPositions, new Set([from, to]));
      });
    });
    try {
      const unifiedDB = getUnifiedCacheDB();
      unifiedDB.recordMove({ action: 'move', cardId, from, to, uuid });
    } catch (e) {
      // ignore
    }
    return { success: true };
  }

  function reorderCard(sourceUuid: string, targetUuid: string | null, section: 'main' | 'extra' | 'side' | 'trash'): { success: boolean; error?: string } {
    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();

    // reorderWithinSectionを使用（undo対応済み）
    const result = reorderWithinSection(section, sourceUuid, targetUuid);

    // DOM更新後にアニメーション実行
    nextTick(() => {
      requestAnimationFrame(() => {
        animateCardMoveByUUID(firstPositions, new Set([section]));
      });
    });
    
    try {
      const unifiedDB = getUnifiedCacheDB();
      unifiedDB.recordMove({ action: 'reorder', info: { section, sourceUuid, targetUuid } });
    } catch (e) {
      // ignore
    }
    
    return result;
  }

  function moveCardToTrash(card: CardInfo, from: 'main' | 'extra' | 'side', uuid?: string): { success: boolean; error?: string } {
    return moveCard(card.cardId, from, 'trash', uuid);
  }

  function moveCardToSide(card: CardInfo, from: 'main' | 'extra' | 'trash', uuid?: string): { success: boolean; error?: string } {
    // trashからの移動の場合は枚数制限チェック
    if (from === 'trash') {
      const allDecks = [
        ...deckInfo.value.mainDeck,
        ...deckInfo.value.extraDeck,
        ...deckInfo.value.sideDeck
      ];
      const totalCount = allDecks
        .filter(dc => dc.cid === card.cardId)
        .reduce((sum, dc) => sum + dc.quantity, 0);

      const settingsStore = useSettingsStore();
      const limit = settingsStore.cardLimitMode === 'all-3'
        ? 3
        : getCardLimit(card);

      if (totalCount >= limit) {
        return { success: false, error: 'max_copies_reached' };
      }
    }

    return moveCard(card.cardId, from, 'side', uuid);
  }

  function moveCardToMainOrExtra(card: CardInfo, from: 'side' | 'trash', uuid?: string): { success: boolean; error?: string } {
    const targetSection = (card.cardType === 'monster' && card.isExtraDeck) ? 'extra' : 'main';

    // trashからの移動の場合は枚数制限チェック
    if (from === 'trash') {
      const allDecks = [
        ...deckInfo.value.mainDeck,
        ...deckInfo.value.extraDeck,
        ...deckInfo.value.sideDeck
      ];
      const totalCount = allDecks
        .filter(dc => dc.cid === card.cardId)
        .reduce((sum, dc) => sum + dc.quantity, 0);

      const settingsStore = useSettingsStore();
      const limit = settingsStore.cardLimitMode === 'all-3'
        ? 3
        : getCardLimit(card);

      if (totalCount >= limit) {
        return { success: false, error: 'max_copies_reached' };
      }
    }

    return moveCard(card.cardId, from, targetSection, uuid);
  }

  function moveCardFromSide(card: CardInfo, uuid?: string): { success: boolean; error?: string } {
    const targetSection = (card.cardType === 'monster' && card.isExtraDeck) ? 'extra' : 'main';
    return moveCard(card.cardId, 'side', targetSection, uuid);
  }

  function addCopyToSection(card: CardInfo, section: 'main' | 'extra' | 'side') {
    return addCard(card, section);
  }

  function addCopyToMainOrExtra(card: CardInfo) {
    const targetSection = (card.cardType === 'monster' && card.isExtraDeck) ? 'extra' : 'main';
    return addCard(card, targetSection);
  }

  function moveCardWithPosition(cardId: string, from: 'main' | 'extra' | 'side' | 'trash',
                                to: 'main' | 'extra' | 'side' | 'trash',
                                sourceUuid: string, targetUuid: string | null): { success: boolean; error?: string } {
    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();

    // 1. 移動元から削除（内部処理でundo記録）
    const fromOrder = displayOrder.value[from];
    const sourceCard = fromOrder.find(dc => dc.uuid === sourceUuid);
    if (!sourceCard) {
      console.error('[moveCardWithPosition] sourceCard not found!');
      return { success: false, error: 'カードが見つかりません' };
    }

    // 削除前にインデックスを記録（undo用）
    const originalSourceIndex = fromOrder.indexOf(sourceCard);
    if (originalSourceIndex === -1) {
      console.error('[moveCardWithPosition] sourceCard not found in fromOrder! sourceUuid:', sourceUuid);
      return { success: false, error: 'カードの位置が見つかりません' };
    }

    const tempCardDB = getTempCardDB();
    const cardInfo = tempCardDB.get(cardId);
    if (!cardInfo) return { success: false, error: 'カード情報が見つかりません' };

    removeFromDisplayOrderInternal(cardId, from, sourceUuid, cardInfo.ciid);

    // 2. 移動先の指定位置に追加（内部処理のみ、コマンドは全体で1つ）
    const toOrder = displayOrder.value[to];
    const targetDeck = to === 'main' ? deckInfo.value.mainDeck :
                       to === 'extra' ? deckInfo.value.extraDeck :
                       to === 'side' ? deckInfo.value.sideDeck :
                       trashDeck.value;
    
    // deckInfo更新
    const existingCard = targetDeck.find(dc => dc.cid === cardId && dc.ciid === cardInfo.ciid);
    if (existingCard) {
      existingCard.quantity++;
    } else {
      tempCardDB.set(cardId, cardInfo);
      targetDeck.push({ cid: cardId, ciid: cardInfo.ciid, lang: detectLanguage(document), quantity: 1 });
    }
    
    // displayOrder更新（targetUuidの位置に挿入）
    const ciid = parseInt(String(cardInfo.ciid));
    const newDisplayCard = {
      uuid: generateDeckCardUUID(cardId, ciid),
      cid: cardId,
      ciid: ciid
    };
    
    if (targetUuid === null) {
      toOrder.push(newDisplayCard);
    } else {
      const targetIndex = toOrder.findIndex(dc => dc.uuid === targetUuid);
      if (targetIndex !== -1) {
        toOrder.splice(targetIndex, 0, newDisplayCard);
      } else {
        toOrder.push(newDisplayCard);
      }
    }

    // ドラッグ操作では移動先と移動元の両方をアニメーション
    nextTick(() => {
      requestAnimationFrame(() => {
        animateCardMoveByUUID(firstPositions, new Set([from, to]));
      });
    });

    // ドラッグ移動全体を1つのコマンドとして記録
    const insertedUuid = newDisplayCard.uuid;

    const command: Command = {
      execute: () => {
        const firstPos = recordAllCardPositionsByUUID();
        removeFromDisplayOrderInternal(cardId, from, sourceUuid, cardInfo.ciid);
        
        // 移動先に追加
        const targetDeck2 = to === 'main' ? deckInfo.value.mainDeck :
                           to === 'extra' ? deckInfo.value.extraDeck :
                           to === 'side' ? deckInfo.value.sideDeck :
                           trashDeck.value;
        const existingCard2 = targetDeck2.find(dc => dc.cid === cardId && dc.ciid === cardInfo.ciid);
        if (existingCard2) {
          existingCard2.quantity++;
        } else {
          targetDeck2.push({ cid: cardId, ciid: cardInfo.ciid, lang: detectLanguage(document), quantity: 1 });
        }
        
        const toOrder2 = displayOrder.value[to];
        const newCard = { uuid: generateDeckCardUUID(cardId, ciid), cid: cardId, ciid: ciid };
        if (targetUuid === null) {
          toOrder2.push(newCard);
        } else {
          const idx = toOrder2.findIndex(dc => dc.uuid === targetUuid);
          if (idx !== -1) toOrder2.splice(idx, 0, newCard);
          else toOrder2.push(newCard);
        }
        
        nextTick(() => {
          requestAnimationFrame(() => {
            animateCardMoveByUUID(firstPos, new Set([from, to]));
          });
        });
      },
      undo: () => {
        // 逆操作: 移動先から削除して、移動元の元の位置に戻す
        const firstPos = recordAllCardPositionsByUUID();
        removeFromDisplayOrderInternal(cardId, to, insertedUuid, cardInfo.ciid);
        
        // 元の位置に戻す
        const fromDeck2 = from === 'main' ? deckInfo.value.mainDeck :
                          from === 'extra' ? deckInfo.value.extraDeck :
                          from === 'side' ? deckInfo.value.sideDeck :
                          trashDeck.value;
        const existingCard2 = fromDeck2.find(dc => dc.cid === cardId && dc.ciid === cardInfo.ciid);
        if (existingCard2) {
          existingCard2.quantity++;
        } else {
          fromDeck2.push({ cid: cardId, ciid: cardInfo.ciid, lang: detectLanguage(document), quantity: 1 });
        }
        
        const fromOrder2 = displayOrder.value[from];
        const newCard = { uuid: sourceUuid, cid: cardId, ciid: ciid };
        
        // 元の位置に挿入（コマンド作成時に保存したインデックスを使用）
        const insertPosition = Math.min(originalSourceIndex, fromOrder2.length);
        fromOrder2.splice(insertPosition, 0, newCard);

        nextTick(() => {
          requestAnimationFrame(() => {
            animateCardMoveByUUID(firstPos, new Set([from, to]));
          });
        });
      }
    };

    pushCommand(command);

    return { success: true };
  }

  function getDeckName(): string {
    return deckInfo.value.name || deckInfo.value.originalName || '';
  }

  function setDeckName(name: string) {
    deckInfo.value.name = name;
  }

  async function saveDeck(dno: number) {
    // useDeckPersistence composable に処理を委譲
    return getPersistence().saveDeck(dno);
  }

  function captureDeckSnapshot(): string {
    return captureDeckSnapshotLogic(deckInfo.value);
  }

  /**
   * ソート順のみの変更があるかチェック
   * @returns true: ソート順のみの変更, false: その他の変更あり
   */
  function hasOnlySortOrderChanges(): boolean {
    if (!savedDeckSnapshot.value) return false;
    const currentSnapshot = captureDeckSnapshot();
    return hasOnlySortOrderChangesLogic(savedDeckSnapshot.value, currentSnapshot);
  }

  function hasUnsavedChanges(): boolean {
    if (!savedDeckSnapshot.value) return false;
    return savedDeckSnapshot.value !== captureDeckSnapshot();
  }

  async function loadDeck(dno: number) {
    // useDeckPersistence composable に処理を委譲
    return getPersistence().loadDeck(dno);
  }

  /**
   * デッキ情報を取得（IDから直接取得、キャッシュなし）
   * @param dno - デッキ番号
   * @returns デッキ情報、取得失敗時は null
   */
  async function getDeckDetail(dno: number): Promise<DeckInfo | null> {
    try {
      const cgid = await sessionManager.getCgid();
      const deckDetail = await getDeckDetailAPI(dno, cgid);
      return deckDetail;
    } catch (error) {
      console.error('Failed to fetch deck detail:', error);
      return null;
    }
  }
  
  async function reloadDeck() {
    const currentDno = deckInfo.value.dno;
    if (!currentDno) {
      throw new Error('No deck loaded');
    }
    await loadDeck(currentDno);
  }

  async function fetchDeckList() {
    try {
      let list: any[] | null = null;

      // Background で事前取得済みのデッキリストを確認
      try {
        const { getFromStorageLocal } = await import('../utils/chrome-storage-utils');
        const preloadedData = await getFromStorageLocal('ygo-deck-list-preload');

        if (preloadedData && typeof preloadedData === 'string') {
          const parsed = JSON.parse(preloadedData);
          if (Array.isArray(parsed.deckList) && parsed.deckList.length > 0) {
            list = parsed.deckList;
          }
        }
      } catch (err) {
        console.warn('[fetchDeckList] Failed to load preloaded deck list:', err);
      }

      // プリロードがない場合は API から取得
      if (!list) {
        list = await sessionManager.getDeckList();
      }

      // 変換して deckList に代入
      const transformed = list.map(item => ({
        dno: item.dno,
        name: item.name
      }));

      deckList.value = transformed;
      return transformed;
    } catch (error) {
      console.error('[fetchDeckList] ERROR:', error);
      deckList.value = [];
      return [];
    }
  }

  /**
   * ページ読み込み時の初期化（非同期処理）
   * 画面表示に必須なloadDeck()のPromiseのみを返し、他の初期化は非同期で実行
   */
  function initializeOnPageLoad(): Promise<void> {
    // 非同期で実行（await しない）
    (async () => {
      try {
        // Chrome StorageからTempCardDBを初期化（キャッシュされたカード情報を復元）
        await initTempCardDBFromStorage();

        // Chrome StorageからUnifiedCacheDBを初期化（複数ciidの画像情報を復元）
        const unifiedDB = getUnifiedCacheDB();
        await unifiedDB.initialize();

        // 設定ストアを初期化
        await settingsStore.loadSettings();

        // URLからUI状態を復元（activeTabは既に初期化時に設定済み）
        const uiState = URLStateManager.restoreUIStateFromURL();
        if (uiState.viewMode) viewMode.value = uiState.viewMode;
        // sortOrderは常にデフォルト値（release_desc）を使用（Search tab のデフォルトソート順序）
        sortOrder.value = 'release_desc';
        // activeTabは初期化時に設定済みなのでスキップ
        if (uiState.cardTab) cardTab.value = uiState.cardTab;
        if (uiState.showDetail !== undefined) showDetail.value = uiState.showDetail;

        // URLから設定を復元（URLパラメータが設定ストアより優先）
        const urlSettings = URLStateManager.restoreSettingsFromURL();
        // TODO: カードサイズが4箇所に分割されたため、URL復元は将来対応
        // if (urlSettings.size) settingsStore.setCardSize(urlSettings.size);
        if (urlSettings.theme) settingsStore.setTheme(urlSettings.theme);
        if (urlSettings.lang) settingsStore.setLanguage(urlSettings.lang);

        // 設定をDOMに適用
        settingsStore.applyTheme();
        settingsStore.applyCardSize();

        // デッキリストを取得（非同期、画面表示に影響しない）
        const list = await fetchDeckList();
        deckList.value = list;
      } catch (error) {
        console.error('Failed to initialize settings/deck list:', error);
      }
    })();

    // URLパラメータからdnoを取得（URLStateManagerを使用）
    const urlDno = URLStateManager.getDno();
    const savedDno = localStorage.getItem('ygo-deck-helper:lastUsedDno');
    const targetDno = urlDno ?? (savedDno ? parseInt(savedDno, 10) : null);

    // loadDeck()のPromiseだけを返す（画面表示に必須）
    if (targetDno !== null) {
      return loadDeck(targetDno);
    } else {
      // targetDnoがない場合は何もロードしない（fetchDeckListは非同期で実行中）
      return Promise.resolve();
    }
  }

  /**
   * 指定セクションのカードをシャッフル
   */
  function shuffleSection(sectionType: 'main' | 'extra' | 'side' | 'trash') {
    const section = displayOrder.value[sectionType];
    if (!section || section.length === 0) return;

    // 変更前の順序を保存
    const originalOrder = [...section];

    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();

    const shuffled = fisherYatesShuffle(section);
    displayOrder.value[sectionType] = shuffled;

    // DOM更新後にアニメーション実行
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animateCardMoveByUUID(firstPositions, new Set([sectionType]));
        });
      });
    });

    // コマンドを記録
    const command: Command = {
      execute: () => {
        const firstPos = recordAllCardPositionsByUUID();
        displayOrder.value[sectionType] = shuffled;
        nextTick(() => {
          requestAnimationFrame(() => {
            animateCardMoveByUUID(firstPos, new Set([sectionType]));
          });
        });
      },
      undo: () => {
        // シャッフルの逆操作は元の順序に復元
        const firstPos = recordAllCardPositionsByUUID();
        displayOrder.value[sectionType] = originalOrder;
        nextTick(() => {
          requestAnimationFrame(() => {
            animateCardMoveByUUID(firstPos, new Set([sectionType]));
          });
        });
      }
    };

    pushCommand(command);
  }

  /**
   * 指定セクションのカードをソート
   */
  function sortSection(sectionType: 'main' | 'extra' | 'side' | 'trash') {
    const section = displayOrder.value[sectionType];
    if (!section || section.length === 0) return;

    // 変更前の順序を保存
    const originalOrder = [...section];

    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();

    // ソート設定を準備
    const settingsStore = useSettingsStore();
    const comparator = createDeckCardComparator(section, {
      enableCategoryPriority: settingsStore.appSettings.enableCategoryPriority ?? true,
      priorityCategoryCardIds: categoryMatchedCardIds.value,
      enableTailPlacement: settingsStore.appSettings.enableTailPlacement ?? true,
      tailPlacementCardIds: settingsStore.tailPlacementCardIds
    });

    // ソート実行
    const sorted = [...section].sort(comparator);

    displayOrder.value[sectionType] = sorted;

    // DOM更新後にアニメーション実行
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animateCardMoveByUUID(firstPositions, new Set([sectionType]));
        });
      });
    });

    // コマンドを記録
    const command: Command = {
      execute: () => {
        const firstPos = recordAllCardPositionsByUUID();
        displayOrder.value[sectionType] = sorted;
        nextTick(() => {
          requestAnimationFrame(() => {
            animateCardMoveByUUID(firstPos, new Set([sectionType]));
          });
        });
      },
      undo: () => {
        // ソートの逆操作は元の順序に復元
        const firstPos = recordAllCardPositionsByUUID();
        displayOrder.value[sectionType] = originalOrder;
        nextTick(() => {
          requestAnimationFrame(() => {
            animateCardMoveByUUID(firstPos, new Set([sectionType]));
          });
        });
      }
    };

    pushCommand(command);
  }

  /**
   * 全セクションをソート
   */
  function sortAllSections() {
    sortSection('main');
    sortSection('extra');
    sortSection('side');
  }

  // undo/redo関数はcomposableから取得（undoCommand/redoCommand）
  // 外部公開用にエイリアスを提供
  const undo = undoCommand;
  const redo = redoCommand;

  async function createNewDeck() {
    try {
      // サーバーに新規デッキを作成
      const newDno = await sessionManager.createDeck();
      
      if (!newDno || newDno === 0) {
        throw new Error('Failed to create new deck: server returned invalid dno');
      }
      
      // 新規デッキを読み込む
      await loadDeck(newDno);
    } catch (error) {
      console.error('[createNewDeck] Error:', error);
      throw error;
    }
  }

  /**
   * デッキ情報を複製する（一般化関数）
   *
   * @param deckData 複製元のデッキ情報
   * @returns 新しいデッキ番号
   */
  async function pseudoCopyDeck(deckData: DeckInfo): Promise<number> {
    try {
      // 新規デッキを作成
      const newDno = await sessionManager.createDeck();

      if (!newDno || newDno === 0) {
        throw new Error('Failed to create new deck for copy');
      }

      // デッキデータをコピー（dnoだけ新しいものに変更）
      const copiedDeckData: DeckInfo = {
        ...deckData,
        dno: newDno,
        name: `COPY_${deckData.name || deckData.originalName || ''}`
      };

      // 新規デッキに現在のデータを保存
      await sessionManager.saveDeck(newDno, copiedDeckData);

      // 複製されたデッキを読み込む
      await loadDeck(newDno);

      return newDno;
    } catch (error) {
      console.error('[pseudoCopyDeck] Error:', error);
      throw error;
    }
  }

  async function copyCurrentDeck() {
    try {
      if (!deckInfo.value.dno) {
        throw new Error('No deck loaded');
      }

      await pseudoCopyDeck(deckInfo.value);
    } catch (error) {
      console.error('[copyCurrentDeck] Error:', error);
      throw error;
    }
  }

  async function deleteCurrentDeck() {
    try {
      if (!deckInfo.value.dno) {
        throw new Error('No deck loaded');
      }
      
      const dnoToDelete = deckInfo.value.dno;
      
      // デッキを削除
      const success = await sessionManager.deleteDeck(dnoToDelete);
      
      if (!success) {
        throw new Error('Failed to delete deck');
      }
      
      // デッキ一覧を取得して、別のデッキを読み込む
      const deckList = await sessionManager.getDeckList();
      
      if (deckList.length > 0) {
        // 削除したデッキより小さいdnoがあればそれを、なければ最大のdnoを読み込む
        const smallerDecks = deckList.filter(d => d.dno < dnoToDelete);
        const newDno = smallerDecks.length > 0 
          ? Math.max(...smallerDecks.map(d => d.dno))
          : Math.max(...deckList.map(d => d.dno));
        
        await loadDeck(newDno);
      } else {
        // デッキが1つもない場合は新規作成
        await createNewDeck();
      }
    } catch (error) {
      console.error('[deleteCurrentDeck] Error:', error);
      throw error;
    }
  }

  return {
    deckInfo,
    trashDeck,
    categoryLabelMap,
    displayOrder,
    limitErrorCardId,
    draggingCard,
    deckList,
    lastUsedDno,
    activeTab,
    showDetail,
    viewMode,
    cardTab,
    sortOrder,
    overlayVisible,
    overlayZIndex,
    showExportDialog,
    showImportDialog,
    showOptionsDialog,
    showLoadDialog,
    showDeleteConfirm,
    showUnsavedChangesDialog,
    isFilterDialogVisible,
    commandHistory,
    commandIndex,
    canUndo,
    canRedo,
    categoryMatchedCardIds,
    canMoveCard,
    addCard,
    removeCard,
    moveCard,
    reorderCard,
    reorderWithinSection,
    sortDisplayOrderForOfficial,
    backupDisplayOrder,
    restoreDisplayOrder,
    moveCardToTrash,
    moveCardToSide,
    moveCardToMainOrExtra,
    moveCardFromSide,
    addCopyToSection,
    addCopyToMainOrExtra,
    moveCardWithPosition,
    getDeckName,
    setDeckName,
    saveDeck,
    loadDeck,
    getDeckDetail,
    reloadDeck,
    fetchDeckList,
    initializeOnPageLoad,
    shuffleSection,
    sortSection,
    sortAllSections,
    undo,
    redo,
    createNewDeck,
    pseudoCopyDeck,
    copyCurrentDeck,
    deleteCurrentDeck,
    hasUnsavedChanges,
    hasOnlySortOrderChanges,
    captureDeckSnapshot
  };
});
