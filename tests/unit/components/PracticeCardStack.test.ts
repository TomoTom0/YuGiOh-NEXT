/**
 * components/practice/PracticeCardStack のユニットテスト
 *
 * tests/design/practice-card-stack/conditions.toml（TASK-563 × TASK-331 Tier C第16号）の
 * 10条件をカバーする。unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - PracticeCardStackを直接mount。子DeckCardはカスタムstub: 受け取ったpropsを
 *   data属性へ描画し、ボタンで親がlistenするイベントを発火する。子の内部挙動は
 *   DeckCard自身の条件書が保証
 * - 観測対象は描画結果（DeckCardの件数・props・style・バッジ）とemitのみ。
 *   visibleCards等のvm内部computedは直接参照しない
 */
import { describe, it, expect } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { defineComponent } from 'vue';
import PracticeCardStack from '@/components/practice/PracticeCardStack.vue';
import type { PracticeCard, ZoneType } from '@/stores/practice';

// ============================================================
// DeckCard カスタムstub
// ============================================================

const DeckCardStub = defineComponent({
  name: 'DeckCard',
  props: {
    card: { type: Object, required: true },
    sectionType: { type: String, required: true },
    uuid: { type: String, required: true },
    forceReveal: { type: Boolean, default: false },
    zone: { type: String, default: undefined },
    slotIndex: { type: Number, default: undefined },
  },
  // clickはemit宣言しない: 親の@clickが根源要素へのnativeリスナとしてfallthroughする実DeckCardの挙動に合わせる
  emits: ['practice-action', 'practice-dragstart', 'practice-dragend'],
  template: `
    <div class="deck-card-stub"
      :data-card-id="card.cardId"
      :data-uuid="uuid"
      :data-section-type="sectionType"
      :data-force-reveal="forceReveal"
      :data-zone="zone"
      :data-slot-index="slotIndex">
      <button class="emit-practice-action" @click.stop="$emit('practice-action', 'flip', uuid)">pa</button>
      <button class="emit-practice-dragstart" @click.stop="$emit('practice-dragstart', $event, uuid, { x: 1, y: 2 })">pd</button>
      <button class="emit-practice-dragend" @click.stop="$emit('practice-dragend')">pe</button>
    </div>
  `,
});

// ============================================================
// fixture
// ============================================================

function makeCard(id: string, face?: 'up' | 'down', withInstanceId = true): PracticeCard {
  return {
    cardId: id,
    ciid: `${id}-ciid`,
    name: id,
    lang: 'ja',
    imgs: [],
    cardType: 'monster',
    empty: false,
    ...(withInstanceId ? { instanceId: `inst-${id}` } : {}),
    ...(face ? { face } : {}),
  } as PracticeCard;
}

interface MountOptions {
  cards: PracticeCard[];
  direction?: 'right-up' | 'left-up' | 'right' | 'left' | 'none';
  maxVisible?: number;
  forceReveal?: boolean;
  zone?: ZoneType;
  slotIndex?: number;
  cardWidth?: number;
  cardHeight?: number;
}

function mountStack(opts: MountOptions): VueWrapper {
  return mount(PracticeCardStack, {
    props: {
      cards: opts.cards,
      ...(opts.direction !== undefined ? { direction: opts.direction } : {}),
      ...(opts.maxVisible !== undefined ? { maxVisible: opts.maxVisible } : {}),
      ...(opts.forceReveal !== undefined ? { forceReveal: opts.forceReveal } : {}),
      ...(opts.zone !== undefined ? { zone: opts.zone } : {}),
      ...(opts.slotIndex !== undefined ? { slotIndex: opts.slotIndex } : {}),
      ...(opts.cardWidth !== undefined ? { cardWidth: opts.cardWidth } : {}),
      ...(opts.cardHeight !== undefined ? { cardHeight: opts.cardHeight } : {}),
    },
    global: { stubs: { DeckCard: DeckCardStub } },
  });
}

function stubsOf(wrapper: VueWrapper) {
  return wrapper.findAllComponents(DeckCardStub);
}

function stubCardIds(wrapper: VueWrapper): (string | undefined)[] {
  return stubsOf(wrapper).map((s) => s.props('card').cardId);
}

describe('components/practice/PracticeCardStack', () => {
  // --- ルートのclass・サイズ ---

  it('[covers:practice-card-stack.root-class-and-size-from-props] デフォルトではdirection-right-upクラスと36x53のサイズになる', () => {
    const wrapper = mountStack({ cards: [makeCard('a')] });
    const root = wrapper.element as HTMLElement;

    expect(root.classList.contains('direction-right-up')).toBe(true);
    expect(root.style.width).toBe('36px');
    expect(root.style.height).toBe('53px');
  });

  it('[covers:practice-card-stack.root-class-and-size-from-props] directionとカードサイズのpropがルートへ反映される', () => {
    const wrapper = mountStack({ cards: [makeCard('a')], direction: 'left', cardWidth: 60, cardHeight: 88 });
    const root = wrapper.element as HTMLElement;

    expect(root.classList.contains('direction-left')).toBe(true);
    expect(root.style.width).toBe('60px');
    expect(root.style.height).toBe('88px');
  });

  // --- 可視カードの選択（通常） ---

  it('[covers:practice-card-stack.visible-cards-capped-at-max-visible-from-tail] maxVisible以下なら全件描画する', () => {
    const wrapper = mountStack({ cards: [makeCard('a'), makeCard('b')], zone: 'monster' });

    expect(stubCardIds(wrapper)).toEqual(['a', 'b']);
  });

  it('[covers:practice-card-stack.visible-cards-capped-at-max-visible-from-tail] maxVisibleを超える場合は末尾maxVisible件を順序維持で描画する', () => {
    const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => makeCard(id));
    const wrapper = mountStack({ cards, zone: 'monster' });

    expect(stubCardIds(wrapper)).toEqual(['c', 'd', 'e']);
  });

  it('[covers:practice-card-stack.visible-cards-capped-at-max-visible-from-tail] maxVisible=2なら末尾2件を描画する', () => {
    const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => makeCard(id));
    const wrapper = mountStack({ cards, zone: 'monster', maxVisible: 2 });

    expect(stubCardIds(wrapper)).toEqual(['d', 'e']);
  });

  // --- 可視カードの選択（deck/extra裏向きモード） ---

  it('[covers:practice-card-stack.visible-cards-face-down-only-mode-selection] deckで全て裏向きなら先頭1件のみ描画する', () => {
    const cards = [makeCard('a', 'down'), makeCard('b', 'down'), makeCard('c', 'down')];
    const wrapper = mountStack({ cards, zone: 'deck' });

    expect(stubCardIds(wrapper)).toEqual(['a']);
  });

  it('[covers:practice-card-stack.visible-cards-face-down-only-mode-selection] deckで上端のみ表向きなら上端1件を描画する', () => {
    const cards = [makeCard('a', 'up'), makeCard('b', 'down'), makeCard('c', 'down')];
    const wrapper = mountStack({ cards, zone: 'deck' });

    expect(stubCardIds(wrapper)).toEqual(['a']);
  });

  it('[covers:practice-card-stack.visible-cards-face-down-only-mode-selection] deckで下端のみ表向きなら下端1件を描画する', () => {
    const cards = [makeCard('a', 'down'), makeCard('b', 'down'), makeCard('c', 'up')];
    const wrapper = mountStack({ cards, zone: 'deck' });

    expect(stubCardIds(wrapper)).toEqual(['c']);
  });

  it('[covers:practice-card-stack.visible-cards-face-down-only-mode-selection] deckで両端表向きなら下端→上端の順で2件描画する', () => {
    const cards = [makeCard('a', 'up'), makeCard('b', 'down'), makeCard('c', 'up')];
    const wrapper = mountStack({ cards, zone: 'deck' });

    expect(stubCardIds(wrapper)).toEqual(['c', 'a']);
  });

  it('[covers:practice-card-stack.visible-cards-face-down-only-mode-selection] deckで1件のみ表向きなら重複なく1件を描画する', () => {
    const wrapper = mountStack({ cards: [makeCard('a', 'up')], zone: 'deck' });

    expect(stubCardIds(wrapper)).toEqual(['a']);
  });

  it('[covers:practice-card-stack.visible-cards-face-down-only-mode-selection] forceReveal=trueでは裏向きモードに入らず末尾maxVisible件を描画する', () => {
    const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => makeCard(id, 'down'));
    const wrapper = mountStack({ cards, zone: 'deck', forceReveal: true });

    expect(stubCardIds(wrapper)).toEqual(['c', 'd', 'e']);
  });

  // --- DeckCardへのprops ---

  it('[covers:practice-card-stack.deck-card-props-bound] DeckCardへcard/section-type/uuid/force-reveal/zone/slot-indexが渡る', () => {
    const withId = makeCard('a');
    const withoutId = makeCard('b', undefined, false);
    const wrapper = mountStack({ cards: [withId, withoutId], zone: 'monster', slotIndex: 2, forceReveal: true });

    const stubs = stubsOf(wrapper);
    expect(stubs).toHaveLength(2);
    expect(stubs[0]?.props('card')).toEqual(withId);
    expect(stubs[0]?.props('sectionType')).toBe('practice');
    expect(stubs[0]?.props('uuid')).toBe('inst-a');
    expect(stubs[0]?.props('forceReveal')).toBe(true);
    expect(stubs[0]?.props('zone')).toBe('monster');
    expect(stubs[0]?.props('slotIndex')).toBe(2);
    expect(stubs[0]?.classes()).toContain('stack-card');
    expect(stubs[1]?.props('uuid')).toBe('');
  });

  // --- オフセットstyle ---

  it('[covers:practice-card-stack.offset-style-per-index-and-effective-direction] right-upでは左へ広がり上へずれるオフセットになる', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')];
    const wrapper = mountStack({ cards, zone: 'monster', direction: 'right-up' });

    const styles = stubsOf(wrapper).map((s) => s.element as HTMLElement);
    expect(styles.map((el) => el.style.left)).toEqual(['-16px', '0px', '16px']);
    expect(styles.map((el) => el.style.top)).toEqual(['0px', '-5px', '-10px']);
    expect(styles.map((el) => el.style.zIndex)).toEqual(['0', '1', '2']);
  });

  it('[covers:practice-card-stack.offset-style-per-index-and-effective-direction] direction=noneではオフセットが全て0になる', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')];
    const wrapper = mountStack({ cards, zone: 'monster', direction: 'none' });

    const styles = stubsOf(wrapper).map((s) => s.element as HTMLElement);
    expect(styles.map((el) => el.style.left)).toEqual(['0px', '0px', '0px']);
    expect(styles.map((el) => el.style.top)).toEqual(['0px', '0px', '0px']);
  });

  it('[covers:practice-card-stack.offset-style-per-index-and-effective-direction] deckで両端表向きならdirection=noneでもright-upのオフセットになる', () => {
    const cards = [makeCard('a', 'up'), makeCard('b', 'up')];
    const wrapper = mountStack({ cards, zone: 'deck', direction: 'none' });

    const styles = stubsOf(wrapper).map((s) => s.element as HTMLElement);
    expect(styles.map((el) => el.style.left)).toEqual(['-8px', '8px']);
    expect(styles.map((el) => el.style.top)).toEqual(['0px', '-5px']);
  });

  it('[covers:practice-card-stack.offset-style-per-index-and-effective-direction] deckで片端のみ表向きならdirection=right-upでもオフセット0になる', () => {
    const cards = [makeCard('a', 'up'), makeCard('b', 'down')];
    const wrapper = mountStack({ cards, zone: 'deck', direction: 'right-up' });

    const styles = stubsOf(wrapper).map((s) => s.element as HTMLElement);
    expect(styles).toHaveLength(1);
    expect(styles[0]?.style.left).toBe('0px');
    expect(styles[0]?.style.top).toBe('0px');
  });

  // --- バッジ ---

  it('[covers:practice-card-stack.badge-shows-total-count] 0件ではバッジを描画しない', () => {
    const wrapper = mountStack({ cards: [], zone: 'monster' });

    expect(wrapper.find('.stack-badge').exists()).toBe(false);
  });

  it('[covers:practice-card-stack.badge-shows-total-count] バッジは可視件数ではなく総件数を表示する', () => {
    const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => makeCard(id));
    const wrapper = mountStack({ cards, zone: 'monster' });

    expect(wrapper.find('.stack-badge').text()).toBe('5');
  });

  // --- イベント転送 ---

  it('[covers:practice-card-stack.card-click-forwarded] DeckCardのクリックがcard-clickをカードオブジェクトでemitする', async () => {
    const card = makeCard('a');
    const wrapper = mountStack({ cards: [card, makeCard('b')], zone: 'monster' });

    await stubsOf(wrapper)[0]!.find('.deck-card-stub').trigger('click');

    expect(wrapper.emitted('card-click')).toEqual([[card]]);
  });

  it('[covers:practice-card-stack.practice-action-forwarded-as-card-action] DeckCardのpractice-actionがcard-actionとして転送される', async () => {
    const wrapper = mountStack({ cards: [makeCard('a')], zone: 'monster' });

    await stubsOf(wrapper)[0]!.find('.emit-practice-action').trigger('click');

    expect(wrapper.emitted('card-action')).toEqual([['flip', 'inst-a']]);
  });

  it('[covers:practice-card-stack.practice-dragstart-forwarded] DeckCardのpractice-dragstartが同じ3引数で転送される', async () => {
    const wrapper = mountStack({ cards: [makeCard('a')], zone: 'monster' });

    await stubsOf(wrapper)[0]!.find('.emit-practice-dragstart').trigger('click');

    const emitted = wrapper.emitted('practice-dragstart');
    expect(emitted).toHaveLength(1);
    expect(emitted![0]![0]).toBeInstanceOf(Event);
    expect(emitted![0]![1]).toBe('inst-a');
    expect(emitted![0]![2]).toEqual({ x: 1, y: 2 });
  });

  it('[covers:practice-card-stack.practice-dragend-forwarded-as-card-dragend] DeckCardのpractice-dragendがcard-dragendとして転送される', async () => {
    const wrapper = mountStack({ cards: [makeCard('a')], zone: 'monster' });

    await stubsOf(wrapper)[0]!.find('.emit-practice-dragend').trigger('click');

    expect(wrapper.emitted('card-dragend')).toEqual([[]]);
  });
});
