import { defineStore } from 'pinia';
import { ref, nextTick } from 'vue';
import type { DeckInfo, DeckCard } from '../types/deck';
import type { CardInfo } from '../types/card';
import { sessionManager } from '../content/session/session';
import { getDeckDetail } from '../api/deck-operations';
import { buildCardImageUrl } from '../api/card-search';

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
  
  // 表示順序データ構造: 画面上のカード画像の並び順
  interface DisplayCard {
    cid: string;      // カードID
    ciid: number;     // 同じカードの何枚目か（0始まり）
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
  
  // UUID生成ヘルパー
  function generateUUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
  const sortOrder = ref('release_desc');
  const isLoading = ref(false);
  const allResults = ref<CardInfo[]>([]);
  const currentPage = ref(0);
  const hasMore = ref(false);

  function addCard(card: CardInfo, section: 'main' | 'extra' | 'side') {
    const targetDeck = section === 'main' ? deckInfo.value.mainDeck :
                       section === 'extra' ? deckInfo.value.extraDeck :
                       deckInfo.value.sideDeck;
    
    const existingCard = targetDeck.find(dc => dc.card.cardId === card.cardId);
    if (existingCard) {
      existingCard.quantity++;
    } else {
      targetDeck.push({ card, quantity: 1 });
    }
    
    // displayOrderに追加
    const sectionOrder = displayOrder.value[section];
    const existingCards = sectionOrder.filter(dc => dc.cid === card.cardId);
    const ciid = existingCards.length; // 何枚目か
    
    sectionOrder.push({
      cid: card.cardId,
      ciid: ciid,
      uuid: generateUUID()
    });
  }

  function removeCard(cardId: string, section: 'main' | 'extra' | 'side' | 'trash') {
    const targetDeck = section === 'main' ? deckInfo.value.mainDeck :
                       section === 'extra' ? deckInfo.value.extraDeck :
                       section === 'side' ? deckInfo.value.sideDeck :
                       trashDeck.value;
    
    const index = targetDeck.findIndex(dc => dc.card.cardId === cardId);
    if (index !== -1) {
      const deckCard = targetDeck[index];
      if (deckCard && deckCard.quantity > 1) {
        deckCard.quantity--;
      } else {
        targetDeck.splice(index, 1);
      }
    }
    
    // displayOrderから削除（最後の1枚を削除）
    const sectionOrder = displayOrder.value[section];
    const lastIndex = sectionOrder.map(dc => dc.cid).lastIndexOf(cardId);
    if (lastIndex !== -1) {
      sectionOrder.splice(lastIndex, 1);
      
      // ciidを再計算（削除後の同じカードのインデックスを更新）
      sectionOrder.forEach((dc, idx) => {
        if (dc.cid === cardId) {
          const precedingCount = sectionOrder.slice(0, idx).filter(d => d.cid === cardId).length;
          dc.ciid = precedingCount;
        }
      });
    }
  }

  function moveCard(cardId: string, from: 'main' | 'extra' | 'side' | 'trash', to: 'main' | 'extra' | 'side' | 'trash') {
    const fromDeck = from === 'main' ? deckInfo.value.mainDeck :
                     from === 'extra' ? deckInfo.value.extraDeck :
                     from === 'side' ? deckInfo.value.sideDeck :
                     trashDeck.value;
    
    const toDeck = to === 'main' ? deckInfo.value.mainDeck :
                   to === 'extra' ? deckInfo.value.extraDeck :
                   to === 'side' ? deckInfo.value.sideDeck :
                   trashDeck.value;
    
    const fromIndex = fromDeck.findIndex(dc => dc.card.cardId === cardId);
    if (fromIndex === -1) return;
    
    const deckCard = fromDeck[fromIndex];
    if (!deckCard) return;
    const card = deckCard.card;
    
    // FLIP アニメーション: First - データ変更前に全カード位置をUUIDで記録
    const firstPositions = recordAllCardPositionsByUUID();
    
    // displayOrderから移動するカードを1枚取得（最後の1枚）
    const fromOrder = displayOrder.value[from];
    const moveCardIndex = fromOrder.map(dc => dc.cid).lastIndexOf(cardId);
    if (moveCardIndex === -1) return;
    
    const movingDisplayCard = fromOrder[moveCardIndex];
    
    // fromのdisplayOrderから削除
    fromOrder.splice(moveCardIndex, 1);
    
    // fromのciidを再計算
    fromOrder.forEach((dc, idx) => {
      if (dc.cid === cardId) {
        const precedingCount = fromOrder.slice(0, idx).filter(d => d.cid === cardId).length;
        dc.ciid = precedingCount;
      }
    });
    
    // toのdisplayOrderに追加
    const toOrder = displayOrder.value[to];
    const existingInTo = toOrder.filter(dc => dc.cid === cardId);
    movingDisplayCard.ciid = existingInTo.length;
    toOrder.push(movingDisplayCard);
    
    // deckInfoを更新
    removeCard(cardId, from);
    const existingCard = toDeck.find(dc => dc.card.cardId === cardId);
    if (existingCard) {
      existingCard.quantity++;
    } else {
      toDeck.push({ card, quantity: 1 });
    }
    
    // DOM更新後にアニメーション実行
    nextTick(() => {
      animateCardMoveByUUID(firstPositions, new Set([from, to]));
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
    const duration = 300;
    const allCards: HTMLElement[] = [];
    
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
          
          if (deltaX === 0 && deltaY === 0) return;
          
          cardElement.style.transition = 'none';
          cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          allCards.push(cardElement);
        }
      });
    });
    
    if (allCards.length === 0) return;
    
    document.body.getBoundingClientRect();
    
    requestAnimationFrame(() => {
      allCards.forEach(card => {
        card.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
        card.style.transform = '';
      });
    });
    
    setTimeout(() => {
      allCards.forEach(card => {
        card.style.transition = '';
        card.style.transform = '';
      });
    }, duration);
  }
  
  // 全セクションの全カード位置を記録（セクション+インデックスで識別）
  function recordAllCardPositions(): Map<string, DOMRect> {
    const positions = new Map<string, DOMRect>();
    const sections = ['main', 'extra', 'side', 'trash'];
    
    sections.forEach(section => {
      const sectionElement = document.querySelector(`.${section}-deck .card-grid`);
      if (!sectionElement) return;
      
      const cards = sectionElement.querySelectorAll('.deck-card');
      cards.forEach((card, index) => {
        const cardId = (card as HTMLElement).getAttribute('data-card-id');
        if (cardId) {
          // セクション名+インデックスでユニークなキーを作成
          const uniqueKey = `${section}-${index}`;
          positions.set(uniqueKey, card.getBoundingClientRect());
        }
      });
    });
    
    return positions;
  }
  
  // 影響を受けるカードのみアニメーションを実行
  function animateCardMove(firstPositions: Map<string, DOMRect>, affectedSections: Set<string>) {
    const duration = 300;
    const allCards: HTMLElement[] = [];
    
    // 影響を受けるセクションのみ処理
    affectedSections.forEach(section => {
      const sectionElement = document.querySelector(`.${section}-deck .card-grid`);
      if (!sectionElement) return;
      
      const cards = sectionElement.querySelectorAll('.deck-card');
      cards.forEach((card, index) => {
        const cardElement = card as HTMLElement;
        const uniqueKey = `${section}-${index}`;
        
        const first = firstPositions.get(uniqueKey);
        const last = cardElement.getBoundingClientRect();
        
        if (first && last) {
          const deltaX = first.left - last.left;
          const deltaY = first.top - last.top;
          
          // 移動がない場合はスキップ
          if (deltaX === 0 && deltaY === 0) return;
          
          // Invert: transformで元の位置に戻す
          cardElement.style.transition = 'none';
          cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          allCards.push(cardElement);
        }
      });
    });
    
    if (allCards.length === 0) return;
    
    // リフローを強制
    document.body.getBoundingClientRect();
    
    // Play: transformを0にしてアニメーション開始
    requestAnimationFrame(() => {
      allCards.forEach(card => {
        card.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
        card.style.transform = '';
      });
    });
    
    // クリーンアップ
    setTimeout(() => {
      allCards.forEach(card => {
        card.style.transition = '';
        card.style.transform = '';
      });
    }, duration);
  }

  function moveCardToTrash(card: CardInfo, from: 'main' | 'extra' | 'side') {
    moveCard(card.cardId, from, 'trash');
  }

  function moveCardToSide(card: CardInfo, from: 'main' | 'extra' | 'trash') {
    moveCard(card.cardId, from, 'side');
  }

  function moveCardToMainOrExtra(card: CardInfo, from: 'side' | 'trash') {
    const targetSection = (card.cardType === 'monster' && card.isExtraDeck) ? 'extra' : 'main';
    moveCard(card.cardId, from, targetSection);
  }

  function moveCardFromSide(card: CardInfo) {
    const targetSection = (card.cardType === 'monster' && card.isExtraDeck) ? 'extra' : 'main';
    moveCard(card.cardId, 'side', targetSection);
  }

  function addCopyToSection(card: CardInfo, section: 'main' | 'extra' | 'side') {
    addCard(card, section);
  }

  function addCopyToMainOrExtra(card: CardInfo) {
    const targetSection = (card.cardType === 'monster' && card.isExtraDeck) ? 'extra' : 'main';
    addCard(card, targetSection);
  }

  function insertCard(card: CardInfo, section: 'main' | 'extra' | 'side' | 'trash', position: number) {
    const targetDeck = section === 'main' ? deckInfo.value.mainDeck :
                       section === 'extra' ? deckInfo.value.extraDeck :
                       section === 'side' ? deckInfo.value.sideDeck :
                       trashDeck.value;
    
    const existingIndex = targetDeck.findIndex(dc => dc.card.cardId === card.cardId);
    if (existingIndex !== -1) {
      const existing = targetDeck[existingIndex];
      if (existing) existing.quantity++;
    } else {
      targetDeck.splice(position, 0, { card, quantity: 1 });
    }
  }

  function moveCardWithPosition(cardId: string, from: 'main' | 'extra' | 'side' | 'trash', 
                                fromIndex: number, to: 'main' | 'extra' | 'side' | 'trash', 
                                toIndex: number) {
    const fromDeck = from === 'main' ? deckInfo.value.mainDeck :
                     from === 'extra' ? deckInfo.value.extraDeck :
                     from === 'side' ? deckInfo.value.sideDeck :
                     trashDeck.value;
    
    const toDeck = to === 'main' ? deckInfo.value.mainDeck :
                   to === 'extra' ? deckInfo.value.extraDeck :
                   to === 'side' ? deckInfo.value.sideDeck :
                   trashDeck.value;
    
    if (from === to) {
      const flatFrom = fromDeck.flatMap((dc, idx) => 
        Array(dc.quantity).fill(null).map((_, qIdx) => ({ deckCardIndex: idx, quantityIndex: qIdx, card: dc.card }))
      );
      
      if (fromIndex >= 0 && fromIndex < flatFrom.length && toIndex >= 0) {
        const sourceCard = flatFrom[fromIndex];
        if (!sourceCard) return;
        removeCard(sourceCard.card.cardId, from);
        
        const flatAfterRemove = fromDeck.flatMap((dc, idx) => 
          Array(dc.quantity).fill(null).map((_, qIdx) => ({ deckCardIndex: idx, quantityIndex: qIdx, card: dc.card }))
        );
        
        const actualToIndex = Math.min(toIndex, flatAfterRemove.length);
        insertCard(sourceCard.card, to, actualToIndex);
      }
    } else {
      const flatFrom = fromDeck.flatMap((dc, idx) => 
        Array(dc.quantity).fill(null).map((_, qIdx) => ({ deckCardIndex: idx, quantityIndex: qIdx, card: dc.card }))
      );
      
      if (fromIndex >= 0 && fromIndex < flatFrom.length) {
        const sourceCard = flatFrom[fromIndex];
        if (!sourceCard) return;
        removeCard(sourceCard.card.cardId, from);
        
        const flatTo = toDeck.flatMap((dc, idx) => 
          Array(dc.quantity).fill(null).map((_, qIdx) => ({ deckCardIndex: idx, quantityIndex: qIdx, card: dc.card }))
        );
        
        const actualToIndex = Math.min(toIndex, flatTo.length);
        insertCard(sourceCard.card, to, actualToIndex);
      }
    }
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
        // imageUrl を各カードに追加
        const addImageUrls = (deckCards: DeckCard[]) => {
          return deckCards.map(dc => ({
            ...dc,
            card: {
              ...dc.card,
              imageUrl: dc.card.imageUrl || buildCardImageUrl(dc.card)
            }
          }));
        };
        
        loadedDeck.mainDeck = addImageUrls(loadedDeck.mainDeck);
        loadedDeck.extraDeck = addImageUrls(loadedDeck.extraDeck);
        loadedDeck.sideDeck = addImageUrls(loadedDeck.sideDeck);
        
        deckInfo.value = loadedDeck;
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
      // デッキ一覧を取得
      const list = await fetchDeckList();
      
      if (list.length === 0) {
        // デッキがない場合は何もしない
        return;
      }

      // 前回使用したdnoを取得
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

  return {
    deckInfo,
    trashDeck,
    displayOrder,
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
    moveCardToTrash,
    moveCardToSide,
    moveCardToMainOrExtra,
    moveCardFromSide,
    addCopyToSection,
    addCopyToMainOrExtra,
    insertCard,
    moveCardWithPosition,
    setDeckName,
    saveDeck,
    loadDeck,
    fetchDeckList,
    initializeOnPageLoad
  };
});
