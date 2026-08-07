import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDragQuarter } from '@/composables/practice/useDragQuarter';
import type { DropPosition } from '@/utils/drag-data';

/**
 * useDragQuarter のユニットテスト。
 *
 * handleDragOver / handleDragLeave は event.currentTarget / event.relatedTarget を読むため、
 * JSDOM 上で currentTarget を確実に設定できる dispatchEvent 経由で駆動する
 * （Object.defineProperty による currentTarget の直接設定は JSDOM のプロトタイプ getter に
 * 邪魔されて機能しないため）。getDropPos / reset はイベントを介さないため直接呼び出す。
 *
 * currentTarget が HTMLElement でないガード(L10)は、document（HTMLElement ではない）へ
 * リスナー登録して dispatchEvent することで検証する。
 */
interface MockRect {
  top: number;
  left: number;
  width?: number;
  height?: number;
}

/**
 * Element の getBoundingClientRect をモックする。useFLIPAnimation.test.ts の mockRect と同等だが、
 * 完全な DOMRect オブジェクトを返して `as DOMRect` キャストを不要にする。
 */
function mockRect(el: Element, rect: MockRect): void {
  const width = rect.width ?? 100;
  const height = rect.height ?? 100;
  // JSDOM では getBoundingClientRect の単純代入・Object.defineProperty いずれも
  // プロトタイプ実装が優先されてしまうため、vi.spyOn で確実にモックする。
  // as キャスト不使用（プロジェクトルール）。new DOMRect で本物の DOMRect を返す。
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(rect.left, rect.top, width, height)
  );
}

type Composable = ReturnType<typeof useDragQuarter>;

/**
 * target 要素で dragover を発生させ、handleDragOver を dispatchEvent 経由で呼ぶ。
 * JSDOM が currentTarget = target を自然に設定するため、getBoundingClientRect のモックが効く。
 */
function fireDragOver(target: HTMLElement, c: Composable, clientX = 0, clientY = 0): void {
  // JSDOM の DragEvent は MouseEventInit の clientX/clientY を反映しないため、
  // Object.defineProperty の getter でプロトタイプの getter をオーバーライドして設定する。
  const event = new DragEvent('dragover');
  Object.defineProperty(event, 'clientX', { configurable: true, get: () => clientX });
  Object.defineProperty(event, 'clientY', { configurable: true, get: () => clientY });
  target.addEventListener('dragover', c.handleDragOver);
  target.dispatchEvent(event);
}

/**
 * target 要素で dragleave を発生させ、handleDragLeave を dispatchEvent 経由で呼ぶ。
 */
function fireDragLeave(target: HTMLElement, c: Composable, relatedTarget: EventTarget | null): void {
  // JSDOM の DragEvent は MouseEventInit の relatedTarget を反映しないため、
  // Object.defineProperty の getter でプロトタイプの getter をオーバーライドして設定する。
  const event = new DragEvent('dragleave');
  Object.defineProperty(event, 'relatedTarget', { configurable: true, get: () => relatedTarget });
  target.addEventListener('dragleave', c.handleDragLeave);
  target.dispatchEvent(event);
}

describe('useDragQuarter', () => {
  let originalBodyContent: string;

  beforeEach(() => {
    originalBodyContent = document.body.innerHTML;
  });

  afterEach(() => {
    document.body.innerHTML = originalBodyContent;
  });

  // ===== useDragQuarter#handleDragOver =====

  describe('handleDragOver', () => {
    // [covers:handledragover.always_sets_isdragover_true_before_guard]
    it('DragEventでないEventでも冒頭でisDragOverがtrueに設定される（ガード前の副作用）', () => {
      const c = useDragQuarter();
      expect(c.isDragOver.value).toBe(false);

      // DragEvent ではない素の Event を直接渡す
      c.handleDragOver(new Event('dragover'));

      // isDragOver はガード前に無条件で true になる
      expect(c.isDragOver.value).toBe(true);
      // dragQuarter はガードで弾かれるため更新されない（初期値 null のまま）
      expect(c.dragQuarter.value).toBeNull();
    });

    // [covers:handledragover.early_return_when_not_dragevent_or_html_element]
    it('DragEventだがcurrentTargetがHTMLElementでない場合はdragQuarterを更新しない', () => {
      const c = useDragQuarter();
      const preset: DropPosition = { isRight: false, isTop: false };

      // まず正常系で dragQuarter を設定（div 要素で dragover 発火）
      const target = document.createElement('div');
      document.body.appendChild(target);
      mockRect(target, { top: 0, left: 0, width: 100, height: 100 });
      fireDragOver(target, c, 20, 80);
      expect(c.dragQuarter.value).toEqual(preset); // bottom-left

      // currentTarget が HTMLElement でない（= Document）DragEvent ではガードで弾かれる
      // document は HTMLElement ではないため、リスナー登録して dispatchEvent すると
      // currentTarget = document となり instanceof HTMLElement が false になる
      const docEvent = new DragEvent('dragover', { clientX: 80, clientY: 20 });
      document.addEventListener('dragover', c.handleDragOver);
      document.dispatchEvent(docEvent);

      // isDragOver は L9 で true にされるが、dragQuarter はガードで更新されず preset を維持
      expect(c.isDragOver.value).toBe(true);
      expect(c.dragQuarter.value).toEqual(preset);
    });

    // [covers:handledragover.isright_inclusive_geq_midline]
    it('isRight境界は中央値を含み(>=): clientXがピッタリ中央ならisRight=true', () => {
      const c = useDragQuarter();
      const target = document.createElement('div');
      document.body.appendChild(target);
      mockRect(target, { top: 0, left: 0, width: 100, height: 100 });

      // clientX=50（中央値）は >= により右側に含まれる
      fireDragOver(target, c, 50, 10);

      expect(c.isDragOver.value).toBe(true);
      expect(c.dragQuarter.value?.isRight).toBe(true);
    });

    // [covers:handledragover.istop_exclusive_lt_midline]
    it('isTop境界は中央値を含まない(<): clientYがピッタリ中央ならisTop=false（isRightと非対称）', () => {
      const c = useDragQuarter();
      const target = document.createElement('div');
      document.body.appendChild(target);
      mockRect(target, { top: 0, left: 0, width: 100, height: 100 });

      // clientY=50（中央値）は < により下側に含まれない（isTop=false）
      fireDragOver(target, c, 80, 50);

      expect(c.dragQuarter.value?.isTop).toBe(false);
    });

    // [covers:handledragover.computes_quarter_from_clientxy]
    it('clientX/clientYから1/4分割位置を計算してdragQuarterに設定する', () => {
      const c = useDragQuarter();
      const target = document.createElement('div');
      document.body.appendChild(target);
      mockRect(target, { top: 0, left: 0, width: 100, height: 100 });

      // clientX=80(右), clientY=20(上) → top-right
      fireDragOver(target, c, 80, 20);

      expect(c.dragQuarter.value).toEqual({ isRight: true, isTop: true });
    });

    it('rectにオフセットがあっても left+width/2, top+height/2 で境界を計算', () => {
      const c = useDragQuarter();
      const target = document.createElement('div');
      document.body.appendChild(target);
      mockRect(target, { top: 200, left: 100, width: 100, height: 100 });

      // 中央 = left100+50=150, top200+50=250
      // clientX=150 は >= で右、clientY=250 は < で下 → bottom-right
      fireDragOver(target, c, 150, 250);

      expect(c.dragQuarter.value).toEqual({ isRight: true, isTop: false });
    });
  });

  // ===== useDragQuarter#handleDragLeave =====

  describe('handleDragLeave', () => {
    // [covers:handledragleave.resets_state_when_related_null_or_outside]
    it('relatedTargetがnullの場合、isDragOver/dragQuarterをリセットする', () => {
      const c = useDragQuarter();
      const target = document.createElement('div');
      document.body.appendChild(target);
      mockRect(target, { top: 0, left: 0, width: 100, height: 100 });

      // 事前に dragover で状態を設定
      fireDragOver(target, c, 80, 20);
      expect(c.isDragOver.value).toBe(true);
      expect(c.dragQuarter.value).toEqual({ isRight: true, isTop: true });

      // relatedTarget=null でドラッグが外に出た扱い
      fireDragLeave(target, c, null);

      expect(c.isDragOver.value).toBe(false);
      expect(c.dragQuarter.value).toBeNull();
    });

    it('relatedTargetがcurrentTarget外の要素の場合、状態をリセットする', () => {
      const c = useDragQuarter();
      const target = document.createElement('div');
      const outside = document.createElement('span');
      document.body.appendChild(target);
      document.body.appendChild(outside);
      mockRect(target, { top: 0, left: 0, width: 100, height: 100 });

      fireDragOver(target, c, 80, 20);
      expect(c.isDragOver.value).toBe(true);

      // outside は target に含まれない
      fireDragLeave(target, c, outside);

      expect(c.isDragOver.value).toBe(false);
      expect(c.dragQuarter.value).toBeNull();
    });

    // [covers:handledragleave.preserves_state_when_related_inside]
    it('relatedTargetがcurrentTargetの子孫要素の場合、状態をリセットしない（子要素dragleave対策）', () => {
      const c = useDragQuarter();
      const target = document.createElement('div');
      const child = document.createElement('span');
      target.appendChild(child);
      document.body.appendChild(target);
      mockRect(target, { top: 0, left: 0, width: 100, height: 100 });

      fireDragOver(target, c, 80, 20);
      expect(c.isDragOver.value).toBe(true);
      expect(c.dragQuarter.value).toEqual({ isRight: true, isTop: true });

      // relatedTarget が target の子孫 → リセットしない
      fireDragLeave(target, c, child);

      expect(c.isDragOver.value).toBe(true);
      expect(c.dragQuarter.value).toEqual({ isRight: true, isTop: true });
    });
  });

  // ===== useDragQuarter#getDropPos =====

  describe('getDropPos', () => {
    // [covers:getdroppos.returns_current_dragquarter_when_set]
    it('dragQuarterが設定済みの場合、その値を返す', () => {
      const c = useDragQuarter();
      const target = document.createElement('div');
      document.body.appendChild(target);
      mockRect(target, { top: 0, left: 0, width: 100, height: 100 });

      // clientX=20(左), clientY=80(下) → bottom-left
      fireDragOver(target, c, 20, 80);

      expect(c.getDropPos()).toEqual({ isRight: false, isTop: false });
    });

    // [covers:getdroppos.defaults_to_top_right_when_null]
    it('dragQuarterがnullの場合、デフォルト{isRight:true,isTop:true}(top-right)を返す', () => {
      const c = useDragQuarter();
      // 初期状態では dragQuarter は null
      expect(c.getDropPos()).toEqual({ isRight: true, isTop: true });
    });

    it('reset後もgetDropPosはtop-right既定値を返す', () => {
      const c = useDragQuarter();
      const target = document.createElement('div');
      document.body.appendChild(target);
      mockRect(target, { top: 0, left: 0, width: 100, height: 100 });

      fireDragOver(target, c, 20, 80);
      c.reset();

      expect(c.getDropPos()).toEqual({ isRight: true, isTop: true });
    });
  });

  // ===== useDragQuarter#reset =====

  describe('reset', () => {
    // [covers:reset.clears_state]
    it('状態設定後にresetを呼ぶとisDragOver=false, dragQuarter=nullになる', () => {
      const c = useDragQuarter();
      const target = document.createElement('div');
      document.body.appendChild(target);
      mockRect(target, { top: 0, left: 0, width: 100, height: 100 });

      fireDragOver(target, c, 80, 20);
      expect(c.isDragOver.value).toBe(true);
      expect(c.dragQuarter.value).toEqual({ isRight: true, isTop: true });

      c.reset();

      expect(c.isDragOver.value).toBe(false);
      expect(c.dragQuarter.value).toBeNull();
    });

    it('初期状態でresetを呼んでも問題なくfalse/nullになる（冪等性）', () => {
      const c = useDragQuarter();
      c.reset();
      expect(c.isDragOver.value).toBe(false);
      expect(c.dragQuarter.value).toBeNull();
    });
  });
});
