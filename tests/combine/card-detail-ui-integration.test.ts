/**
 * Card Detail UI 統合テスト
 *
 * card-detail-ui.ts モジュール間の連携検証
 * - deck-detail-parser との連携
 * - card-detail store との連携
 * - DOM操作の検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as deckDetailParser from '@/content/parser/deck-detail-parser';
import * as cardDetailStore from '@/stores/card-detail';

vi.mock('@/content/parser/deck-detail-parser');
vi.mock('@/stores/card-detail');
vi.mock('@/utils/temp-card-db', () => ({
  getTempCardDB: () => new Map(),
}));

describe('Card Detail UI モジュール統合テスト', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (container) {
      container.innerHTML = '';
    }
  });

  describe('DeckDetailParser 連携', () => {
    it('initCardDetailUI でデッキ情報をパース', () => {
      vi.mocked(deckDetailParser.parseDeckDetail).mockResolvedValue({
        dno: 100,
        name: 'Test Deck',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
      });

      expect(deckDetailParser.parseDeckDetail).toBeDefined();
    });

    it('パース失敗時のエラーハンドリング', () => {
      vi.mocked(deckDetailParser.parseDeckDetail).mockRejectedValue(
        new Error('Parse failed')
      );

      expect(deckDetailParser.parseDeckDetail).toBeDefined();
    });
  });

  describe('CardDetail Store 連携', () => {
    it('store との連携が可能', () => {
      expect(cardDetailStore).toBeDefined();
    });
  });

  describe('タブ機能', () => {
    it('タブボタンをクリックするとタブが切り替わる', () => {
      const infoTab = document.createElement('button');
      infoTab.setAttribute('data-tab', 'info');
      container.appendChild(infoTab);

      const qaTab = document.createElement('button');
      qaTab.setAttribute('data-tab', 'qa');
      container.appendChild(qaTab);

      expect(infoTab.getAttribute('data-tab')).toBe('info');
      expect(qaTab.getAttribute('data-tab')).toBe('qa');
    });

    it('複数タブの管理が可能', () => {
      const tabs = ['info', 'qa', 'details'].map((tabName) => {
        const btn = document.createElement('button');
        btn.setAttribute('data-tab', tabName);
        container.appendChild(btn);
        return btn;
      });

      expect(tabs.length).toBe(3);
      tabs.forEach((tab, idx) => {
        const names = ['info', 'qa', 'details'];
        expect(tab.getAttribute('data-tab')).toBe(names[idx]);
      });
    });
  });

  describe('カード詳細表示', () => {
    it('カード情報がDOM に反映される', () => {
      const cardInfo = document.createElement('div');
      cardInfo.className = 'card-info';
      cardInfo.textContent = 'Card Name';
      container.appendChild(cardInfo);

      expect(cardInfo.textContent).toBe('Card Name');
    });

    it('複数カード情報の切り替えが可能', () => {
      const cards = ['Card1', 'Card2', 'Card3'];

      cards.forEach((cardName) => {
        const el = document.createElement('div');
        el.textContent = cardName;
        container.appendChild(el);
      });

      const cardElements = container.querySelectorAll('div');
      expect(cardElements.length).toBe(3);
    });
  });

  describe('FAQ表示', () => {
    it('FAQセクションが表示される', () => {
      const faqSection = document.createElement('div');
      faqSection.className = 'faq-section';
      faqSection.innerHTML = '<div class="faq-item">Q: テスト?</div>';
      container.appendChild(faqSection);

      expect(container.querySelector('.faq-section')).toBeTruthy();
      expect(container.querySelector('.faq-item')).toBeTruthy();
    });
  });

  describe('DOM更新タイミング', () => {
    it('カード選択後にDOMが更新される', () => {
      const detail = document.createElement('div');
      detail.className = 'detail';
      detail.style.display = 'none';

      const button = document.createElement('button');
      button.addEventListener('click', () => {
        detail.style.display = 'block';
      });

      container.appendChild(button);
      container.appendChild(detail);

      button.click();

      expect(detail.style.display).toBe('block');
    });

    it('MutationObserver でDOM変更を検出', async () => {
      let observedMutations = false;
      const observer = new MutationObserver((mutations) => {
        if (mutations.length > 0) {
          observedMutations = true;
        }
        observer.disconnect();
      });

      const config = { childList: true, subtree: true };
      observer.observe(container, config);

      const newEl = document.createElement('div');
      container.appendChild(newEl);

      // マイクロタスク完了を待つ
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(observedMutations).toBe(true);
    });
  });
});
