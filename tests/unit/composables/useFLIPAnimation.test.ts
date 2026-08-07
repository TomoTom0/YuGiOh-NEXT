import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { recordAllCardPositionsByUUID, animateCardMoveByUUID } from '@/composables/deck/useFLIPAnimation';
import { useDeckEditStore } from '@/stores/deck-edit';

/**
 * useFLIPAnimation のユニットテスト
 *
 * FLIP（First, Last, Invert, Play）テクニックによるカード移動アニメーションのロジックを検証。
 * 旧バージョンは process.exit() を使う独自ランナー形式で vitest.config の exclude に含まれて
 * いたが、TASK-330 で conditions.toml の [covers:<id>] タグ運用に載せるため Vitest 形式へ移行。
 */

interface MockRect {
  top: number;
  left: number;
  width?: number;
  height?: number;
}

function mockRect(el: Element, rect: MockRect): void {
  const width = rect.width ?? 100;
  const height = rect.height ?? 150;
  (el as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () => ({
    top: rect.top,
    left: rect.left,
    width,
    height,
    right: rect.left + width,
    bottom: rect.top + height,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({}),
  });
}

describe('useFLIPAnimation', () => {
  beforeEach(() => {
    // テストごとにアクティブ Pinia をリセット
    setActivePinia(createPinia());
    // requestAnimationFrame を即時実行するモック
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(Date.now());
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  // ===== recordAllCardPositionsByUUID =====

  describe('recordAllCardPositionsByUUID', () => {
    // [covers:record.empty_section_skipped]
    it('セクション要素が存在しない場合は空のMapを返す', () => {
      document.body.innerHTML = '';
      const result = recordAllCardPositionsByUUID();
      expect(result.size).toBe(0);
    });

    // [covers:record.card_without_data_uuid_ignored]
    it('data-uuid 属性を持たない .deck-card は記録対象外', () => {
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="uuid-1"></div>
            <div class="deck-card"></div>
          </div>
        </div>
      `;
      const cards = document.querySelectorAll('.deck-card');
      cards.forEach((card) => mockRect(card, { top: 0, left: 0 }));

      const result = recordAllCardPositionsByUUID();
      expect(result.size).toBe(1);
      expect(result.has('uuid-1')).toBe(true);
    });

    // [covers:record.records_uuid_to_domrect_across_all_four_sections]
    it('main/extra/side/trash の4セクションのカードを1つのMapに統合する', () => {
      document.body.innerHTML = `
        <div class="main-deck"><div class="card-grid"><div class="deck-card" data-uuid="main-1"></div></div></div>
        <div class="extra-deck"><div class="card-grid"><div class="deck-card" data-uuid="extra-1"></div></div></div>
        <div class="side-deck"><div class="card-grid"><div class="deck-card" data-uuid="side-1"></div></div></div>
        <div class="trash-deck"><div class="card-grid"><div class="deck-card" data-uuid="trash-1"></div></div></div>
      `;
      const cards = document.querySelectorAll('.deck-card');
      cards.forEach((card) => mockRect(card, { top: 0, left: 0 }));

      const result = recordAllCardPositionsByUUID();
      expect(result.size).toBe(4);
      expect(result.has('main-1')).toBe(true);
      expect(result.has('extra-1')).toBe(true);
      expect(result.has('side-1')).toBe(true);
      expect(result.has('trash-1')).toBe(true);
    });

    it('各カードのDOMRectを正確に記録する', () => {
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="uuid-1"></div>
            <div class="deck-card" data-uuid="uuid-2"></div>
          </div>
        </div>
      `;
      const cards = document.querySelectorAll('.deck-card');
      mockRect(cards[0], { top: 0, left: 0 });
      mockRect(cards[1], { top: 100, left: 50 });

      const result = recordAllCardPositionsByUUID();
      expect(result.get('uuid-1')?.top).toBe(0);
      expect(result.get('uuid-1')?.left).toBe(0);
      expect(result.get('uuid-2')?.top).toBe(100);
      expect(result.get('uuid-2')?.left).toBe(50);
    });
  });

  // ===== animateCardMoveByUUID =====

  describe('animateCardMoveByUUID', () => {
    // [covers:animate.skip_when_deck_loading]
    it('デッキロード中（isLoadingDeck=true）はアニメーション全体をスキップ', () => {
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="uuid-1"></div>
          </div>
        </div>
      `;
      const card = document.querySelector('.deck-card') as HTMLElement;
      mockRect(card, { top: 100, left: 50 });

      const firstPositions = new Map<string, DOMRect>();
      firstPositions.set('uuid-1', {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);

      // デッキロード中フラグを立てる
      const deckStore = useDeckEditStore();
      deckStore.isLoadingDeck = true;

      animateCardMoveByUUID(firstPositions, new Set(['main']));

      // スキップされた = transform/transition/zIndex が一切設定されない
      expect(card.style.transform).toBe('');
      expect(card.style.transition).toBe('');
      expect(card.style.zIndex).toBe('');

      // 後続テストのために解除
      deckStore.isLoadingDeck = false;
    });

    // [covers:animate.skip_section_when_no_section_element]
    it('affectedSections に対応するセクション要素が無い場合はエラーなく何もしない', () => {
      document.body.innerHTML = '';
      const firstPositions = new Map<string, DOMRect>();
      // エラーが投げられなければOK
      expect(() => animateCardMoveByUUID(firstPositions, new Set(['main']))).not.toThrow();
    });

    // [covers:animate.skip_card_when_no_data_uuid]
    it('data-uuid 属性を持たないカードは transform 設定対象外', () => {
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="uuid-1"></div>
            <div class="deck-card"></div>
          </div>
        </div>
      `;
      const cards = document.querySelectorAll('.deck-card');
      mockRect(cards[0], { top: 100, left: 50 });
      mockRect(cards[1], { top: 100, left: 50 });

      const firstPositions = new Map<string, DOMRect>();
      firstPositions.set('uuid-1', {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
      // data-uuid 無しカードも firstPositions に入れておくが、line 87 で弾かれるはず
      firstPositions.set('no-uuid-card', {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);

      animateCardMoveByUUID(firstPositions, new Set(['main']));

      // data-uuid 無しカード（cards[1]）のスタイルは変更されない
      expect((cards[1] as HTMLElement).style.transform).toBe('');
    });

    // [covers:animate.skip_card_when_uuid_not_in_first_positions]
    it('firstPositions に無いUUIDのカードはアニメーション対象外', () => {
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="uuid-1"></div>
            <div class="deck-card" data-uuid="uuid-2"></div>
          </div>
        </div>
      `;
      const cards = document.querySelectorAll('.deck-card');
      mockRect(cards[0], { top: 100, left: 50 });
      mockRect(cards[1], { top: 200, left: 100 });

      const firstPositions = new Map<string, DOMRect>();
      // uuid-1 のみ記録（uuid-2 は記録しない）
      firstPositions.set('uuid-1', {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);

      animateCardMoveByUUID(firstPositions, new Set(['main']));

      // uuid-1 はアニメーション対象、uuid-2 は対象外
      expect((cards[0] as HTMLElement).style.transition).toContain('transform');
      expect((cards[1] as HTMLElement).style.transition).toBe('');
    });

    // [covers:animate.skip_subpixel_movement]
    it('deltaX/deltaY ともに1px未満の移動は無視される', () => {
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="uuid-1"></div>
          </div>
        </div>
      `;
      const card = document.querySelector('.deck-card') as HTMLElement;
      // last: (0.5, 0.5) → first から deltaX=-0.5, deltaY=-0.5（両方1未満）
      mockRect(card, { top: 0.5, left: 0.5 });

      const firstPositions = new Map<string, DOMRect>();
      firstPositions.set('uuid-1', {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);

      animateCardMoveByUUID(firstPositions, new Set(['main']));

      // 1px未満移動は弾かれる = transform/transition 設定されない
      expect(card.style.transform).toBe('');
      expect(card.style.transition).toBe('');
    });

    // [covers:animate.invert_phase_sets_transform_immediately]
    it('Invert フェーズ: 移動対象カードに transform/transition=none/zIndex が同期的に設定される', () => {
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="uuid-1"></div>
          </div>
        </div>
      `;
      const card = document.querySelector('.deck-card') as HTMLElement;
      // last: (50, 100) → first (0,0) から deltaX=-50, deltaY=-100
      mockRect(card, { top: 100, left: 50 });

      const firstPositions = new Map<string, DOMRect>();
      firstPositions.set('uuid-1', {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);

      animateCardMoveByUUID(firstPositions, new Set(['main']));

      // Invert フェーズ直後（RAFモックにより即時にPlayフェーズまで進むが、
      // Invert で設定された transform は Play フェーズで空になる。
      // ただし zIndex='1000' は cleanup まで残るので、同期的に設定されたことは zIndex で検証）
      expect(card.style.zIndex).toBe('1000');
    });

    // [covers:animate.horizontal_weight_1_5x]
    it('横方向(deltaX)は1.5倍重み付けされ、同一距離でも縦方向より duration が長くなる', () => {
      // 横方向カード: deltaX=100, deltaY=0 → distance = sqrt((100*1.5)^2 + 0) = 150
      // 縦方向カード: deltaX=0, deltaY=100 → distance = sqrt(0 + 100^2) = 100
      // duration横 = min(600, 300 + sqrt(150)*12) = min(600, 300+147) = 447
      // duration縦 = min(600, 300 + sqrt(100)*12) = min(600, 300+120) = 420
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="horizontal"></div>
          </div>
        </div>
        <div class="extra-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="vertical"></div>
          </div>
        </div>
      `;
      const cards = document.querySelectorAll('.deck-card');
      const horizontalCard = cards[0] as HTMLElement;
      const verticalCard = cards[1] as HTMLElement;
      // 横方向へ100px移動: first(0,0) → last(100,0)
      mockRect(horizontalCard, { top: 0, left: 100 });
      // 縦方向へ100px移動: first(0,0) → last(0,100)
      mockRect(verticalCard, { top: 100, left: 0 });

      const firstPositions = new Map<string, DOMRect>();
      const baseRect: DOMRect = {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect;
      firstPositions.set('horizontal', baseRect);
      firstPositions.set('vertical', baseRect);

      animateCardMoveByUUID(firstPositions, new Set(['main', 'extra']));

      // 両方とも transition が設定される（horizontal_weight_1_5x の副作用で duration が異なる）
      expect(horizontalCard.style.transition).toMatch(/transform [\d.]+ms ease/);
      expect(verticalCard.style.transition).toMatch(/transform [\d.]+ms ease/);

      const horizontalDuration = parseFloat(horizontalCard.style.transition.match(/([\d.]+)ms/)?.[1] ?? '0');
      const verticalDuration = parseFloat(verticalCard.style.transition.match(/([\d.]+)ms/)?.[1] ?? '0');
      // 横方向(distance=150) > 縦方向(distance=100)
      expect(horizontalDuration).toBeGreaterThan(verticalDuration);
      // 実装は小数演算そのまま出力: 横 = 300 + sqrt(150)*12 ≈ 446.969、縦 = 300 + sqrt(100)*12 = 420
      expect(horizontalDuration).toBeCloseTo(300 + Math.sqrt(150) * 12, 5);
      expect(verticalDuration).toBeCloseTo(420, 5);
    });

    // [covers:animate.skip_all_when_no_moved_cards]
    it('全カードが1px未満移動で allCards 空の場合、早期returnしてクリーンアップ処理をスキップ', () => {
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="uuid-1"></div>
          </div>
        </div>
      `;
      const card = document.querySelector('.deck-card') as HTMLElement;
      // 1px未満移動（allCards 空）
      mockRect(card, { top: 0.3, left: 0.3 });

      const firstPositions = new Map<string, DOMRect>();
      firstPositions.set('uuid-1', {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);

      // requestAnimationFrame が呼ばれないことを spy で検証
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');

      animateCardMoveByUUID(firstPositions, new Set(['main']));

      expect(rafSpy).not.toHaveBeenCalled();
      expect(card.style.transform).toBe('');
    });

    // [covers:animate.play_phase_sets_transition_via_raf]
    it('Play フェーズ: RAF経由で transition が "transform ${duration}ms ease" 形式で設定される', () => {
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="uuid-1"></div>
          </div>
        </div>
      `;
      const card = document.querySelector('.deck-card') as HTMLElement;
      mockRect(card, { top: 100, left: 50 });

      const firstPositions = new Map<string, DOMRect>();
      firstPositions.set('uuid-1', {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);

      animateCardMoveByUUID(firstPositions, new Set(['main']));

      // RAF モックにより即時実行 → transition が設定される（duration は小数の場合あり）
      expect(card.style.transition).toMatch(/^transform [\d.]+ms ease$/);
      // Play フェーズで transform は空にリセットされる
      expect(card.style.transform).toBe('');
    });

    // [covers:animate.duration_clamped_to_300_600ms]
    it('duration は 300ms（下限）〜600ms（上限）にクランプされる', () => {
      // 非常に小さい移動: deltaX=1, deltaY=0 → distance = sqrt(1.5^2) = 1.5
      // duration = min(600, 300 + sqrt(1.5)*12) = min(600, 314) = 314ms（下限寄り）
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="small"></div>
          </div>
        </div>
      `;
      const smallCard = document.querySelector('.deck-card') as HTMLElement;
      // deltaX=1（1px移動で対象内）, deltaY=0
      mockRect(smallCard, { top: 0, left: 1 });

      const firstPositions = new Map<string, DOMRect>();
      firstPositions.set('small', {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);

      animateCardMoveByUUID(firstPositions, new Set(['main']));
      const smallDuration = parseFloat(smallCard.style.transition.match(/([\d.]+)ms/)?.[1] ?? '0');
      // 下限側: 300 + sqrt(1.5)*12 ≈ 314.70
      expect(smallDuration).toBeGreaterThanOrEqual(300);
      expect(smallDuration).toBeLessThanOrEqual(600);

      // 上限側: 非常に大きい移動で 600ms にクランプ
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="large"></div>
          </div>
        </div>
      `;
      const largeCard = document.querySelector('.deck-card') as HTMLElement;
      // deltaX=10000 → weightedDeltaX=15000 → distance=15000
      // duration = min(600, 300 + sqrt(15000)*12) = min(600, 300+1470) → 600（クランプ）
      mockRect(largeCard, { top: 0, left: 10000 });

      const largePositions = new Map<string, DOMRect>();
      largePositions.set('large', {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);

      animateCardMoveByUUID(largePositions, new Set(['main']));
      const largeDuration = parseFloat(largeCard.style.transition.match(/([\d.]+)ms/)?.[1] ?? '0');
      expect(largeDuration).toBe(600);
    });

    // [covers:animate.cleanup_after_max_duration]
    it('maxDuration 経過後に transition/transform/zIndex が空文字にリセットされる', () => {
      vi.useFakeTimers();
      try {
        document.body.innerHTML = `
          <div class="main-deck">
            <div class="card-grid">
              <div class="deck-card" data-uuid="uuid-1"></div>
            </div>
          </div>
        `;
        const card = document.querySelector('.deck-card') as HTMLElement;
        mockRect(card, { top: 100, left: 50 });

        const firstPositions = new Map<string, DOMRect>();
        firstPositions.set('uuid-1', {
          top: 0, left: 0, width: 100, height: 150,
          right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
        } as DOMRect);

        animateCardMoveByUUID(firstPositions, new Set(['main']));

        // 直後: zIndex='1000', transition 設定済み
        expect(card.style.zIndex).toBe('1000');

        // maxDuration 経過後にクリーンアップ
        vi.advanceTimersByTime(1000);

        expect(card.style.transition).toBe('');
        expect(card.style.transform).toBe('');
        expect(card.style.zIndex).toBe('');
      } finally {
        vi.useRealTimers();
      }
    });

    // [covers:animate.max_duration_uses_same_formula_as_per_card]
    it('maxDuration は per-card duration の最大値と一致する（同計算式で再計算）', () => {
      vi.useFakeTimers();
      try {
        // 2枚のカード: 1枚は duration=420ms（deltaY=100）、1枚は duration=600ms（クランプ）
        document.body.innerHTML = `
          <div class="main-deck">
            <div class="card-grid">
              <div class="deck-card" data-uuid="small"></div>
            </div>
          </div>
          <div class="extra-deck">
            <div class="card-grid">
              <div class="deck-card" data-uuid="large"></div>
            </div>
          </div>
        `;
        const cards = document.querySelectorAll('.deck-card');
        const smallCard = cards[0] as HTMLElement;
        const largeCard = cards[1] as HTMLElement;
        // small: deltaY=100 → distance=100 → duration=420
        mockRect(smallCard, { top: 100, left: 0 });
        // large: deltaX=10000 → distance=15000 → duration=600（クランプ）
        mockRect(largeCard, { top: 0, left: 10000 });

        const firstPositions = new Map<string, DOMRect>();
        const baseRect: DOMRect = {
          top: 0, left: 0, width: 100, height: 150,
          right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
        } as DOMRect;
        firstPositions.set('small', baseRect);
        firstPositions.set('large', baseRect);

        animateCardMoveByUUID(firstPositions, new Set(['main', 'extra']));

        const smallDuration = parseFloat(smallCard.style.transition.match(/([\d.]+)ms/)?.[1] ?? '0');
        const largeDuration = parseFloat(largeCard.style.transition.match(/([\d.]+)ms/)?.[1] ?? '0');
        expect(smallDuration).toBeCloseTo(420, 5);
        expect(largeDuration).toBe(600);

        // maxDuration = max(420, 600) = 600
        // 600ms 経過時点ではクリーンアップはまだ走らない（setTimeout は600ms後に発火）
        vi.advanceTimersByTime(599);
        expect(smallCard.style.zIndex).toBe('1000');

        // 600ms 経過でクリーンアップ発火
        vi.advanceTimersByTime(1);
        expect(smallCard.style.zIndex).toBe('');
        expect(largeCard.style.zIndex).toBe('');
      } finally {
        vi.useRealTimers();
      }
    });

    it('複数セクションの複数カードを同時にアニメーション（統合テスト）', () => {
      document.body.innerHTML = `
        <div class="main-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="main-1"></div>
          </div>
        </div>
        <div class="extra-deck">
          <div class="card-grid">
            <div class="deck-card" data-uuid="extra-1"></div>
          </div>
        </div>
      `;
      const cards = document.querySelectorAll('.deck-card');
      mockRect(cards[0], { top: 100, left: 50 });
      mockRect(cards[1], { top: 200, left: 100 });

      const firstPositions = new Map<string, DOMRect>();
      const baseRect: DOMRect = {
        top: 0, left: 0, width: 100, height: 150,
        right: 100, bottom: 150, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect;
      firstPositions.set('main-1', baseRect);
      // extra-1 の first 位置は (100, 50) にしておく
      firstPositions.set('extra-1', {
        top: 100, left: 50, width: 100, height: 150,
        right: 150, bottom: 250, x: 50, y: 100, toJSON: () => ({}),
      } as DOMRect);

      animateCardMoveByUUID(firstPositions, new Set(['main', 'extra']));

      expect((cards[0] as HTMLElement).style.transition).toContain('transform');
      expect((cards[1] as HTMLElement).style.transition).toContain('transform');
    });
  });
});
