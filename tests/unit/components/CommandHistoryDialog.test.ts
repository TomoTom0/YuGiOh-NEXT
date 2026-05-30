/**
 * CommandHistoryDialog.vue のユニットテスト
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import CommandHistoryDialog from '@/components/CommandHistoryDialog.vue';
import BaseDialog from '@/components/BaseDialog.vue';
import type { Command } from '@/composables/deck/useDeckUndoRedo';

describe('CommandHistoryDialog', () => {
  const createCommand = (
    desc: string,
    type: 'add' | 'remove' | 'move' | 'reorder',
    timestamp?: number
  ): Command => ({
    execute: () => {},
    undo: () => {},
    description: desc,
    type,
    timestamp: timestamp ?? Date.now()
  });

  // BaseDialog は defineComponent ベースのため、グローバル登録が必要
  const defaultMountOptions = {
    global: {
      components: { BaseDialog }
    }
  };

  afterEach(() => {
    // Teleport で body に描画された要素をクリーンアップ
    document.body.querySelectorAll('.base-dialog-overlay').forEach(el => {
      el.remove();
    });
  });

  describe('表示/非表示', () => {
    it('visible=false の場合、ダイアログが表示されない', () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: false, history: [], currentIndex: -1 }
      });
      expect(document.body.querySelector('.base-dialog-overlay')).toBe(null);
    });

    it('visible=true の場合、ダイアログが表示される', () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: [], currentIndex: -1 }
      });
      expect(document.body.querySelector('.base-dialog-overlay')).not.toBe(null);
    });
  });

  describe('履歴が空の場合', () => {
    it('「操作履歴がありません」メッセージが表示される', () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: [], currentIndex: -1 }
      });
      expect(document.body.querySelector('.no-history')).not.toBe(null);
    });

    it('クリアボタンが無効化される', () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: [], currentIndex: -1 }
      });
      const clearBtn = document.body.querySelector('.btn-clear') as HTMLButtonElement;
      expect(clearBtn.disabled).toBe(true);
    });
  });

  describe('履歴の表示', () => {
    const commands: Command[] = [
      createCommand('Blue-Eyes -> Main', 'add', 1710000000000),
      createCommand('Move: Main -> Side', 'move', 1710000060000),
      createCommand('Reorder: Main', 'reorder', 1710000120000)
    ];

    it('履歴項目が正しい数だけ表示される', () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: commands, currentIndex: 2 }
      });
      expect(document.body.querySelectorAll('.history-item').length).toBe(3);
    });

    it('description が表示される', () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: commands, currentIndex: 2 }
      });
      const descriptions = document.body.querySelectorAll('.history-description');
      expect(descriptions[0].textContent).toBe('Blue-Eyes -> Main');
    });

    it('currentIndex の項目に current クラスが付く', () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: commands, currentIndex: 1 }
      });
      const items = document.body.querySelectorAll('.history-item');
      expect(items[1].classList.contains('current')).toBe(true);
      expect(items[0].classList.contains('current')).toBe(false);
    });

    it('currentIndex より後の項目に undone クラスが付く', () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: commands, currentIndex: 0 }
      });
      const items = document.body.querySelectorAll('.history-item');
      expect(items[1].classList.contains('undone')).toBe(true);
      expect(items[2].classList.contains('undone')).toBe(true);
      expect(items[0].classList.contains('undone')).toBe(false);
    });

    it('CommandType に応じたCSSクラスが適用される', () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: commands, currentIndex: 2 }
      });
      const items = document.body.querySelectorAll('.history-item');
      expect(items[0].classList.contains('type-add')).toBe(true);
      expect(items[1].classList.contains('type-move')).toBe(true);
      expect(items[2].classList.contains('type-reorder')).toBe(true);
    });
  });

  describe('emit イベント', () => {
    const commands: Command[] = [
      createCommand('Cmd A', 'add'),
      createCommand('Cmd B', 'remove')
    ];

    it('閉じるボタンで close イベントが発火する', async () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: commands, currentIndex: 1 }
      });
      const closeBtn = document.body.querySelector('.close-btn') as HTMLElement;
      closeBtn.click();
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('履歴項目クリックで jump-to イベントが発火する', async () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: commands, currentIndex: 1 }
      });
      const items = document.body.querySelectorAll('.history-item');
      items[0].click();
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('jump-to')).toHaveLength(1);
      expect(wrapper.emitted('jump-to')![0]).toEqual([0]);
    });

    it('クリアボタンで clear-history イベントが発火する', async () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: commands, currentIndex: 1 }
      });
      const clearBtn = document.body.querySelector('.btn-clear') as HTMLElement;
      clearBtn.click();
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('clear-history')).toHaveLength(1);
    });

    it('オーバーレイクリックで close イベントが発火する', async () => {
      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: commands, currentIndex: 1 }
      });
      // Teleport で body に描画されているため、document.body から取得
      const overlay = document.body.querySelector('.base-dialog-overlay') as HTMLElement;
      overlay.click();
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  describe('タイムスタンプフォーマット', () => {
    it('HH:MM:SS 形式で表示される', () => {
      // 2024-03-10T12:30:45 (local time)
      const timestamp = new Date(2024, 2, 10, 12, 30, 45).getTime();
      const commands: Command[] = [
        createCommand('Test', 'add', timestamp)
      ];

      const wrapper = mount(CommandHistoryDialog, {
        ...defaultMountOptions,
        props: { visible: true, history: commands, currentIndex: 0 }
      });

      const timeEl = document.body.querySelector('.history-time');
      expect(timeEl?.textContent).toBe('12:30:45');
    });
  });
});
