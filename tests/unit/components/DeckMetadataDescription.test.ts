/**
 * components/DeckMetadataDescription のユニットテスト
 *
 * tests/design/deck-metadata-description/conditions.toml（TASK-556 × TASK-331 Tier C第11号）の
 * 5条件をカバーする（1条件1it／同種入力の列挙はfixture表でit.each集約）。
 * unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - DeckMetadataDescriptionを直接mount（store非依存・modelValue propのみの制御コンポーネント）
 * - DECK_FIELD_LIMITS（src/types/deck）は実物を用いる（mockしない）。期待値文字列も
 *   定数から組み立ててUI反映（文字数カウント・maxlength属性）を検証する
 * - v-modelの実体はcomputed get/set（get=props.modelValue・set=emit）のため制御コンポーネント
 *   である。入力時はemitペイロードを検証し、表示の変化は親がpropを更新した場合のみ
 *   （条件4でsetProps経由で）検証する。vm内部状態（computed value）は直接参照しない
 */
import { describe, it, expect } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import DeckMetadataDescription from '@/components/DeckMetadataDescription.vue';
import { DECK_FIELD_LIMITS } from '@/types/deck';
import { isHTMLTextAreaElement } from '@/utils/type-guards';

const COMMENT_MAX = DECK_FIELD_LIMITS.COMMENT_MAX;

function mountDescription(modelValue: string): VueWrapper {
  return mount(DeckMetadataDescription, { props: { modelValue } });
}

/** .metadata-textareaのDOM要素を型ガード経由で取得する（asキャスト不使用） */
function findTextarea(wrapper: VueWrapper): HTMLTextAreaElement {
  const element = wrapper.find('textarea.metadata-textarea').element;
  if (!isHTMLTextAreaElement(element)) {
    throw new Error('textarea.metadata-textarea が見つからないか textarea 要素ではありません');
  }
  return element;
}

describe('components/DeckMetadataDescription', () => {
  // --- 初期表示（computed get） ---

  it.each([[''], ['サイバース族の速攻デッキ'], ['1行目\n2行目\n3行目']])(
    '[covers:deck-metadata-description.textarea-displays-model-value-initially] modelValue（%s 相当）を初期表示する',
    (modelValue: string) => {
      const wrapper = mountDescription(modelValue);

      expect(findTextarea(wrapper).value).toBe(modelValue);
    },
  );

  // --- 文字数カウント表示 ---

  it.each([[''], ['あいうえお'], ['Deck Description']])(
    '[covers:deck-metadata-description.char-count-displays-length-over-comment-max] 文字数カウントは ${modelValue.length}/${COMMENT_MAX} 形式で表示する（modelValue=%s）',
    (modelValue: string) => {
      const wrapper = mountDescription(modelValue);

      // 期待値も実物のDECK_FIELD_LIMITS.COMMENT_MAXから組み立てる（2000は別条件でpin）
      expect(wrapper.find('.char-count').text()).toBe(`${modelValue.length}/${COMMENT_MAX}`);
    },
  );

  // --- 入力時のemit（computed set） ---

  it('[covers:deck-metadata-description.textarea-input-emits-update-model-value] 入力1回ごとにupdate:modelValueを入力全文payloadで1回emitする', async () => {
    const wrapper = mountDescription('旧テキスト');
    const textarea = wrapper.find('textarea.metadata-textarea');

    await textarea.setValue('入力した全文');
    await textarea.setValue('入力した全文（追記）');

    // 各inputイベントでちょうど1回・その時点の入力文字列全体をpayloadとしてemit
    // （ローカル状態を持たないため表示の追従は親のprop更新待ち＝emitペイロードを検証。
    //   wrapper.emitted()にはrootへbubbledしたDOMイベントinput/changeも混入するため
    //   update:modelValueの記録のみを観測する）
    expect(wrapper.emitted('update:modelValue')).toEqual([
      ['入力した全文'],
      ['入力した全文（追記）'],
    ]);
  });

  // --- 親によるprop更新の表示反映 ---

  it('[covers:deck-metadata-description.model-value-prop-update-reflects-display] 親のmodelValue更新がtextarea値と文字数カウントへ反映される', async () => {
    const wrapper = mountDescription('初期値');

    const updated = '親が更新した説明文';
    await wrapper.setProps({ modelValue: updated });

    expect(findTextarea(wrapper).value).toBe(updated);
    expect(wrapper.find('.char-count').text()).toBe(`${updated.length}/${COMMENT_MAX}`);
  });

  // --- maxlength属性 ---

  it('[covers:deck-metadata-description.textarea-maxlength-attribute-equals-comment-max] textareaのmaxlength属性はCOMMENT_MAXに等しい', () => {
    // COMMENT_MAXはDECK_FIELD_LIMITS.COMMENT_MAX＝公式サイト仕様の2000（src/types/deck.ts）
    expect(COMMENT_MAX).toBe(2000);

    const wrapper = mountDescription('');

    expect(wrapper.find('textarea.metadata-textarea').attributes('maxlength')).toBe(String(COMMENT_MAX));
  });
});
