/**
 * CommandHistoryDialog.vue のユニットテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import CommandHistoryDialog from '@/components/CommandHistoryDialog.vue';
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

  describe('表示/非表示', () => {
    it('visible=false の場合、ダイアログが表示されない', () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: false, history: [], currentIndex: -1 }
      });
      expect(wrapper.find('.dialog-overlay').exists()).toBe(false);
    });

    it('visible=true の場合、ダイアログが表示される', () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: true, history: [], currentIndex: -1 }
      });
      expect(wrapper.find('.dialog-overlay').exists()).toBe(true);
    });
  });

  describe('履歴が空の場合', () => {
    it('「操作履歴がありません」メッセージが表示される', () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: true, history: [], currentIndex: -1 }
      });
      expect(wrapper.find('.no-history').exists()).toBe(true);
    });

    it('クリアボタンが無効化される', () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: true, history: [], currentIndex: -1 }
      });
      const clearBtn = wrapper.find('.btn-clear');
      expect(clearBtn.attributes('disabled')).toBeDefined();
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
        props: { visible: true, history: commands, currentIndex: 2 }
      });
      expect(wrapper.findAll('.history-item').length).toBe(3);
    });

    it('description が表示される', () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: true, history: commands, currentIndex: 2 }
      });
      const descriptions = wrapper.findAll('.history-description');
      expect(descriptions[0].text()).toBe('Blue-Eyes -> Main');
    });

    it('currentIndex の項目に current クラスが付く', () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: true, history: commands, currentIndex: 1 }
      });
      const items = wrapper.findAll('.history-item');
      expect(items[1].classes()).toContain('current');
      expect(items[0].classes()).not.toContain('current');
    });

    it('currentIndex より後の項目に undone クラスが付く', () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: true, history: commands, currentIndex: 0 }
      });
      const items = wrapper.findAll('.history-item');
      expect(items[1].classes()).toContain('undone');
      expect(items[2].classes()).toContain('undone');
      expect(items[0].classes()).not.toContain('undone');
    });

    it('CommandType に応じたCSSクラスが適用される', () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: true, history: commands, currentIndex: 2 }
      });
      const items = wrapper.findAll('.history-item');
      expect(items[0].classes()).toContain('type-add');
      expect(items[1].classes()).toContain('type-move');
      expect(items[2].classes()).toContain('type-reorder');
    });
  });

  describe('emit イベント', () => {
    const commands: Command[] = [
      createCommand('Cmd A', 'add'),
      createCommand('Cmd B', 'remove')
    ];

    it('閉じるボタンで close イベントが発火する', async () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: true, history: commands, currentIndex: 1 }
      });
      await wrapper.find('.close-btn').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('履歴項目クリックで jump-to イベントが発火する', async () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: true, history: commands, currentIndex: 1 }
      });
      await wrapper.findAll('.history-item')[0].trigger('click');
      expect(wrapper.emitted('jump-to')).toHaveLength(1);
      expect(wrapper.emitted('jump-to')![0]).toEqual([0]);
    });

    it('クリアボタンで clear-history イベントが発火する', async () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: true, history: commands, currentIndex: 1 }
      });
      await wrapper.find('.btn-clear').trigger('click');
      expect(wrapper.emitted('clear-history')).toHaveLength(1);
    });

    it('オーバーレイクリックで close イベントが発火する', async () => {
      const wrapper = mount(CommandHistoryDialog, {
        props: { visible: true, history: commands, currentIndex: 1 }
      });
      await wrapper.find('.dialog-overlay').trigger('click');
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
        props: { visible: true, history: commands, currentIndex: 0 }
      });

      const timeEl = wrapper.find('.history-time');
      expect(timeEl.text()).toBe('12:30:45');
    });
  });
});
