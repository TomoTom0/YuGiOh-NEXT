import { defineStore } from 'pinia';
import { ref, computed, nextTick, watch } from 'vue';
import type { DeckInfo, DeckCardRef } from '../types/deck';
import type { CardInfo } from '../types/card';
import type { MonsterType } from '../types/card-maps';
import { sessionManager } from '../content/session/session';
import { getDeckDetail as getDeckDetailAPI } from '../api/deck-operations';
import { URLStateManager } from '../utils/url-state';
import { useSettingsStore } from './settings';
import { useToastStore } from './toast-notification';
import { getCardLimit } from '../utils/card-limit';
import { getTempCardDB, initTempCardDBFromStorage, saveTempCardDBToStorage, recordDeckOpen } from '../utils/temp-card-db';
import { getUnifiedCacheDB } from '../utils/unified-cache-db';
import { detectLanguage } from '../utils/language-detector';
import { getFromStorageLocal, removeFromStorageLocal } from '../utils/chrome-storage-utils';

// Undo/Redo履歴の最大保持数
const MAX_COMMAND_HISTORY = 100;

// デッキ詳細情報のプリロードキャッシュ有効期限（1時間）
const PRELOAD_CACHE_EXPIRATION_MS = 60 * 60 * 1000;

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
  
  // 各baseKey (cid-ciid) ごとの最大インデックスを追跡
  const maxIndexMap = new Map<string, number>();

  // UUID生成ヘルパー (cid-ciid-num形式)
  function generateUUID(cid: string, ciid: number): string {
    const baseKey = `${cid}-${ciid}`;
    const currentMax = maxIndexMap.get(baseKey) ?? -1;
    const newIndex = currentMax + 1;
    maxIndexMap.set(baseKey, newIndex);
    return `${baseKey}-${newIndex}`;
  }

  // Undo/Redo用のコマンド履歴
  interface Command {
    execute: () => void;
    undo: () => void;
  }
  
  const commandHistory = ref<Command[]>([]);
  const commandIndex = ref(-1);
  
  const canUndo = computed(() => commandIndex.value >= 0);
  const canRedo = computed(() => commandIndex.value < commandHistory.value.length - 1);

  // カード移動可否判定（DeckSection.vueのcanDropToSectionロジックと同一）
  function canMoveCard(fromSection: string, toSection: string, card: CardInfo): boolean {
    // searchからtrashへは移動不可
    if (fromSection === 'search' && toSection === 'trash') {
      return false;
    }

    // searchから移動する場合
    if (fromSection === 'search') {
      // mainに移動する場合：extraデッキカードは不可
      if (toSection === 'main') {
        const isExtraDeckCard = card.cardType === 'monster' && card.types?.some(t =>
          t === 'fusion' || t === 'synchro' || t === 'xyz' || t === 'link'
        );
        return !isExtraDeckCard;
      }
      // extraに移動する場合：extraデッキカードのみ可
      if (toSection === 'extra') {
        const isExtraDeckCard = card.cardType === 'monster' && card.types?.some(t =>
          t === 'fusion' || t === 'synchro' || t === 'xyz' || t === 'link'
        );
        return isExtraDeckCard || false;
      }
      // sideへは常に許可
      if (toSection === 'side') {
        return true;
      }
      return false;
    }

    // trashへの移動は全て不可
    if (toSection === 'trash') {
      return false;
    }

    // trashからの移動は全て許可
    if (fromSection === 'trash') {
      return true;
    }

    // main/extra/side間の移動はカードタイプによる
    const isExtraDeckCard = card.cardType === 'monster' && card.types?.some(t =>
      t === 'fusion' || t === 'synchro' || t === 'xyz' || t === 'link'
    );

    // mainへの移動：extraデッキカードは不可
    if (toSection === 'main') {
      return !isExtraDeckCard;
    }

    // extraへの移動：extraデッキカードのみ可
    if (toSection === 'extra') {
      return isExtraDeckCard || false;
    }

    // sideへの移動：常に許可
    if (toSection === 'side') {
      return true;
    }

    // それ以外は許可
    return true;
  }

  // displayOrderを初期化（deckInfoから生成）
  function initializeDisplayOrder() {
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
          const newUuid = generateUUID(deckCard.cid, normalizedCiid);
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
      if (sectionOrder.length === 0) return;
      
      const deck = section === 'main' ? deckInfo.value.mainDeck :
                   section === 'extra' ? deckInfo.value.extraDeck :
                   deckInfo.value.sideDeck;
      
      // カード情報を取得してタイプ判定用マップを作成
      const tempCardDB = getTempCardDB();
      const cardTypeMap = new Map<string, number>(); // cid -> type priority (0:monster, 1:spell, 2:trap)
      deck.forEach(dc => {
        const card = tempCardDB.get(dc.cid);
        const type = card?.cardType;
        let priority = 0;
        if (type === 'spell') priority = 1;
        else if (type === 'trap') priority = 2;
        cardTypeMap.set(dc.cid, priority);
      });
      
      // 最初の登場順を記録
      const firstAppearance = new Map<string, number>();
      sectionOrder.forEach((dc, index) => {
        if (!firstAppearance.has(dc.cid)) {
          firstAppearance.set(dc.cid, index);
        }
      });
      
      // ソート: 1. カードタイプ順、2. 最初の登場順
      const sorted = [...sectionOrder].sort((a, b) => {
        const typeA = cardTypeMap.get(a.cid) || 0;
        const typeB = cardTypeMap.get(b.cid) || 0;
        
        if (typeA !== typeB) {
          return typeA - typeB;
        }
        
        const firstA = firstAppearance.get(a.cid) || 0;
        const firstB = firstAppearance.get(b.cid) || 0;
        return firstA - firstB;
      });
      
      // ciidは変更しない（Card Image IDを保持）
      
      displayOrder.value[section] = sorted;
      
      // deckInfoを並び替え（displayOrderの順序に合わせる）
      const newDeck: DeckCardRef[] = [];
      const seenCards = new Set<string>();

      sorted.forEach(dc => {
        const key = `${dc.cid}_${dc.ciid}`;
        if (!seenCards.has(key)) {
          seenCards.add(key);
          const deckCard = deck.find(d =>
            d.cid === dc.cid && d.ciid === String(dc.ciid)
          );
          if (deckCard) {
            newDeck.push(deckCard);
          }
        }
      });
      
      // deckInfoを更新
      if (section === 'main') {
        deckInfo.value.mainDeck = newDeck;
      } else if (section === 'extra') {
        deckInfo.value.extraDeck = newDeck;
      } else {
        deckInfo.value.sideDeck = newDeck;
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
    // debug logging removed

    const targetDeck = section === 'main' ? deckInfo.value.mainDeck :
                       section === 'extra' ? deckInfo.value.extraDeck :
                       section === 'side' ? deckInfo.value.sideDeck :
                       trashDeck.value;

    // deckInfo更新: (cid, ciid)ペアで既存カードを検索
    const existingCard = targetDeck.find(dc =>
      dc.cid === card.cardId && dc.ciid === card.ciid
    );
    if (existingCard) {
      existingCard.quantity++;
    } else {
      // TempCardDBにカード情報を登録
      const tempCardDB = getTempCardDB();
      tempCardDB.set(card.cardId, card);
      // record move history
      try {
        const unifiedDB = getUnifiedCacheDB();
        unifiedDB.recordMove({ action: 'add_to_display', cardId: card.cardId, to: section });
      } catch (e) {
        // ignore
      }
      targetDeck.push({ cid: card.cardId, ciid: card.ciid, lang: card.lang, quantity: 1 });
    }
    
    // displayOrder更新
    const sectionOrder = displayOrder.value[section];
    
    // 同じ(cid, ciid)ペアが既に存在するか確認
    const existingCardIndex = sectionOrder.findIndex(dc => 
      dc.cid === card.cardId && dc.ciid === parseInt(String(card.ciid), 10)
    );
    
    if (existingCardIndex !== -1) {
      // 既存の同じ(cid, ciid)ペアの最後の位置を探す
      const targetCiid = parseInt(String(card.ciid), 10);
      let lastSameCardIndex = existingCardIndex;
      for (let i = existingCardIndex + 1; i < sectionOrder.length; i++) {
        const orderCard = sectionOrder[i];
        if (orderCard && orderCard.cid === card.cardId && orderCard.ciid === targetCiid) {
          lastSameCardIndex = i;
        }
      }
      
      // debug logging removed

      // 最後の同じ(cid, ciid)ペアの直後に挿入
      sectionOrder.splice(lastSameCardIndex + 1, 0, {
        cid: card.cardId,
        ciid: targetCiid,
        uuid: generateUUID(card.cardId, targetCiid)
      });
    } else {
      // 新しい(cid, ciid)ペアなので、同じcidの最後に追加
      const sameCidCards = sectionOrder.filter(dc => dc.cid === card.cardId);
      const ciid = (card.ciid !== undefined && card.ciid !== null)
        ? parseInt(String(card.ciid), 10)
        : 0;

      // debug logging removed

      if (sameCidCards.length > 0) {
        // 同じcidのカードがある場合、その最後の位置の後に挿入
        const lastSameCidIndex = sectionOrder.map((dc, idx) => ({ dc, idx }))
          .filter(item => item.dc.cid === card.cardId)
          .pop()!.idx;
        
        sectionOrder.splice(lastSameCidIndex + 1, 0, {
          cid: card.cardId,
          ciid: ciid,
          uuid: generateUUID(card.cardId, ciid)
        });
      } else {
        // 完全に新しいカードなので末尾に追加
        sectionOrder.push({
          cid: card.cardId,
          ciid: ciid,
          uuid: generateUUID(card.cardId, ciid)
        });
      }
    }
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
  function reorderWithinSectionInternal(section: 'main' | 'extra' | 'side' | 'trash', sourceUuid: string, targetUuid: string | null): { success: boolean; error?: string; originalTargetUuid?: string | null } {
    const sectionOrder = displayOrder.value[section];
    const sourceIndex = sectionOrder.findIndex(dc => dc.uuid === sourceUuid);
    if (sourceIndex === -1) return { success: false, error: 'カードが見つかりません' };

    // 元の位置を記録（undo用）
    const originalTargetUuid = sourceIndex > 0 ? sectionOrder[sourceIndex - 1]?.uuid ?? null : null;
    
    const movedCards = sectionOrder.splice(sourceIndex, 1);
    if (movedCards.length === 0) return { success: false, error: 'カードが見つかりません' };
    const movedCard = movedCards[0];
    if (!movedCard) return { success: false, error: 'カードが見つかりません' };

    if (targetUuid === null) {
      // 末尾に移動
      sectionOrder.push(movedCard);
    } else {
      // targetUuidの直後に挿入
      const targetIndex = sectionOrder.findIndex(dc => dc.uuid === targetUuid);
      if (targetIndex !== -1) {
        sectionOrder.splice(targetIndex + 1, 0, movedCard);
      } else {
        // targetが見つからない場合は末尾に移動
        sectionOrder.push(movedCard);
      }
    }
    return { success: true, originalTargetUuid };
  }
  
  function reorderWithinSection(section: 'main' | 'extra' | 'side' | 'trash', sourceUuid: string, targetUuid: string | null): { success: boolean; error?: string } {
    // 元の位置を事前に記録
    const sectionOrder = displayOrder.value[section];
    const sourceIndex = sectionOrder.findIndex(dc => dc.uuid === sourceUuid);
    if (sourceIndex === -1) return { success: false, error: 'カードが見つかりません' };
    const originalTargetUuid = sourceIndex > 0 ? sectionOrder[sourceIndex - 1]?.uuid ?? null : null;
    
    const result = reorderWithinSectionInternal(section, sourceUuid, targetUuid);
    
    if (result.success) {
      const command: Command = {
        execute: () => {
          reorderWithinSectionInternal(section, sourceUuid, targetUuid);
        },
        undo: () => {
          // 並び替えの逆操作は元の位置に戻す
          reorderWithinSectionInternal(section, sourceUuid, originalTargetUuid);
        }
      };
      
      pushCommand(command);
    }
    
    return result;
  }




  /**
   * displayOrderからカードを削除（deckInfoも更新）
   * @param cardId カードID
   * @param section セクション
   * @param uuid 削除する特定のカードのUUID（省略時は最後の1枚）
   */
  function removeFromDisplayOrderInternal(cardId: string, section: 'main' | 'extra' | 'side' | 'trash', uuid?: string, ciid?: string): { removedCard?: CardInfo; removedCiid?: number } {
    const targetDeck = section === 'main' ? deckInfo.value.mainDeck :
                       section === 'extra' ? deckInfo.value.extraDeck :
                       section === 'side' ? deckInfo.value.sideDeck :
                       trashDeck.value;

    // deckInfo更新（ciidが指定されている場合はciidも条件に含める）
    const index = targetDeck.findIndex(dc => {
      if (ciid !== undefined) {
        return dc.cid === cardId && dc.ciid === ciid;
      }
      return dc.cid === cardId;
    });
    if (index !== -1) {
      const deckCard = targetDeck[index];
      if (deckCard && deckCard.quantity > 1) {
        deckCard.quantity--;
      } else {
        targetDeck.splice(index, 1);
      }
    }
    
    // displayOrder更新（UUIDで特定、なければ最後の1枚を削除）
    const sectionOrder = displayOrder.value[section];
    let removeIndex = -1;
    
    if (uuid) {
      removeIndex = sectionOrder.findIndex(dc => dc.uuid === uuid);
    } else {
      removeIndex = sectionOrder.map(dc => dc.cid).lastIndexOf(cardId);
    }
    
    let removedCiid: number | undefined;
    if (removeIndex !== -1) {
      const removedCard = sectionOrder[removeIndex];
      if (removedCard) {
        removedCiid = removedCard.ciid;
      }
      sectionOrder.splice(removeIndex, 1);
      // ciidは変更しない（画像IDは保持）
    }
    
    // 削除されたカード情報を返す
    const tempCardDB = getTempCardDB();
    const removedCard = tempCardDB.get(cardId);
    return { removedCard, removedCiid };
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
    const fromDeck = from === 'main' ? deckInfo.value.mainDeck :
                     from === 'extra' ? deckInfo.value.extraDeck :
                     from === 'side' ? deckInfo.value.sideDeck :
                     trashDeck.value;

    const toDeck = to === 'main' ? deckInfo.value.mainDeck :
                   to === 'extra' ? deckInfo.value.extraDeck :
                   to === 'side' ? deckInfo.value.sideDeck :
                   trashDeck.value;

    // displayOrderから移動するカードを取得
    const fromOrder = displayOrder.value[from];
    let moveCardIndex: number;

    if (uuid) {
      // UUIDが指定されている場合は、そのUUIDのカードを移動
      moveCardIndex = fromOrder.findIndex(dc => dc.uuid === uuid);
    } else {
      // UUIDが未指定の場合は最後の1枚を移動
      moveCardIndex = fromOrder.map(dc => dc.cid).lastIndexOf(cardId);
    }

    if (moveCardIndex === -1) {
      return;
    }

    const movingDisplayCard = fromOrder[moveCardIndex];
    if (!movingDisplayCard) {
      return;
    }

    // (cid, ciid)ペアでdeckCardを取得
    const fromIndex = fromDeck.findIndex(dc =>
      dc.cid === cardId && dc.ciid === String(movingDisplayCard.ciid)
    );
    if (fromIndex === -1) return;

    const deckCard = fromDeck[fromIndex];
    if (!deckCard) return;

    // fromのdisplayOrderから削除
    fromOrder.splice(moveCardIndex, 1);

    // fromのciidは変更しない（画像IDは保持）

    // toのdisplayOrderに追加
    const toOrder = displayOrder.value[to];
    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= toOrder.length) {
      // 指定された位置に挿入
      toOrder.splice(targetIndex, 0, movingDisplayCard);
    } else {
      // 末尾に追加
      toOrder.push(movingDisplayCard);
    }

    // deckInfo更新
    // fromから削除
    const fromDeckCard = fromDeck[fromIndex];
    if (fromDeckCard && fromDeckCard.quantity > 1) {
      fromDeckCard.quantity--;
    } else {
      fromDeck.splice(fromIndex, 1);
    }

    // toに追加（ciidも考慮）
    const existingCard = toDeck.find(dc =>
      dc.cid === cardId && dc.ciid === String(movingDisplayCard.ciid)
    );
    if (existingCard) {
      existingCard.quantity++;
    } else {
      toDeck.push({ cid: cardId, ciid: String(movingDisplayCard.ciid), lang: deckCard.lang, quantity: 1 });
    }
    
    // 移動したカードのuuidを返す
    return movingDisplayCard.uuid;
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
  
  // Search and UI state
  const searchQuery = ref('');
  const searchResults = ref<Array<{ card: CardInfo }>>([]);

  // no debug watcher

  // 画面幅に応じて初期タブを設定（狭い画面ではdeck、広い画面ではmetadata）
  const isMobile = window.innerWidth <= 768;
  const activeTab = ref<'deck' | 'search' | 'card' | 'metadata'>(isMobile ? 'deck' : 'metadata');

  const showDetail = ref(true);
  const viewMode = ref<'list' | 'grid'>('list');
  const cardTab = ref<'info' | 'qa' | 'related' | 'products'>('info');

  // Search loading state
  const sortOrder = ref<string>('release_desc');
  const isLoading = ref(false);
  const allResults = ref<CardInfo[]>([]);
  const currentPage = ref(0);
  const hasMore = ref(false);

  // グローバル検索モード（検索入力欄を画面中央に大きく表示）
  const isGlobalSearchMode = ref(false);
  
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

  function reorderCard(sourceUuid: string, targetUuid: string, section: 'main' | 'extra' | 'side' | 'trash'): { success: boolean; error?: string } {
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
  
  // UUIDをキーにして全カード位置を記録
  function recordAllCardPositionsByUUID(): Map<string, DOMRect> {
    const positions = new Map<string, DOMRect>();
    const sections: Array<'main' | 'extra' | 'side' | 'trash'> = ['main', 'extra', 'side', 'trash'];
    
    sections.forEach(section => {
      const sectionElement = document.querySelector(`.${section}-deck .card-grid`);
      if (!sectionElement) return;
      
      const cards = sectionElement.querySelectorAll('.deck-card');
      cards.forEach((card) => {
        const uuid = (card as HTMLElement).getAttribute('data-uuid');
        if (uuid) {
          positions.set(uuid, card.getBoundingClientRect());
        }
      });
    });
    
    return positions;
  }
  
  // UUIDベースでアニメーション実行
  function animateCardMoveByUUID(firstPositions: Map<string, DOMRect>, affectedSections: Set<string>) {
    const allCards: Array<{ element: HTMLElement; distance: number }> = [];

    affectedSections.forEach(section => {
      const sectionElement = document.querySelector(`.${section}-deck .card-grid`);
      if (!sectionElement) return;

      const cards = sectionElement.querySelectorAll('.deck-card');

      cards.forEach((card) => {
        const cardElement = card as HTMLElement;
        const uuid = cardElement.getAttribute('data-uuid');
        if (!uuid) return;

        const first = firstPositions.get(uuid);
        const last = cardElement.getBoundingClientRect();

        if (first && last) {
          const deltaX = first.left - last.left;
          const deltaY = first.top - last.top;

          // 1ピクセル未満の移動は誤差として無視
          if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

          // 移動距離を計算（横方向の移動を重視）
          // 横方向は視覚的に目立ちにくいため、係数を大きくする
          const weightedDeltaX = deltaX * 1.5;
          const distance = Math.sqrt(weightedDeltaX * weightedDeltaX + deltaY * deltaY);

          cardElement.style.transition = 'none';
          cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          cardElement.style.zIndex = '1000';
          allCards.push({ element: cardElement, distance });
        }
      });
    });

    if (allCards.length === 0) return;

    document.body.getBoundingClientRect();

    requestAnimationFrame(() => {
      allCards.forEach(({ element, distance }) => {
        // 移動距離に応じてアニメーション時間を調整（平方根で非線形）
        // シャッフル/ソートと統一するため、基本を300msに設定
        // 最小300ms、最大600ms
        const baseDuration = 300;
        const maxDuration = 600;
        const distanceFactor = Math.sqrt(distance) * 12; // 調整係数
        const duration = Math.min(maxDuration, baseDuration + distanceFactor);

        element.style.transition = `transform ${duration}ms ease`;
        element.style.transform = '';
      });
    });

    // 最大のdurationを取得してタイムアウトに使用
    const maxDuration = Math.max(...allCards.map(({ distance }) => {
      const baseDuration = 300;
      const maxDuration = 600;
      const distanceFactor = Math.sqrt(distance) * 12;
      return Math.min(maxDuration, baseDuration + distanceFactor);
    }));

    setTimeout(() => {
      allCards.forEach(({ element }) => {
        element.style.transition = '';
        element.style.transform = '';
        element.style.zIndex = '';
      });
    }, maxDuration);
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
      uuid: generateUUID(cardId, ciid),
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
    const originalSourceIndex = fromOrder.indexOf(sourceCard);
    if (originalSourceIndex === -1) {
      console.error('[moveCardWithPosition] sourceCard not found in fromOrder! sourceUuid:', sourceUuid);
      return { success: false, error: 'カードの位置が見つかりません' };
    }

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
        const newCard = { uuid: generateUUID(cardId, ciid), cid: cardId, ciid: ciid };
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
    try {
      deckInfo.value.dno = dno;

      // 保存用のデータを作成（deckInfo自体は変更しない）
      const dataToSave = {
        ...deckInfo.value,
        name: deckInfo.value.name || deckInfo.value.originalName || ''
      };

      const result = await sessionManager.saveDeck(dno, dataToSave);

      if (result.success) {
        // 保存成功時にスナップショットを更新
        savedDeckSnapshot.value = captureDeckSnapshot();
      }

      return result;
    } catch (error) {
      console.error('Failed to save deck:', error);
      return { success: false, error: String(error) };
    }
  }

  function captureDeckSnapshot(): string {
    return JSON.stringify({
      dno: deckInfo.value.dno,
      name: deckInfo.value.name,
      mainDeck: deckInfo.value.mainDeck,
      extraDeck: deckInfo.value.extraDeck,
      sideDeck: deckInfo.value.sideDeck,
      category: deckInfo.value.category,
      tags: deckInfo.value.tags,
      comment: deckInfo.value.comment,
      skippedCards: deckInfo.value.skippedCards
    });
  }

  /**
   * ソート順を除外したデッキスナップショットを作成
   * カード配列をcid+ciidでソートして、順序の影響を除外
   */
  function captureDeckSnapshotWithoutOrder(): string {
    // カード配列をソートする補助関数
    const sortCards = (cards: DeckCardRef[]) => {
      return [...cards].sort((a, b) => {
        const cidDiff = Number(a.cid) - Number(b.cid);
        if (cidDiff !== 0) return cidDiff;
        return Number(a.ciid) - Number(b.ciid);
      });
    };

    return JSON.stringify({
      dno: deckInfo.value.dno,
      name: deckInfo.value.name,
      mainDeck: sortCards(deckInfo.value.mainDeck),
      extraDeck: sortCards(deckInfo.value.extraDeck),
      sideDeck: sortCards(deckInfo.value.sideDeck),
      category: deckInfo.value.category,
      tags: deckInfo.value.tags,
      comment: deckInfo.value.comment,
      skippedCards: deckInfo.value.skippedCards
    });
  }

  /**
   * ソート順のみの変更があるかチェック
   * @returns true: ソート順のみの変更, false: その他の変更あり
   */
  function hasOnlySortOrderChanges(): boolean {
    if (!savedDeckSnapshot.value) return false;

    // スナップショット全体が一致していれば変更なし
    const currentSnapshot = captureDeckSnapshot();
    if (savedDeckSnapshot.value === currentSnapshot) {
      return false;
    }

    // ソート順を除外したスナップショットを比較
    // これが一致していれば、ソート順のみの変更
    const savedSnapshotObj = JSON.parse(savedDeckSnapshot.value);
    const currentSnapshotObj = JSON.parse(currentSnapshot);
    const sortCards = (cards: DeckCardRef[]) => {
      return [...cards].sort((a, b) => {
        const cidDiff = Number(a.cid) - Number(b.cid);
        if (cidDiff !== 0) return cidDiff;
        return Number(a.ciid) - Number(b.ciid);
      });
    };

    const savedNormalized = JSON.stringify({
      ...savedSnapshotObj,
      mainDeck: sortCards(savedSnapshotObj.mainDeck),
      extraDeck: sortCards(savedSnapshotObj.extraDeck),
      sideDeck: sortCards(savedSnapshotObj.sideDeck)
    });

    const currentNormalized = captureDeckSnapshotWithoutOrder();

    // ソート順のみの変更か、ソート順 + 未発売カード削除のみの変更かをチェック
    if (savedNormalized === currentNormalized) {
      // ソート順のみの変更
      return true;
    }

    // 未発売カード削除のみが異なる場合もチェック
    const savedWithoutSkipped = JSON.stringify({
      ...savedSnapshotObj,
      mainDeck: sortCards(savedSnapshotObj.mainDeck),
      extraDeck: sortCards(savedSnapshotObj.extraDeck),
      sideDeck: sortCards(savedSnapshotObj.sideDeck),
      skippedCards: currentSnapshotObj.skippedCards
    });

    return savedWithoutSkipped === currentNormalized;
  }

  function hasUnsavedChanges(): boolean {
    if (!savedDeckSnapshot.value) return false;
    return savedDeckSnapshot.value !== captureDeckSnapshot();
  }

  async function loadDeck(dno: number) {
    try {
      const cgid = await sessionManager.getCgid();

      // Chrome Storage からプリロード済みデータを取得
      const preloadKey = `ygo-deck-preload:${dno}:${cgid}`;
      let loadedDeck: DeckInfo | null = null;

      try {
        const cached = await getFromStorageLocal(preloadKey);

        if (cached && typeof cached === 'string') {
          const cachedData = JSON.parse(cached);

          // タイムスタンプをチェック（キャッシュ有効期限内のみ使用）
          if (Date.now() - cachedData.timestamp < PRELOAD_CACHE_EXPIRATION_MS) {
            loadedDeck = cachedData.deckInfo;
            console.log('[DeckEditLayout] Using preloaded deck data:', preloadKey);
          } else {
            console.warn('[DeckEditLayout] Cached deck data expired, fetching fresh data');
          }

          // 使用済みキャッシュを削除
          await removeFromStorageLocal(preloadKey).catch(err =>
            console.warn('[DeckEditLayout] Failed to remove preload cache:', err)
          );
        }
      } catch (error) {
        console.warn('[DeckEditLayout] Failed to retrieve preloaded data:', error);
      }

      // キャッシュがなければ通常の getDeckDetailAPI を実行
      if (!loadedDeck) {
        loadedDeck = await getDeckDetailAPI(dno, cgid);
      }

      if (loadedDeck) {
        // originalNameを保存してからdeckInfoを更新
        deckInfo.value = {
          ...loadedDeck,
          originalName: loadedDeck.name,
          name: '' // デッキ名を空にする
        };

        // URLにdnoを同期
        URLStateManager.setDno(dno);

        // displayOrderを初期化
        initializeDisplayOrder();

        // ロード時はアニメーション不要（新規表示のため）

        lastUsedDno.value = dno;
        localStorage.setItem('ygo-deck-helper:lastUsedDno', String(dno));

        // デッキオープンを記録（Tier 5管理用）
        const allCardIds = [
          ...loadedDeck.mainDeck.map(card => card.cid),
          ...loadedDeck.extraDeck.map(card => card.cid),
          ...loadedDeck.sideDeck.map(card => card.cid)
        ];
        recordDeckOpen(dno, allCardIds);

        // TempCardDBをChrome Storageに保存（非同期で実行）
        saveTempCardDBToStorage().catch(error => {
          console.error('Failed to save TempCardDB to storage:', error);
        });

        // コマンド履歴をリセット
        commandHistory.value = [];
        commandIndex.value = -1;

        // Load時点のスナップショットを保存
        savedDeckSnapshot.value = captureDeckSnapshot();

        // 未発売カード通知を表示（skippedCards があれば）
        if (loadedDeck.skippedCardsCount && loadedDeck.skippedCardsCount > 0) {
          const skippedCards = loadedDeck.skippedCards || [];
          const toastStore = useToastStore();

          // 最大3枚までのカード名を表示（改行で区切る）
          const bodyLines: string[] = [];
          if (skippedCards.length > 0) {
            const displayCards = skippedCards.slice(0, 3);
            displayCards.forEach((card: any) => {
              bodyLines.push(card.name);
            });

            const remainCount = skippedCards.length - displayCards.length;
            if (remainCount > 0) {
              bodyLines.push(`ほか${remainCount}枚`);
            }
          }

          toastStore.showToast(
            `${loadedDeck.skippedCardsCount}枚の未発売カードをスキップしました`,
            'warning',
            bodyLines.join('\n')
          );
        }
      }
    } catch (error) {
      console.error('Failed to load deck:', error);
      throw error;
    }
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
      const list = await sessionManager.getDeckList();
      deckList.value = list.map(item => ({
        dno: item.dno,
        name: item.name
      }));
      return deckList.value;
    } catch (error) {
      console.error('Failed to fetch deck list:', error);
      return [];
    }
  }

  async function initializeOnPageLoad() {
    try {
      // Chrome StorageからTempCardDBを初期化（キャッシュされたカード情報を復元）
      await initTempCardDBFromStorage();

      // 設定ストアを初期化
      await settingsStore.loadSettings();

      // URLからUI状態を復元
      const uiState = URLStateManager.restoreUIStateFromURL();
      if (uiState.viewMode) viewMode.value = uiState.viewMode;
      if (uiState.sortOrder) sortOrder.value = uiState.sortOrder;
      if (uiState.activeTab) activeTab.value = uiState.activeTab;
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

      // デッキ一覧を取得
      const list = await fetchDeckList();

      if (list.length === 0) {
        // デッキがない場合は何もしない
        return;
      }

      // URLパラメータからdnoを取得（URLStateManagerを使用）
      const urlDno = URLStateManager.getDno();

      if (urlDno !== null) {
        // URLで指定されたdnoが一覧に存在するか確認
        const exists = list.some(item => item.dno === urlDno);
        if (exists) {
          try {
            await loadDeck(urlDno);
            return;
          } catch (error) {
            console.error(`Failed to load deck with dno=${urlDno}, falling back to default:`, error);
            // ロード失敗時は通常処理に続く
          }
        }
      }

      // URLパラメータがない、または失敗した場合、前回使用したdnoを取得
      const savedDno = localStorage.getItem('ygo-deck-helper:lastUsedDno');
      if (savedDno) {
        const dno = parseInt(savedDno, 10);
        // 前回使用したdnoが一覧に存在するか確認
        const exists = list.some(item => item.dno === dno);
        if (exists) {
          await loadDeck(dno);
          return;
        }
      }

      // 前回使用したdnoがない、または存在しない場合、最大のdnoをload
      const maxDno = Math.max(...list.map(item => item.dno));
      await loadDeck(maxDno);
    } catch (error) {
      console.error('Failed to initialize deck on page load:', error);
    }
  }

  /**
   * Fisher-Yatesアルゴリズムで配列をシャッフル
   */
  function fisherYatesShuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
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

    // (cid, ciid)ペアからカード情報を取得するヘルパー関数
    const tempCardDB = getTempCardDB();
    const getCardInfo = (cid: string, _ciid: number) => {
      return tempCardDB.get(cid) || null;
    };

    // デッキメタデータのカテゴリに該当するかをチェック
    const selectedCategories = deckInfo.value?.category ?? [];
    const matchesPriorityCategory = (card: CardInfo | null): boolean => {
      if (!card || selectedCategories.length === 0) return false;

      // カード名、ルビ、テキスト、ペンデュラムテキストからカテゴリに該当するかをチェック
      const searchTexts = [
        card.name,
        (card as any).ruby || '',
        card.text || '',
        (card as any).pendulumText || ''
      ].join(' ');

      return selectedCategories.some((categoryId: string) => searchTexts.includes(categoryId));
    };

    // ソート用の内部関数：カード比較ロジック（優先度カテゴリを考慮）
    const compareCards = (a: DisplayCard, b: DisplayCard): number => {
      const cardA = getCardInfo(a.cid, a.ciid);
      const cardB = getCardInfo(b.cid, b.ciid);
      if (!cardA || !cardB) return 0;

      // 1. Card Type: Monster(0) > Spell(1) > Trap(2)
      const typeOrder = { monster: 0, spell: 1, trap: 2 };
      const typeA = typeOrder[cardA.cardType] ?? 999;
      const typeB = typeOrder[cardB.cardType] ?? 999;
      if (typeA !== typeB) return typeA - typeB;

      // 2. Monster Type: Fusion > Synchro > Xyz > Link > その他
      if (cardA.cardType === 'monster' && cardB.cardType === 'monster') {
        const monsterTypeOrder: Partial<Record<MonsterType, number>> = {
          fusion: 0,
          synchro: 1,
          xyz: 2,
          link: 3
        };
        // types配列から主要なタイプを抽出
        const getMainType = (types: MonsterType[]) => {
          for (const type of types) {
            const order = monsterTypeOrder[type];
            if (order !== undefined) {
              return order;
            }
          }
          return 999;
        };
        const monsterTypeA = getMainType((cardA as any).types);
        const monsterTypeB = getMainType((cardB as any).types);
        if (monsterTypeA !== monsterTypeB) return monsterTypeA - monsterTypeB;

        // 4. Level/Rank/Link（降順）
        const levelA = (cardA as any).levelValue ?? 0;
        const levelB = (cardB as any).levelValue ?? 0;
        if (levelA !== levelB) return levelB - levelA; // 降順
      }

      // 3. Spell Type / Trap Type
      if (cardA.cardType === 'spell' && cardB.cardType === 'spell') {
        const spellTypeA = (cardA as any).effectType ?? '';
        const spellTypeB = (cardB as any).effectType ?? '';
        if (spellTypeA !== spellTypeB) return spellTypeA.localeCompare(spellTypeB);
      }
      if (cardA.cardType === 'trap' && cardB.cardType === 'trap') {
        const trapTypeA = (cardA as any).effectType ?? '';
        const trapTypeB = (cardB as any).effectType ?? '';
        if (trapTypeA !== trapTypeB) return trapTypeA.localeCompare(trapTypeB);
      }

      // 5. Card Name（昇順）
      return cardA.name.localeCompare(cardB.name, 'ja');
    };

    // ソート優先順位
    const settingsStore = useSettingsStore();
    const sorted = [...section].sort((a, b) => {
      const cardA = getCardInfo(a.cid, a.ciid);
      const cardB = getCardInfo(b.cid, b.ciid);
      if (!cardA || !cardB) return 0;

      // 0. Card Type: Monster(0) > Spell(1) > Trap(2)
      const typeOrder = { monster: 0, spell: 1, trap: 2 };
      const typeA = typeOrder[cardA.cardType] ?? 999;
      const typeB = typeOrder[cardB.cardType] ?? 999;
      if (typeA !== typeB) return typeA - typeB;

      // 1. メタデータカテゴリ: 該当あり(0) < 該当なし(1) ← カテゴリ優先が先頭
      const inPriorityA = matchesPriorityCategory(cardA) ? 0 : 1;
      const inPriorityB = matchesPriorityCategory(cardB) ? 0 : 1;
      if (inPriorityA !== inPriorityB) return inPriorityA - inPriorityB;

      // 2. カードタイプ内で、末尾配置フラグ: 末尾配置なし(0) < 末尾配置あり(1)
      const isTailA = settingsStore.isTailPlacementCard(a.cid) ? 1 : 0;
      const isTailB = settingsStore.isTailPlacementCard(b.cid) ? 1 : 0;
      if (isTailA !== isTailB) return isTailA - isTailB;

      // 3. カテゴリ内での枚数による重み付け
      if (deckInfo.value?.sortByQuantity && inPriorityA === 0 && inPriorityB === 0) {
        const quantityA = section.filter(card => card.cid === a.cid).length;
        const quantityB = section.filter(card => card.cid === b.cid).length;
        if (quantityA !== quantityB) return quantityB - quantityA; // 降順（多い順）
      }

      // 4. その他のカード比較ロジックを適用（Monster Type, Level, Name等）
      return compareCards(a, b);
    });

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

  function pushCommand(command: Command) {
    // 現在の位置より後ろのコマンドを削除
    if (commandIndex.value < commandHistory.value.length - 1) {
      commandHistory.value.splice(commandIndex.value + 1);
    }

    // 新しいコマンドを追加
    commandHistory.value.push(command);
    commandIndex.value = commandHistory.value.length - 1;

    // 履歴の上限を超えたら古い履歴を削除（メモリ使用量を制限）
    if (commandHistory.value.length > MAX_COMMAND_HISTORY) {
      const deleteCount = commandHistory.value.length - MAX_COMMAND_HISTORY;
      commandHistory.value.splice(0, deleteCount);
      commandIndex.value -= deleteCount;
      console.debug(`[DeckEditStore] Trimmed ${deleteCount} commands, history size now ${commandHistory.value.length}`);
    }
  }

  function undo() {
    if (!canUndo.value) return;

    const command = commandHistory.value[commandIndex.value];
    if (command) {
      command.undo();
    }
    commandIndex.value--;
  }

  function redo() {
    if (!canRedo.value) return;

    commandIndex.value++;
    const command = commandHistory.value[commandIndex.value];
    if (command) {
      command.execute();
    }
  }

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
    searchQuery,
    searchResults,
    activeTab,
    showDetail,
    viewMode,
    cardTab,
    sortOrder,
    isLoading,
    allResults,
    currentPage,
    hasMore,
    isGlobalSearchMode,
    overlayVisible,
    overlayZIndex,
    showExportDialog,
    showImportDialog,
    showOptionsDialog,
    showLoadDialog,
    showDeleteConfirm,
    showUnsavedChangesDialog,
    isFilterDialogVisible,
    canUndo,
    canRedo,
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
