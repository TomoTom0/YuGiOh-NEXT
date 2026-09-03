/**
 * ユニットテスト: ConfirmDialog.vue
 *
 * TASK-436: 「保存して続ける」ボタン押下後、非同期処理(onClick)が完了するまで
 * ローディング表示を出し、他のボタンを無効化することを確認する。
 * fire-and-forget（onClickの戻り値がvoid）なボタンは従来通りローディングを出さない。
 */
import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('ConfirmDialog.vue', () => {
  it('onClickが非同期(Promiseを返す)場合、完了するまでスピナー表示+全ボタン無効化する', async () => {
    const { promise, resolve } = deferred();
    const asyncOnClick = vi.fn(() => promise);
    const otherOnClick = vi.fn();

    const wrapper = mount(ConfirmDialog, {
      props: {
        show: true,
        title: 'title',
        message: 'message',
        buttons: [
          { label: 'Cancel', class: 'secondary', onClick: otherOnClick },
          { label: 'Save and continue', class: 'primary', onClick: asyncOnClick }
        ]
      },
      global: { stubs: { Teleport: true } }
    });

    await wrapper.findAll('button.btn')[1]!.trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(asyncOnClick).toHaveBeenCalledTimes(1);
    // ローディング中: 押したボタンにスピナー、全ボタンdisabled
    let currentButtons = wrapper.findAll('button.btn');
    expect(currentButtons[0]!.attributes('disabled')).toBeDefined();
    expect(currentButtons[1]!.attributes('disabled')).toBeDefined();
    expect(wrapper.find('.btn-spinner').exists()).toBe(true);
    expect(currentButtons[1]!.text()).toBe('');

    // 処理中に他ボタンを押しても無視される
    await currentButtons[0]!.trigger('click');
    expect(otherOnClick).not.toHaveBeenCalled();

    // 完了後: スピナー消え、ボタン有効化
    resolve();
    await flushPromises();
    await wrapper.vm.$nextTick();

    currentButtons = wrapper.findAll('button.btn');
    expect(wrapper.find('.btn-spinner').exists()).toBe(false);
    expect(currentButtons[1]!.attributes('disabled')).toBeUndefined();
    expect(currentButtons[1]!.text()).toBe('Save and continue');
  });

  it('onClickが同期(void)の場合、ローディング表示は出ない', async () => {
    const syncOnClick = vi.fn();

    const wrapper = mount(ConfirmDialog, {
      props: {
        show: true,
        title: 'title',
        message: 'message',
        buttons: [{ label: 'OK', class: 'primary', onClick: syncOnClick }]
      },
      global: { stubs: { Teleport: true } }
    });

    await wrapper.find('button.btn').trigger('click');
    await flushPromises();

    expect(syncOnClick).toHaveBeenCalledTimes(1);
    expect(wrapper.find('.btn-spinner').exists()).toBe(false);
    expect(wrapper.find('button.btn').attributes('disabled')).toBeUndefined();
  });
});
