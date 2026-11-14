/**
 * components/DeckMetadata のユニットテスト
 *
 * tests/design/deck-metadata/conditions.toml（TASK-532 × TASK-331 Tier C第7号）の
 * 28条件をカバーする（1条件1it）。旧7it（html長assertのみの実装非検証テスト）は
 * 本書の全面展開に伴い廃止。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - DeckMetadataを直接mount + pinia実物（SearchFilterDialog/FilterTabテストと同一手法）
 * - 子コンポーネント5種（DeckMetadataHeader/TagDialog/CategoryDialog/
 *   DeckMetadataTags/DeckMetadataDescription）はカスタムstub: 受け取ったpropsを
 *   data属性へ描画し、操作ボタンで親がlistenするイベントを発火する。
 *   子の内部挙動は各子の条件書（category-dialog既存・他は第8号以降）が保証
 * - 外部I/Oはmodule mockで置き換える: @/utils/deck-metadata-loader（メタデータ取得）・
 *   @/utils/language-detector（言語検出）・@/utils/unified-cache-db（カード情報）。
 *   card-utils/filterValid系/isDeckTypeValue等の純関数は実物
 * - UI操作はDOMイベント経由で検証する（vm内部状態の直接参照はしない）。
 *   storeの公開状態（deckInfo/categoryLabelMap）はFilterTabテストと同様に直接観測。
 *   また配列の参照非共有（コピー）検証のみ、子コンポーネントの公開propsを
 *   findComponent経由で観測する（SearchFilterDialogテストのfindComponent emitと
 *   同水準の公開契約観測）
 * - wrapperのunmountはafterEachに一元化（mountDeckMetadataが管理帳簿へ登録し、
 *   assert失敗時も必ず全wrapperをunmountする。watcher残留防止）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, DOMWrapper, VueWrapper } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import DeckMetadata from '@/components/DeckMetadata.vue';
import { useDeckEditStore } from '@/stores/deck-edit';
import type { DeckCardRef } from '@/types/card';
import type { DeckMetadata as DeckMetadataShape } from '@/utils/deck-metadata-loader';

// ============================================================
// module mock（外部I/Oの置き換え）
// ============================================================

// deck-metadata-loader。DeckMetadata.vueが使う3関数のみ差し替える
// （deck-edit storeのdynamic importは initializeOnPageLoad 経由でのみ、
//  本テストでは呼ばれないため他のexportは不要）
const loaderMocks = vi.hoisted(() => ({
  getDeckMetadata: vi.fn(),
  updateDeckMetadata: vi.fn(),
  isDeckMetadataStale: vi.fn(),
}));
vi.mock('@/utils/deck-metadata-loader', () => ({
  getDeckMetadata: loaderMocks.getDeckMetadata,
  updateDeckMetadata: loaderMocks.updateDeckMetadata,
  isDeckMetadataStale: loaderMocks.isDeckMetadataStale,
}));

// language-detector（DeckMetadata.vueとdeck-edit storeの双方がimportする）
const langMocks = vi.hoisted(() => ({ detectLanguage: vi.fn() }));
vi.mock('@/utils/language-detector', () => ({ detectLanguage: langMocks.detectLanguage }));

// unified-cache-db。getCardInfoFromUnifiedDB（card-utils実物）内の
// reconstructCardInfoのみ検証対象（SearchFilterDialogテストと同一手法）
const cacheMocks = vi.hoisted(() => ({
  getUnifiedCacheDB: vi.fn(),
  reconstructCardInfo: vi.fn(),
}));
vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: cacheMocks.getUnifiedCacheDB,
}));

// ============================================================
// 子コンポーネントstub（propsをdata属性へ描画し、操作ボタンでemit）
// ============================================================

const DeckMetadataHeaderStub = defineComponent({
  name: 'DeckMetadataHeader',
  props: ['isPublic', 'deckType', 'deckStyle'],
  emits: [
    'toggle-public',
    'select-deck-type',
    'select-deck-style',
    'show-tag-dialog',
    'show-category-dialog'
  ],
  template: `
    <div class="header-stub"
      :data-is-public="isPublic === undefined ? 'unset' : String(isPublic)"
      :data-deck-type="deckType === undefined ? 'unset' : deckType"
      :data-deck-style="deckStyle === undefined ? 'unset' : deckStyle">
      <button data-emit="toggle-public" @click="$emit('toggle-public')">toggle-public</button>
      <button data-emit="select-deck-type" data-arg="1" @click="$emit('select-deck-type', '1')">type-1</button>
      <button data-emit="select-deck-type" data-arg="9" @click="$emit('select-deck-type', '9')">type-9</button>
      <button data-emit="select-deck-style" data-arg="2" @click="$emit('select-deck-style', '2')">style-2</button>
      <button data-emit="select-deck-style" data-arg="9" @click="$emit('select-deck-style', '9')">style-9</button>
      <button data-emit="show-tag-dialog" @click="$emit('show-tag-dialog')">show-tag-dialog</button>
      <button data-emit="show-category-dialog" @click="$emit('show-category-dialog')">show-category-dialog</button>
    </div>
  `
});

const TagDialogStub = defineComponent({
  name: 'TagDialog',
  props: ['modelValue', 'isVisible', 'tags', 'deckCards'],
  emits: ['update:modelValue', 'close'],
  template: `
    <div class="tag-dialog-stub"
      :data-model-value="(modelValue ?? []).join(',')"
      :data-is-visible="isVisible === undefined ? 'unset' : String(isVisible)"
      :data-tags="(tags ?? []).map(t => t.value + '=' + t.label).join(',')"
      :data-deck-cards="(deckCards ?? []).map(c => c.cardId).join(',')">
      <button data-emit="update-model-value" @click="$emit('update:modelValue', ['108'])">update</button>
      <button data-emit="close" @click="$emit('close')">close</button>
    </div>
  `
});

const CategoryDialogStub = defineComponent({
  name: 'CategoryDialog',
  props: ['modelValue', 'isVisible', 'categories', 'deckCards', 'deckCardRefs'],
  emits: ['update:modelValue', 'close'],
  template: `
    <div class="category-dialog-stub"
      :data-model-value="(modelValue ?? []).join(',')"
      :data-is-visible="isVisible === undefined ? 'unset' : String(isVisible)"
      :data-categories="(categories ?? []).map(c => c.value).join(',')"
      :data-deck-cards="(deckCards ?? []).map(c => c.cardId).join(',')"
      :data-deck-card-refs="(deckCardRefs ?? []).map(r => r.cid).join(',')">
      <button data-emit="update-model-value" @click="$emit('update:modelValue', ['cat-dragon'])">update</button>
      <button data-emit="close" @click="$emit('close')">close</button>
    </div>
  `
});

const DeckMetadataTagsStub = defineComponent({
  name: 'DeckMetadataTags',
  props: ['modelTags', 'modelCategories', 'tags', 'categories'],
  emits: ['remove-tag', 'remove-category'],
  template: `
    <div class="metadata-tags-stub"
      :data-model-tags="(modelTags ?? []).join(',')"
      :data-model-categories="(modelCategories ?? []).join(',')"
      :data-tags="Object.keys(tags ?? {}).join(',')"
      :data-categories="(categories ?? []).map(c => c.value).join(',')">
      <button data-emit="remove-tag" data-arg="8" @click="$emit('remove-tag', '8')">remove-tag-8</button>
      <button data-emit="remove-tag" data-arg="tag-unknown" @click="$emit('remove-tag', 'tag-unknown')">remove-tag-unknown</button>
      <button data-emit="remove-category" data-arg="cat-dragon" @click="$emit('remove-category', 'cat-dragon')">remove-category-dragon</button>
      <button data-emit="remove-category" data-arg="cat-unknown" @click="$emit('remove-category', 'cat-unknown')">remove-category-unknown</button>
    </div>
  `
});

const DeckMetadataDescriptionStub = defineComponent({
  name: 'DeckMetadataDescription',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `
    <div class="description-stub" :data-model-value="modelValue ?? ''">
      <button data-emit="update-model-value" @click="$emit('update:modelValue', '入力テキスト')">update</button>
    </div>
  `
});

// ============================================================
// fixture
// ============================================================

function deckCardRef(cid: string): DeckCardRef {
  return { cid, ciid: `ciid-${cid}`, lang: 'ja', quantity: 1 };
}

/** ja既定メタデータ（カテゴリ2・タグ2。フィルタ・ラベル検証に十分な構成） */
function jaMetadata(): DeckMetadataShape {
  return {
    deckTypes: [{ value: '0', label: 'OCG（マスタールール）' }],
    deckStyles: [{ value: '0', label: 'キャラクター' }],
    categories: [
      { value: 'cat-kaos', label: 'カオス', originalIndex: 0, group: ['ruby_カ'] },
      { value: 'cat-dragon', label: 'ドラゴン', originalIndex: 1, group: ['ruby_タ'] }
    ],
    tags: { '8': 'リンク', '108': '公式紹介デッキ' },
    lastUpdated: '2026-11-01T00:00:00Z'
  };
}

/** enローカライズ版（カテゴリ1・タグ1。ja版との差分検出用） */
function enMetadata(): DeckMetadataShape {
  return {
    deckTypes: [{ value: '0', label: 'OCG (Master Rule)' }],
    deckStyles: [{ value: '0', label: 'Character' }],
    categories: [
      { value: 'cat-kaos', label: 'Chaos', originalIndex: 0, group: ['ruby_カ'] }
    ],
    tags: { '8': 'Link' },
    lastUpdated: '2026-11-01T00:00:00Z'
  };
}

/** categories/tagsとも空（未ロード相当のフィルタースキップ検証用） */
function emptyMetadata(): DeckMetadataShape {
  return {
    deckTypes: [],
    deckStyles: [],
    categories: [],
    tags: {},
    lastUpdated: '2026-11-01T00:00:00Z'
  };
}

// ============================================================
// 要素取得ヘルパー（存在assert必須・取得失敗時は即fail）
// ============================================================

/** stubルート要素を取得する。存在しない場合はその場でfailする */
function requireStub(wrapper: VueWrapper, selector: string): DOMWrapper<Element> {
  const found = wrapper.find(selector);
  expect(found.exists()).toBe(true);
  if (!found.exists()) {
    throw new Error(`[DeckMetadata.test] stub not found: ${selector}`);
  }
  return found;
}

/** stub内のイベント発火ボタンをdata-emit（+data-arg）で取得する。無い場合はfailする */
function requireStubButton(wrapper: VueWrapper, event: string, arg?: string): DOMWrapper<Element> {
  const found = wrapper
    .findAll(`button[data-emit="${event}"]`)
    .find(btn => (arg === undefined ? true : btn.attributes('data-arg') === arg));
  expect(found).toBeDefined();
  if (found === undefined) {
    throw new Error(`[DeckMetadata.test] stub button not found: event=${event} arg=${arg ?? '(none)'}`);
  }
  return found;
}

// ============================================================
// 共通setup
// ============================================================

let pinia: ReturnType<typeof createPinia>;
let deckStore: ReturnType<typeof useDeckEditStore>;
const mountedWrappers: VueWrapper[] = [];

/** DeckMetadataをmountする（子5種をカスタムstubで差し替え）。wrapperは管理帳簿へ登録 */
function mountDeckMetadata(): VueWrapper {
  const wrapper = mount(DeckMetadata, {
    global: {
      plugins: [pinia],
      stubs: {
        DeckMetadataHeader: DeckMetadataHeaderStub,
        TagDialog: TagDialogStub,
        CategoryDialog: CategoryDialogStub,
        DeckMetadataTags: DeckMetadataTagsStub,
        DeckMetadataDescription: DeckMetadataDescriptionStub
      }
    }
  });
  mountedWrappers.push(wrapper);
  return wrapper;
}

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  vi.clearAllMocks();
  deckStore = useDeckEditStore();

  // 既定挙動: ja言語・jaメタデータのロード成功・キャッシュはカード不在
  langMocks.detectLanguage.mockReturnValue('ja');
  loaderMocks.getDeckMetadata.mockResolvedValue(jaMetadata());
  loaderMocks.isDeckMetadataStale.mockResolvedValue(false);
  loaderMocks.updateDeckMetadata.mockResolvedValue(enMetadata());
  cacheMocks.getUnifiedCacheDB.mockImplementation(() => ({
    reconstructCardInfo: cacheMocks.reconstructCardInfo
  }));
  cacheMocks.reconstructCardInfo.mockImplementation(() => undefined);
});

afterEach(() => {
  // it内のassert失敗に関わらず必ず全wrapperをunmountする（watcher残留防止）
  for (const wrapper of mountedWrappers) {
    wrapper.unmount();
  }
  mountedWrappers.length = 0;
  vi.restoreAllMocks();
});

describe('components/DeckMetadata', () => {
  describe('初期配線（template・子propsへの反映）', () => {
    it('[covers:deck-metadata.header-props-initialized-from-store-with-defaults] headerの3値はstoreから初期化し未設定時はデフォルトへフォールバック', async () => {
      // 未設定: ?? のデフォルト（false/'-1'/'-1'）が渡る（undefined='unset'ではない）
      const wrapperUnset = mountDeckMetadata();
      const headerUnset = requireStub(wrapperUnset, '.header-stub');
      expect(headerUnset.attributes('data-is-public')).toBe('false');
      expect(headerUnset.attributes('data-deck-type')).toBe('-1');
      expect(headerUnset.attributes('data-deck-style')).toBe('-1');

      // 設定済み: store値がそのまま渡る
      deckStore.deckInfo.isPublic = true;
      deckStore.deckInfo.deckType = '3';
      deckStore.deckInfo.deckStyle = '1';
      const wrapperSet = mountDeckMetadata();
      const headerSet = requireStub(wrapperSet, '.header-stub');
      expect(headerSet.attributes('data-is-public')).toBe('true');
      expect(headerSet.attributes('data-deck-type')).toBe('3');
      expect(headerSet.attributes('data-deck-style')).toBe('1');
    });

    it('[covers:deck-metadata.model-values-initialized-as-store-copies] タグ/カテゴリ/コメントの初期値はstoreの該当フィールドから供給される', () => {
      deckStore.deckInfo.tags = ['8'];
      deckStore.deckInfo.category = ['cat-kaos'];
      deckStore.deckInfo.comment = '初コメント';
      const wrapper = mountDeckMetadata();

      expect(requireStub(wrapper, '.tag-dialog-stub').attributes('data-model-value')).toBe('8');
      expect(requireStub(wrapper, '.category-dialog-stub').attributes('data-model-value')).toBe('cat-kaos');
      const tagsStub = requireStub(wrapper, '.metadata-tags-stub');
      expect(tagsStub.attributes('data-model-tags')).toBe('8');
      expect(tagsStub.attributes('data-model-categories')).toBe('cat-kaos');
      expect(requireStub(wrapper, '.description-stub').attributes('data-model-value')).toBe('初コメント');

      // 参照非共有: 子が受領する配列はstore配列と同一内容だが別参照（コピー）。
      // 公開propsの観測のみfindComponentを使用（SearchFilterDialogテストの
      // findComponent emitと同水準の公開契約観測）
      const tagDialogModel = wrapper.findComponent({ name: 'TagDialog' }).props('modelValue');
      expect(tagDialogModel).not.toBe(deckStore.deckInfo.tags);
      expect(tagDialogModel).toEqual(deckStore.deckInfo.tags);
      const categoryDialogModel = wrapper.findComponent({ name: 'CategoryDialog' }).props('modelValue');
      expect(categoryDialogModel).not.toBe(deckStore.deckInfo.category);
      expect(categoryDialogModel).toEqual(deckStore.deckInfo.category);
      const metadataTagsStub = wrapper.findComponent({ name: 'DeckMetadataTags' });
      expect(metadataTagsStub.props('modelTags')).not.toBe(deckStore.deckInfo.tags);
      expect(metadataTagsStub.props('modelTags')).toEqual(deckStore.deckInfo.tags);
      expect(metadataTagsStub.props('modelCategories')).not.toBe(deckStore.deckInfo.category);
      expect(metadataTagsStub.props('modelCategories')).toEqual(deckStore.deckInfo.category);
    });

    it('[covers:deck-metadata.tag-list-derived-from-loaded-tag-map] tagListはロードしたタグRecordをvalue=label配列へ変換する', async () => {
      const wrapper = mountDeckMetadata();
      await flushPromises();

      // {'8':'リンク','108':'公式紹介デッキ'} → value=label 形式の配列
      expect(requireStub(wrapper, '.tag-dialog-stub').attributes('data-tags'))
        .toBe('8=リンク,108=公式紹介デッキ');
    });

    it('[covers:deck-metadata.deck-card-refs-concatenate-all-deck-sections] deckCardRefsはmain→extra→sideの連結順', () => {
      deckStore.deckInfo.mainDeck = [deckCardRef('m1'), deckCardRef('m2')];
      deckStore.deckInfo.extraDeck = [deckCardRef('e1')];
      deckStore.deckInfo.sideDeck = [deckCardRef('s1')];
      const wrapper = mountDeckMetadata();

      expect(requireStub(wrapper, '.category-dialog-stub').attributes('data-deck-card-refs'))
        .toBe('m1,m2,e1,s1');
    });

    it('[covers:deck-metadata.deck-cards-dedupe-cids-and-skip-missing-cards] deckCardsは重複cidを除去し不在カードをスキップする', () => {
      deckStore.deckInfo.mainDeck = [deckCardRef('c1'), deckCardRef('c1'), deckCardRef('c2')];
      deckStore.deckInfo.extraDeck = [deckCardRef('c3')];
      // c1/c3はCardInfoを返し、c2はundefined（→ getCardInfoFromUnifiedDBはnull）
      cacheMocks.reconstructCardInfo.mockImplementation((cid: string) =>
        cid === 'c1' || cid === 'c3' ? { cardId: cid, name: `card-${cid}` } : undefined
      );
      const wrapper = mountDeckMetadata();

      // c1の重複は1件にまとまり、c2は収集されない
      expect(requireStub(wrapper, '.tag-dialog-stub').attributes('data-deck-cards')).toBe('c1,c3');
      expect(requireStub(wrapper, '.category-dialog-stub').attributes('data-deck-cards')).toBe('c1,c3');
    });
  });

  describe('onMounted: メタデータロード', () => {
    it('[covers:deck-metadata.mount-loads-metadata-and-builds-category-label-map] mount時に検出言語でメタデータをロードしlabelMapをstoreへ設定', async () => {
      langMocks.detectLanguage.mockReturnValue('ja');
      const wrapper = mountDeckMetadata();
      await flushPromises();

      // 言語検出はdocumentを引数に呼ばれ、検出言語がgetDeckMetadataへ渡る
      expect(langMocks.detectLanguage).toHaveBeenCalledWith(document);
      expect(loaderMocks.getDeckMetadata).toHaveBeenCalledWith('ja');
      const tagsStub = requireStub(wrapper, '.metadata-tags-stub');
      expect(tagsStub.attributes('data-tags')).toBe('8,108');
      expect(tagsStub.attributes('data-categories')).toBe('cat-kaos,cat-dragon');
      // CategoryDialogもロード済みcategoriesを受領する
      expect(requireStub(wrapper, '.category-dialog-stub').attributes('data-categories'))
        .toBe('cat-kaos,cat-dragon');
      expect(deckStore.categoryLabelMap).toEqual({
        'cat-kaos': 'カオス',
        'cat-dragon': 'ドラゴン'
      });
    });

    it('[covers:deck-metadata.mount-non-ja-stale-refreshes-localized-metadata] 非jaでstaleの場合ローカライズ版へ更新する', async () => {
      langMocks.detectLanguage.mockReturnValue('en');
      loaderMocks.isDeckMetadataStale.mockResolvedValue(true);
      const wrapper = mountDeckMetadata();
      await flushPromises();

      expect(loaderMocks.updateDeckMetadata).toHaveBeenCalledWith('ocg', 'en');
      // 初回ロードも検出言語（en）で呼ばれる（実装が'ja'固定だとここで検出）
      expect(langMocks.detectLanguage).toHaveBeenCalledWith(document);
      expect(loaderMocks.getDeckMetadata).toHaveBeenCalledWith('en');
      const tagsStub = requireStub(wrapper, '.metadata-tags-stub');
      expect(tagsStub.attributes('data-tags')).toBe('8');
      expect(tagsStub.attributes('data-categories')).toBe('cat-kaos');
      expect(requireStub(wrapper, '.tag-dialog-stub').attributes('data-tags')).toBe('8=Link');
      // CategoryDialogもローカライズ後のcategoriesを受領する
      expect(requireStub(wrapper, '.category-dialog-stub').attributes('data-categories'))
        .toBe('cat-kaos');
      expect(deckStore.categoryLabelMap).toEqual({ 'cat-kaos': 'Chaos' });
    });

    it('[covers:deck-metadata.mount-ja-never-refreshes-metadata] jaではstale確認も更新も行わない', async () => {
      langMocks.detectLanguage.mockReturnValue('ja');
      const wrapper = mountDeckMetadata();
      await flushPromises();

      expect(loaderMocks.isDeckMetadataStale).not.toHaveBeenCalled();
      expect(loaderMocks.updateDeckMetadata).not.toHaveBeenCalled();
      // categories/tagsはgetDeckMetadataの結果のまま
      expect(requireStub(wrapper, '.metadata-tags-stub').attributes('data-categories'))
        .toBe('cat-kaos,cat-dragon');
    });

    it('[covers:deck-metadata.mount-non-ja-fresh-skips-refresh] 非jaでも新鮮な場合は更新しない', async () => {
      langMocks.detectLanguage.mockReturnValue('en');
      loaderMocks.isDeckMetadataStale.mockResolvedValue(false);
      const wrapper = mountDeckMetadata();
      await flushPromises();

      expect(loaderMocks.isDeckMetadataStale).toHaveBeenCalledWith('en');
      expect(loaderMocks.getDeckMetadata).toHaveBeenCalledWith('en');
      expect(loaderMocks.updateDeckMetadata).not.toHaveBeenCalled();
      // 初期ロード（getDeckMetadata）はjaフォールバック値のまま
      expect(requireStub(wrapper, '.metadata-tags-stub').attributes('data-categories'))
        .toBe('cat-kaos,cat-dragon');
    });

    it('[covers:deck-metadata.mount-refresh-failure-keeps-loaded-metadata] 更新失敗時はconsole.errorを記録しロード済み値を維持する', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      langMocks.detectLanguage.mockReturnValue('en');
      loaderMocks.isDeckMetadataStale.mockResolvedValue(true);
      loaderMocks.updateDeckMetadata.mockRejectedValue(new Error('network error'));
      const wrapper = mountDeckMetadata();
      await flushPromises();

      expect(errorSpy).toHaveBeenCalled();
      // クラッシュせず、categories/tagsは初期ロード（ja版）のまま
      expect(requireStub(wrapper, '.metadata-tags-stub').attributes('data-categories'))
        .toBe('cat-kaos,cat-dragon');
      expect(requireStub(wrapper, '.metadata-tags-stub').attributes('data-tags')).toBe('8,108');
      // TagDialogのラベル付きタグ一覧もjaロード時の内容を維持する
      expect(requireStub(wrapper, '.tag-dialog-stub').attributes('data-tags'))
        .toBe('8=リンク,108=公式紹介デッキ');
      expect(deckStore.categoryLabelMap).toEqual({
        'cat-kaos': 'カオス',
        'cat-dragon': 'ドラゴン'
      });
    });
  });

  describe('store→ローカル同期（watch）', () => {
    it('[covers:deck-metadata.watch-syncs-scalar-fields-with-defaults] storeのスカラー値変更でローカルへ再同期（undefinedはデフォルトへ戻す）', async () => {
      const wrapper = mountDeckMetadata();
      await flushPromises();

      deckStore.deckInfo.isPublic = true;
      deckStore.deckInfo.deckType = '2';
      deckStore.deckInfo.deckStyle = '1';
      deckStore.deckInfo.comment = '更新コメント';
      await nextTick();

      const header = requireStub(wrapper, '.header-stub');
      expect(header.attributes('data-is-public')).toBe('true');
      expect(header.attributes('data-deck-type')).toBe('2');
      expect(header.attributes('data-deck-style')).toBe('1');
      expect(requireStub(wrapper, '.description-stub').attributes('data-model-value')).toBe('更新コメント');

      // undefinedへ戻した場合は??のデフォルトへフォールバック（全スカラー値）
      deckStore.deckInfo.isPublic = undefined;
      deckStore.deckInfo.deckType = undefined;
      deckStore.deckInfo.deckStyle = undefined;
      deckStore.deckInfo.comment = undefined;
      await nextTick();
      const headerReset = requireStub(wrapper, '.header-stub');
      expect(headerReset.attributes('data-is-public')).toBe('false');
      expect(headerReset.attributes('data-deck-type')).toBe('-1');
      expect(headerReset.attributes('data-deck-style')).toBe('-1');
      expect(requireStub(wrapper, '.description-stub').attributes('data-model-value')).toBe('');
    });

    it('[covers:deck-metadata.watch-filters-category-ids-when-categories-loaded] categoriesロード済みなら無効カテゴリIDを除外して同期', async () => {
      const wrapper = mountDeckMetadata();
      await flushPromises();

      deckStore.deckInfo.category = ['cat-kaos', 'cat-unknown'];
      await nextTick();

      expect(requireStub(wrapper, '.metadata-tags-stub').attributes('data-model-categories'))
        .toBe('cat-kaos');
      expect(requireStub(wrapper, '.category-dialog-stub').attributes('data-model-value'))
        .toBe('cat-kaos');
    });

    it('[covers:deck-metadata.watch-filters-tag-ids-when-tags-loaded] tagsロード済みなら無効タグIDを除外して同期', async () => {
      const wrapper = mountDeckMetadata();
      await flushPromises();

      deckStore.deckInfo.tags = ['8', 'tag-unknown'];
      await nextTick();

      expect(requireStub(wrapper, '.metadata-tags-stub').attributes('data-model-tags')).toBe('8');
      expect(requireStub(wrapper, '.tag-dialog-stub').attributes('data-model-value')).toBe('8');
    });

    it('[covers:deck-metadata.watch-keeps-unknown-ids-before-metadata-loaded] categories/tagsが空の状態ではフィルタせずそのまま同期', async () => {
      loaderMocks.getDeckMetadata.mockResolvedValue(emptyMetadata());
      const wrapper = mountDeckMetadata();
      await flushPromises();

      deckStore.deckInfo.category = ['cat-kaos', 'cat-unknown'];
      deckStore.deckInfo.tags = ['8', 'tag-unknown'];
      await nextTick();

      const tagsStub = requireStub(wrapper, '.metadata-tags-stub');
      expect(tagsStub.attributes('data-model-categories')).toBe('cat-kaos,cat-unknown');
      expect(tagsStub.attributes('data-model-tags')).toBe('8,tag-unknown');
    });
  });

  describe('更新関数（子イベント→store書き込み）', () => {
    it('[covers:deck-metadata.toggle-public-inverts-value-and-writes-store] toggle-publicで値を反転してstoreへ書き込む', async () => {
      const wrapper = mountDeckMetadata();
      await flushPromises();

      await requireStubButton(wrapper, 'toggle-public').trigger('click');
      expect(requireStub(wrapper, '.header-stub').attributes('data-is-public')).toBe('true');
      expect(deckStore.deckInfo.isPublic).toBe(true);

      await requireStubButton(wrapper, 'toggle-public').trigger('click');
      expect(requireStub(wrapper, '.header-stub').attributes('data-is-public')).toBe('false');
      expect(deckStore.deckInfo.isPublic).toBe(false);
    });

    it('[covers:deck-metadata.select-deck-type-valid-value-updates-store] 有効なdeckType値ならlocalとstoreを更新する', async () => {
      const wrapper = mountDeckMetadata();
      await flushPromises();

      await requireStubButton(wrapper, 'select-deck-type', '1').trigger('click');

      expect(requireStub(wrapper, '.header-stub').attributes('data-deck-type')).toBe('1');
      expect(deckStore.deckInfo.deckType).toBe('1');
    });

    it('[covers:deck-metadata.select-deck-type-invalid-value-rejected] 無効なdeckType値はconsole.errorで拒否し更新しない', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const wrapper = mountDeckMetadata();
      await flushPromises();

      await requireStubButton(wrapper, 'select-deck-type', '9').trigger('click');

      expect(errorSpy).toHaveBeenCalled();
      expect(requireStub(wrapper, '.header-stub').attributes('data-deck-type')).toBe('-1');
      expect(deckStore.deckInfo.deckType).toBeUndefined();
    });

    it('[covers:deck-metadata.select-deck-style-valid-value-updates-store] 有効なdeckStyle値ならlocalとstoreを更新する', async () => {
      const wrapper = mountDeckMetadata();
      await flushPromises();

      await requireStubButton(wrapper, 'select-deck-style', '2').trigger('click');

      expect(requireStub(wrapper, '.header-stub').attributes('data-deck-style')).toBe('2');
      expect(deckStore.deckInfo.deckStyle).toBe('2');
    });

    it('[covers:deck-metadata.select-deck-style-invalid-value-rejected] 無効なdeckStyle値はconsole.errorで拒否し更新しない', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const wrapper = mountDeckMetadata();
      await flushPromises();

      await requireStubButton(wrapper, 'select-deck-style', '9').trigger('click');

      expect(errorSpy).toHaveBeenCalled();
      expect(requireStub(wrapper, '.header-stub').attributes('data-deck-style')).toBe('-1');
      expect(deckStore.deckInfo.deckStyle).toBeUndefined();
    });

    it('[covers:deck-metadata.comment-vmodel-syncs-local-and-store] Descriptionのupdate:modelValueでlocal（v-model）とstoreの両方を更新', async () => {
      const wrapper = mountDeckMetadata();
      await flushPromises();

      // Description stubのupdateボタン（TagDialog/CategoryDialogと同名data-emitのため
      // .description-stub 配下に限定して取得する）
      await requireStub(wrapper, '.description-stub button[data-emit="update-model-value"]').trigger('click');

      expect(requireStub(wrapper, '.description-stub').attributes('data-model-value')).toBe('入力テキスト');
      expect(deckStore.deckInfo.comment).toBe('入力テキスト');
    });

    it('[covers:deck-metadata.update-categories-writes-store-and-refreshes-matching] CategoryDialogの更新でstoreへ書き込みカテゴリ判定を更新する', async () => {
      const matchingSpy = vi.spyOn(deckStore, 'updateCategoryMatching');
      const wrapper = mountDeckMetadata();
      await flushPromises();

      const updateButton = requireStub(wrapper, '.category-dialog-stub button[data-emit="update-model-value"]');
      await updateButton.trigger('click');

      expect(requireStub(wrapper, '.category-dialog-stub').attributes('data-model-value'))
        .toBe('cat-dragon');
      expect(deckStore.deckInfo.category).toEqual(['cat-dragon']);
      expect(matchingSpy).toHaveBeenCalled();
    });

    it('[covers:deck-metadata.update-tags-writes-store-without-matching-refresh] TagDialogの更新でstoreへ書き込むがカテゴリ判定は更新しない', async () => {
      const matchingSpy = vi.spyOn(deckStore, 'updateCategoryMatching');
      const wrapper = mountDeckMetadata();
      await flushPromises();

      const updateButton = requireStub(wrapper, '.tag-dialog-stub button[data-emit="update-model-value"]');
      await updateButton.trigger('click');

      expect(requireStub(wrapper, '.tag-dialog-stub').attributes('data-model-value')).toBe('108');
      expect(deckStore.deckInfo.tags).toEqual(['108']);
      expect(matchingSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-metadata.remove-category-removes-id-and-refreshes-matching] remove-categoryで該当IDを除去しカテゴリ判定を更新する', async () => {
      const matchingSpy = vi.spyOn(deckStore, 'updateCategoryMatching');
      deckStore.deckInfo.category = ['cat-kaos', 'cat-dragon'];
      const wrapper = mountDeckMetadata();
      await flushPromises();

      await requireStubButton(wrapper, 'remove-category', 'cat-dragon').trigger('click');

      expect(requireStub(wrapper, '.metadata-tags-stub').attributes('data-model-categories'))
        .toBe('cat-kaos');
      expect(deckStore.deckInfo.category).toEqual(['cat-kaos']);
      expect(matchingSpy).toHaveBeenCalled();
    });

    it('[covers:deck-metadata.remove-category-unknown-id-is-noop] 存在しないカテゴリIDのremoveは何もしない', async () => {
      const matchingSpy = vi.spyOn(deckStore, 'updateCategoryMatching');
      deckStore.deckInfo.category = ['cat-kaos'];
      const wrapper = mountDeckMetadata();
      await flushPromises();

      await requireStubButton(wrapper, 'remove-category', 'cat-unknown').trigger('click');

      expect(deckStore.deckInfo.category).toEqual(['cat-kaos']);
      expect(matchingSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-metadata.remove-tag-removes-id-from-store] remove-tagで該当IDをstoreから除去する', async () => {
      deckStore.deckInfo.tags = ['8', '108'];
      const wrapper = mountDeckMetadata();
      await flushPromises();

      await requireStubButton(wrapper, 'remove-tag', '8').trigger('click');

      expect(requireStub(wrapper, '.metadata-tags-stub').attributes('data-model-tags')).toBe('108');
      expect(deckStore.deckInfo.tags).toEqual(['108']);
    });

    it('[covers:deck-metadata.remove-tag-unknown-id-is-noop] 存在しないタグIDのremoveは何もしない', async () => {
      deckStore.deckInfo.tags = ['8'];
      const wrapper = mountDeckMetadata();
      await flushPromises();

      await requireStubButton(wrapper, 'remove-tag', 'tag-unknown').trigger('click');

      expect(deckStore.deckInfo.tags).toEqual(['8']);
    });
  });

  describe('ダイアログ表示状態', () => {
    it('[covers:deck-metadata.tag-dialog-visibility-toggles-on-header-and-close-events] TagDialogの表示はheaderイベントで開きcloseで閉じる（CategoryDialogとは独立）', async () => {
      const wrapper = mountDeckMetadata();
      await flushPromises();
      const tagDialog = requireStub(wrapper, '.tag-dialog-stub');

      expect(tagDialog.attributes('data-is-visible')).toBe('false');

      await requireStubButton(wrapper, 'show-tag-dialog').trigger('click');
      expect(tagDialog.attributes('data-is-visible')).toBe('true');
      // CategoryDialogの表示状態には影響しない
      expect(requireStub(wrapper, '.category-dialog-stub').attributes('data-is-visible')).toBe('false');

      const closeButton = requireStub(wrapper, '.tag-dialog-stub button[data-emit="close"]');
      await closeButton.trigger('click');
      expect(tagDialog.attributes('data-is-visible')).toBe('false');
    });

    it('[covers:deck-metadata.category-dialog-visibility-toggles-on-header-and-close-events] CategoryDialogの表示はheaderイベントで開きcloseで閉じる（TagDialogとは独立）', async () => {
      const wrapper = mountDeckMetadata();
      await flushPromises();
      const categoryDialog = requireStub(wrapper, '.category-dialog-stub');

      expect(categoryDialog.attributes('data-is-visible')).toBe('false');

      await requireStubButton(wrapper, 'show-category-dialog').trigger('click');
      expect(categoryDialog.attributes('data-is-visible')).toBe('true');
      // TagDialogの表示状態には影響しない
      expect(requireStub(wrapper, '.tag-dialog-stub').attributes('data-is-visible')).toBe('false');

      const closeButton = requireStub(wrapper, '.category-dialog-stub button[data-emit="close"]');
      await closeButton.trigger('click');
      expect(categoryDialog.attributes('data-is-visible')).toBe('false');
    });
  });
});
