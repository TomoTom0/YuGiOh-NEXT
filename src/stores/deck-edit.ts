import { defineStore } from 'pinia';
import { ref, nextTick, watch } from 'vue';
import type { DeckInfo, DeckCard } from '../types/deck';
import type { CardInfo } from '../types/card';
import type { MonsterType } from '../types/card-maps';
import { sessionManager } from '../content/session/session';
import { getDeckDetail } from '../api/deck-operations';
import { URLStateManager } from '../utils/url-state';
import { useSettingsStore } from './settings';
import { getCardLimit } from '../utils/card-limit';

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

  const trashDeck = ref<DeckCard[]>([]);

  // 枚数制限エラー表示用のcardId
  const limitErrorCardId = ref<string | null>(null);

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
  
  // UUID生成ヘルパー
  function generateUUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
          const ciid = parseInt(String(deckCard.card.ciid), 10);
          displayOrder.value[section].push({
            cid: deckCard.card.cardId,
            ciid: isNaN(ciid) ? 0 : ciid,
            uuid: generateUUID()
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
      const cardTypeMap = new Map<string, number>(); // cid -> type priority (0:monster, 1:spell, 2:trap)
      deck.forEach(dc => {
        const type = dc.card.cardType;
        let priority = 0;
        if (type === 'spell') priority = 1;
        else if (type === 'trap') priority = 2;
        cardTypeMap.set(dc.card.cardId, priority);
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
      const newDeck: DeckCard[] = [];
      const seenCards = new Set<string>();

      sorted.forEach(dc => {
        const key = `${dc.cid}_${dc.ciid}`;
        if (!seenCards.has(key)) {
          seenCards.add(key);
          const deckCard = deck.find(d =>
            d.card.cardId === dc.cid && d.card.ciid === String(dc.ciid)
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
  function reorderInDisplayOrder(sourceUuid: string, targetUuid: string, section: 'main' | 'extra' | 'side' | 'trash') {
    const sectionOrder = displayOrder.value[section];

    const sourceIndex = sectionOrder.findIndex(dc => dc.uuid === sourceUuid);
    const targetIndex = sectionOrder.findIndex(dc => dc.uuid === targetUuid);

    console.log('[reorderInDisplayOrder]', { sourceIndex, targetIndex, section });

    if (sourceIndex === -1 || targetIndex === -1) return;
    if (sourceIndex === targetIndex) return;

    // sourceを削除
    const [movingCard] = sectionOrder.splice(sourceIndex, 1);
    if (!movingCard) return;

    // 挿入位置を決定
    // - sourceIndex < targetIndex（aが前）: aをbの後ろに入れる
    //   削除後、bのインデックスはtargetIndex-1なので、その後ろ＝targetIndexに挿入
    // - sourceIndex > targetIndex（aが後ろ）: aをbの位置に入れる（bは後ろにずれる）
    //   削除後、bのインデックスは変わらずtargetIndexなので、そこに挿入
    const newTargetIndex = sourceIndex < targetIndex ? targetIndex : targetIndex;

    console.log('[reorderInDisplayOrder]', { newTargetIndex });

    // 挿入
    sectionOrder.splice(newTargetIndex, 0, movingCard);

    // ciidは変更しない（画像IDは保持）
  }
  
  /**
   * displayOrderにカードを追加（deckInfoも更新）
   * 同じカードが既に存在する場合、最初に登場する位置の直後に挿入
   */
  function addToDisplayOrder(card: CardInfo, section: 'main' | 'extra' | 'side' | 'trash') {
    console.log('[deck-edit] addToDisplayOrder:', 'cardId=', card.cardId, 'ciid=', card.ciid, 'hasImgs=', !!card.imgs, 'imgsLength=', card.imgs?.length);

    const targetDeck = section === 'main' ? deckInfo.value.mainDeck :
                       section === 'extra' ? deckInfo.value.extraDeck :
                       section === 'side' ? deckInfo.value.sideDeck :
                       trashDeck.value;

    // deckInfo更新: (cardId, ciid)ペアで既存カードを検索
    const existingCard = targetDeck.find(dc =>
      dc.card.cardId === card.cardId && dc.card.ciid === card.ciid
    );
    if (existingCard) {
      existingCard.quantity++;
    } else {
      // cardオブジェクトをディープコピーして保存（参照を共有しないため）
      const cardCopy = JSON.parse(JSON.stringify(card)) as CardInfo;
      targetDeck.push({ card: cardCopy, quantity: 1 });
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
      
      console.log('[deck-edit] addToDisplayOrder: adding to', section, 'cardId=', card.cardId, 'ciid=', targetCiid, 'after existing');

      // 最後の同じ(cid, ciid)ペアの直後に挿入
      sectionOrder.splice(lastSameCardIndex + 1, 0, {
        cid: card.cardId,
        ciid: targetCiid,
        uuid: generateUUID()
      });
    } else {
      // 新しい(cid, ciid)ペアなので、同じcidの最後に追加
      const sameCidCards = sectionOrder.filter(dc => dc.cid === card.cardId);
      const ciid = (card.ciid !== undefined && card.ciid !== null)
        ? parseInt(String(card.ciid), 10)
        : 0;

      console.log('[deck-edit] addToDisplayOrder: adding new to', section, 'cardId=', card.cardId, 'ciid=', ciid);

      if (sameCidCards.length > 0) {
        // 同じcidのカードがある場合、その最後の位置の後に挿入
        const lastSameCidIndex = sectionOrder.map((dc, idx) => ({ dc, idx }))
          .filter(item => item.dc.cid === card.cardId)
          .pop()!.idx;
        
        sectionOrder.splice(lastSameCidIndex + 1, 0, {
          cid: card.cardId,
          ciid: ciid,
          uuid: generateUUID()
        });
      } else {
        // 完全に新しいカードなので末尾に追加
        sectionOrder.push({
          cid: card.cardId,
          ciid: ciid,
          uuid: generateUUID()
        });
      }
    }
  }
  
  /**
   * displayOrder内で同じセクション内のカードを並び替え
   * @param section セクション
   * @param sourceUuid 移動するカードのUUID
   * @param targetUuid 移動先の直前にあるカードのUUID（nullの場合は末尾に移動）
   */
  function reorderWithinSection(section: 'main' | 'extra' | 'side' | 'trash', sourceUuid: string, targetUuid: string | null) {
    const sectionOrder = displayOrder.value[section];
    const sourceIndex = sectionOrder.findIndex(dc => dc.uuid === sourceUuid);
    if (sourceIndex === -1) return;

    const movedCards = sectionOrder.splice(sourceIndex, 1);
    if (movedCards.length === 0) return;
    const movedCard = movedCards[0];
    if (!movedCard) return;

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
  }

  /**
   * displayOrderの指定位置にカードを挿入（deckInfoも更新）
   * @param card カード情報
   * @param section セクション
   * @param targetUuid 挿入位置のカードのUUID（このカードの位置に挿入し、このカードは後ろにずれる。nullの場合は末尾に追加）
   */
  function insertToDisplayOrder(card: CardInfo, section: 'main' | 'extra' | 'side' | 'trash', targetUuid: string | null) {
    const targetDeck = section === 'main' ? deckInfo.value.mainDeck :
                       section === 'extra' ? deckInfo.value.extraDeck :
                       section === 'side' ? deckInfo.value.sideDeck :
                       trashDeck.value;

    // deckInfo更新
    const existingCard = targetDeck.find(dc =>
      dc.card.cardId === card.cardId && dc.card.ciid === card.ciid
    );
    if (existingCard) {
      existingCard.quantity++;
    } else {
      targetDeck.push({ card, quantity: 1 });
    }

    // displayOrder更新
    const sectionOrder = displayOrder.value[section];
    const newDisplayCard = {
      uuid: crypto.randomUUID(),
      cid: card.cardId,
      ciid: parseInt(card.ciid)
    };

    if (targetUuid === null) {
      // 末尾に追加
      sectionOrder.push(newDisplayCard);
    } else {
      // targetUuidの位置に挿入（targetは後ろにずれる）
      const targetIndex = sectionOrder.findIndex(dc => dc.uuid === targetUuid);
      if (targetIndex !== -1) {
        sectionOrder.splice(targetIndex, 0, newDisplayCard);
      } else {
        // targetUuidが見つからない場合は末尾に追加
        sectionOrder.push(newDisplayCard);
      }
    }
  }

  /**
   * displayOrderからカードを削除（deckInfoも更新）
   * @param cardId カードID
   * @param section セクション
   * @param uuid 削除する特定のカードのUUID（省略時は最後の1枚）
   */
  function removeFromDisplayOrder(cardId: string, section: 'main' | 'extra' | 'side' | 'trash', uuid?: string, ciid?: string) {
    const targetDeck = section === 'main' ? deckInfo.value.mainDeck :
                       section === 'extra' ? deckInfo.value.extraDeck :
                       section === 'side' ? deckInfo.value.sideDeck :
                       trashDeck.value;

    // deckInfo更新（ciidが指定されている場合はciidも条件に含める）
    const index = targetDeck.findIndex(dc => {
      if (ciid !== undefined) {
        return dc.card.cardId === cardId && dc.card.ciid === ciid;
      }
      return dc.card.cardId === cardId;
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
    
    if (removeIndex !== -1) {
      sectionOrder.splice(removeIndex, 1);
      // ciidは変更しない（画像IDは保持）
    }
  }
  
  /**
   * displayOrder内でカードを移動（deckInfoも更新）
   * @param cardId カードID
   * @param from 移動元セクション
   * @param to 移動先セクション
   * @param uuid 移動する特定のカードのUUID（省略時は最後の1枚）
   */
  function moveInDisplayOrder(cardId: string, from: 'main' | 'extra' | 'side' | 'trash', to: 'main' | 'extra' | 'side' | 'trash', uuid?: string) {
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

    if (moveCardIndex === -1) return;

    const movingDisplayCard = fromOrder[moveCardIndex];
    if (!movingDisplayCard) return;

    // (cid, ciid)ペアでdeckCardを取得
    const fromIndex = fromDeck.findIndex(dc =>
      dc.card.cardId === cardId && dc.card.ciid === String(movingDisplayCard.ciid)
    );
    if (fromIndex === -1) return;

    const deckCard = fromDeck[fromIndex];
    if (!deckCard) return;
    const card = deckCard.card;
    
    // fromのdisplayOrderから削除
    fromOrder.splice(moveCardIndex, 1);

    // fromのciidは変更しない（画像IDは保持）

    // toのdisplayOrderに末尾追加
    const toOrder = displayOrder.value[to];
    toOrder.push(movingDisplayCard);
    
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
      dc.card.cardId === cardId && dc.card.ciid === String(movingDisplayCard.ciid)
    );
    if (existingCard) {
      existingCard.quantity++;
    } else {
      toDeck.push({ card, quantity: 1 });
    }
  }
  
  // Deck list state
  const deckList = ref<Array<{ dno: number; name: string }>>([]);
  const lastUsedDno = ref<number | null>(null);
  
  // Search and UI state
  const searchQuery = ref('');
  const searchResults = ref<Array<{ card: CardInfo }>>([]);
  const selectedCard = ref<CardInfo | null>(null);

  // 画面幅に応じて初期タブを設定（狭い画面ではdeck、広い画面ではsearch）
  const isMobile = window.innerWidth <= 768;
  const activeTab = ref<'deck' | 'search' | 'card'>(isMobile ? 'deck' : 'search');

  const showDetail = ref(true);
  const viewMode = ref<'list' | 'grid'>('list');
  const cardTab = ref<'info' | 'qa' | 'related' | 'products'>('info');

  // Search loading state
  const sortOrder = ref<string>('official');
  const isLoading = ref(false);
  const allResults = ref<CardInfo[]>([]);
  const currentPage = ref(0);
  const hasMore = ref(false);

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

    // main, extra, sideで同じcidのカードの合計枚数をカウント
    const allDecks = [
      ...deckInfo.value.mainDeck,
      ...deckInfo.value.extraDeck,
      ...deckInfo.value.sideDeck
    ];
    const totalCount = allDecks
      .filter(dc => dc.card.cardId === card.cardId)
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
      }, 1500);
      return { success: false, error: 'max_copies_reached' };
    }

    // データ追加
    addToDisplayOrder(card, section);

    // 新規追加されたカードは位置情報がないため、単純なフェードイン
    // FLIPアニメーションは移動のみに使用
    return { success: true };
  }

  function removeCard(cardId: string, section: 'main' | 'extra' | 'side' | 'trash') {
    removeFromDisplayOrder(cardId, section);
  }

  function moveCard(cardId: string, from: 'main' | 'extra' | 'side' | 'trash', to: 'main' | 'extra' | 'side' | 'trash', uuid?: string) {
    const fromDeck = from === 'main' ? deckInfo.value.mainDeck :
                     from === 'extra' ? deckInfo.value.extraDeck :
                     from === 'side' ? deckInfo.value.sideDeck :
                     trashDeck.value;
    
    const fromIndex = fromDeck.findIndex(dc => dc.card.cardId === cardId);
    if (fromIndex === -1) return;
    
    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();
    
    // displayOrder操作関数を使用（deckInfoも同時に更新）
    moveInDisplayOrder(cardId, from, to, uuid);
    
    // DOM更新後にアニメーション実行
    // nextTick + requestAnimationFrame でレイアウト計算完了を確実に待つ
    // 移動先のセクションのみアニメーション（移動元はカードがないためアニメーション不要）
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animateCardMoveByUUID(firstPositions, new Set([to]));
        });
      });
    });
  }

  function reorderCard(sourceUuid: string, targetUuid: string, section: 'main' | 'extra' | 'side' | 'trash') {
    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();
    
    // displayOrder操作関数を使用
    reorderInDisplayOrder(sourceUuid, targetUuid, section);
    
    // DOM更新後にアニメーション実行
    nextTick(() => {
      animateCardMoveByUUID(firstPositions, new Set([section]));
    });
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

    console.log('[animateCardMoveByUUID] affectedSections:', Array.from(affectedSections));
    console.log('[animateCardMoveByUUID] firstPositions size:', firstPositions.size);

    affectedSections.forEach(section => {
      const sectionElement = document.querySelector(`.${section}-deck .card-grid`);
      if (!sectionElement) {
        console.log(`[animateCardMoveByUUID] section ${section} not found`);
        return;
      }

      const cards = sectionElement.querySelectorAll('.deck-card');
      console.log(`[animateCardMoveByUUID] section ${section} has ${cards.length} cards`);

      let movedCount = 0;
      cards.forEach((card) => {
        const cardElement = card as HTMLElement;
        const uuid = cardElement.getAttribute('data-uuid');
        if (!uuid) return;

        const first = firstPositions.get(uuid);
        const last = cardElement.getBoundingClientRect();

        if (first && last) {
          const deltaX = first.left - last.left;
          const deltaY = first.top - last.top;

          console.log(`[animateCardMoveByUUID] uuid=${uuid}, deltaX=${deltaX}, deltaY=${deltaY}`);

          // 1ピクセル未満の移動は誤差として無視
          if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

          movedCount++;
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
      console.log(`[animateCardMoveByUUID] section ${section}: ${movedCount} cards will animate`);
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

  function moveCardToTrash(card: CardInfo, from: 'main' | 'extra' | 'side') {
    moveCard(card.cardId, from, 'trash');
  }

  function moveCardToSide(card: CardInfo, from: 'main' | 'extra' | 'trash', uuid?: string) {
    // trashからの移動の場合は枚数制限チェック
    if (from === 'trash') {
      const allDecks = [
        ...deckInfo.value.mainDeck,
        ...deckInfo.value.extraDeck,
        ...deckInfo.value.sideDeck
      ];
      const totalCount = allDecks
        .filter(dc => dc.card.cardId === card.cardId)
        .reduce((sum, dc) => sum + dc.quantity, 0);

      const settingsStore = useSettingsStore();
      const limit = settingsStore.cardLimitMode === 'all-3'
        ? 3
        : getCardLimit(card);

      if (totalCount >= limit) {
        return { success: false, error: 'max_copies_reached' };
      }
    }

    moveCard(card.cardId, from, 'side', uuid);
    return { success: true };
  }

  function moveCardToMainOrExtra(card: CardInfo, from: 'side' | 'trash', uuid?: string) {
    const targetSection = (card.cardType === 'monster' && card.isExtraDeck) ? 'extra' : 'main';

    // trashからの移動の場合は枚数制限チェック
    if (from === 'trash') {
      const allDecks = [
        ...deckInfo.value.mainDeck,
        ...deckInfo.value.extraDeck,
        ...deckInfo.value.sideDeck
      ];
      const totalCount = allDecks
        .filter(dc => dc.card.cardId === card.cardId)
        .reduce((sum, dc) => sum + dc.quantity, 0);

      const settingsStore = useSettingsStore();
      const limit = settingsStore.cardLimitMode === 'all-3'
        ? 3
        : getCardLimit(card);

      if (totalCount >= limit) {
        return { success: false, error: 'max_copies_reached' };
      }
    }

    moveCard(card.cardId, from, targetSection, uuid);
    return { success: true };
  }

  function moveCardFromSide(card: CardInfo) {
    const targetSection = (card.cardType === 'monster' && card.isExtraDeck) ? 'extra' : 'main';
    moveCard(card.cardId, 'side', targetSection);
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
                                sourceUuid: string, targetUuid: string | null) {
    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();

    // displayOrderからciidを取得
    const fromOrder = displayOrder.value[from];
    const sourceCard = fromOrder.find(dc => dc.uuid === sourceUuid);
    if (!sourceCard) return;

    const fromDeck = from === 'main' ? deckInfo.value.mainDeck :
                     from === 'extra' ? deckInfo.value.extraDeck :
                     from === 'side' ? deckInfo.value.sideDeck :
                     trashDeck.value;

    const deckCard = fromDeck.find(dc =>
      dc.card.cardId === cardId && dc.card.ciid === String(sourceCard.ciid)
    );
    if (!deckCard) return;

    // カード情報を保存（削除前に）
    const cardInfo = deckCard.card;

    // displayOrder操作関数を使用してデータを更新
    // 1. 移動元から削除
    removeFromDisplayOrder(cardId, from, sourceUuid, cardInfo.ciid);

    // 2. 移動先に挿入
    insertToDisplayOrder(cardInfo, to, targetUuid);

    // DOM更新後にアニメーション実行
    // nextTick + requestAnimationFrame でレイアウト計算完了を確実に待つ
    // 移動先のセクションのみアニメーション（移動元はカードがないためアニメーション不要）
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animateCardMoveByUUID(firstPositions, new Set([to]));
        });
      });
    });
  }

  function setDeckName(name: string) {
    deckInfo.value.name = name;
  }

  async function saveDeck(dno: number) {
    try {
      deckInfo.value.dno = dno;
      const result = await sessionManager.saveDeck(dno, deckInfo.value);
      return result;
    } catch (error) {
      console.error('Failed to save deck:', error);
      return { success: false, error: String(error) };
    }
  }

  async function loadDeck(dno: number) {
    try {
      const cgid = await sessionManager.getCgid();
      const loadedDeck = await getDeckDetail(dno, cgid);

      if (loadedDeck) {
        deckInfo.value = loadedDeck;

        // URLにdnoを同期
        URLStateManager.setDno(dno);
        
        // displayOrderを初期化
        initializeDisplayOrder();
        
        // ロード時はアニメーション不要（新規表示のため）
        
        lastUsedDno.value = dno;
        localStorage.setItem('ygo-deck-helper:lastUsedDno', String(dno));
      }
    } catch (error) {
      console.error('Failed to load deck:', error);
      throw error;
    }
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

    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();

    displayOrder.value[sectionType] = fisherYatesShuffle(section);

    // DOM更新後にアニメーション実行
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animateCardMoveByUUID(firstPositions, new Set([sectionType]));
        });
      });
    });
  }

  /**
   * 指定セクションのカードをソート
   */
  function sortSection(sectionType: 'main' | 'extra' | 'side' | 'trash') {
    const section = displayOrder.value[sectionType];
    if (!section || section.length === 0) return;

    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();

    // (cid, ciid)ペアからカード情報を取得するヘルパー関数
    const getCardInfo = (cid: string, ciid: number) => {
      const allDecks = [
        ...deckInfo.value.mainDeck,
        ...deckInfo.value.extraDeck,
        ...deckInfo.value.sideDeck,
        ...trashDeck.value
      ];
      const deckCard = allDecks.find(dc =>
        dc.card.cardId === cid && dc.card.ciid === String(ciid)
      );
      return deckCard ? deckCard.card : null;
    };

    // ソート優先順位
    const sorted = [...section].sort((a, b) => {
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
        const monsterTypeA = getMainType(cardA.types);
        const monsterTypeB = getMainType(cardB.types);
        if (monsterTypeA !== monsterTypeB) return monsterTypeA - monsterTypeB;

        // 4. Level/Rank/Link（降順）
        const levelA = cardA.levelValue ?? 0;
        const levelB = cardB.levelValue ?? 0;
        if (levelA !== levelB) return levelB - levelA; // 降順
      }

      // 3. Spell Type / Trap Type
      if (cardA.cardType === 'spell' && cardB.cardType === 'spell') {
        const spellTypeA = cardA.effectType ?? '';
        const spellTypeB = cardB.effectType ?? '';
        if (spellTypeA !== spellTypeB) return spellTypeA.localeCompare(spellTypeB);
      }
      if (cardA.cardType === 'trap' && cardB.cardType === 'trap') {
        const trapTypeA = cardA.effectType ?? '';
        const trapTypeB = cardB.effectType ?? '';
        if (trapTypeA !== trapTypeB) return trapTypeA.localeCompare(trapTypeB);
      }

      // 5. Card Name（昇順）
      return cardA.name.localeCompare(cardB.name, 'ja');
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
  }

  /**
   * 全セクションをソート
   */
  function sortAllSections() {
    sortSection('main');
    sortSection('extra');
    sortSection('side');
  }

  return {
    deckInfo,
    trashDeck,
    displayOrder,
    limitErrorCardId,
    deckList,
    lastUsedDno,
    searchQuery,
    searchResults,
    selectedCard,
    activeTab,
    showDetail,
    viewMode,
    cardTab,
    sortOrder,
    isLoading,
    allResults,
    currentPage,
    hasMore,
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
    setDeckName,
    saveDeck,
    loadDeck,
    fetchDeckList,
    initializeOnPageLoad,
    shuffleSection,
    sortSection,
    sortAllSections
  };
});
