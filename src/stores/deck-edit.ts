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
    
    const index = fromDeck.findIndex(dc => dc.card.cardId === cardId);
    if (index !== -1) {
      const deckCard = fromDeck[index];
      if (!deckCard) return;
      const card = deckCard.card;
      
      // アニメーション用に移動前の位置を記録
      recordCardPositions(from);
      recordCardPositions(to);
      
      removeCard(cardId, from);
      
      const existingCard = toDeck.find(dc => dc.card.cardId === cardId);
      if (existingCard) {
        existingCard.quantity++;
      } else {
        toDeck.push({ card, quantity: 1 });
      }
      
      // DOM更新後にアニメーション実行
      nextTick(() => {
        animateSection(from);
        animateSection(to);
      });
    }
  }
  
  // セクション内のカード位置を記録
  function recordCardPositions(section: string) {
    const sectionElement = document.querySelector(`.${section}-deck .card-grid`);
    if (!sectionElement) return;
    
    const positions = new Map();
    const cards = sectionElement.querySelectorAll('.deck-card');
    cards.forEach(card => {
      const cardId = card.getAttribute('data-card-id');
      if (cardId) {
        positions.set(cardId, card.getBoundingClientRect());
      }
    });
    
    // セクションごとに位置情報を保存
    (window as any).__cardPositions = (window as any).__cardPositions || {};
    (window as any).__cardPositions[section] = positions;
  }
  
  // セクションのアニメーションを実行
  function animateSection(section: string) {
    const sectionElement = document.querySelector(`.${section}-deck .card-grid`);
    if (!sectionElement) return;
    
    const savedPositions = (window as any).__cardPositions?.[section];
    if (!savedPositions) return;
    
    const cards = sectionElement.querySelectorAll('.deck-card');
    const duration = 300;
    
    // Last & Invert
    cards.forEach(card => {
      const cardId = card.getAttribute('data-card-id');
      if (!cardId) return;
      
      const first = savedPositions.get(cardId);
      const last = card.getBoundingClientRect();
      
      if (first && last) {
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        
        if (deltaX === 0 && deltaY === 0) return;
        
        (card as HTMLElement).style.transition = 'none';
        (card as HTMLElement).style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      }
    });
    
    // リフロー
    sectionElement.getBoundingClientRect();
    
    // Play
    requestAnimationFrame(() => {
      cards.forEach(card => {
        if ((card as HTMLElement).style.transform) {
          (card as HTMLElement).style.transition = `transform ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
          (card as HTMLElement).style.transform = '';
        }
      });
    });
    
    // クリーンアップ
    setTimeout(() => {
      cards.forEach(card => {
        (card as HTMLElement).style.transition = '';
        (card as HTMLElement).style.transform = '';
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
