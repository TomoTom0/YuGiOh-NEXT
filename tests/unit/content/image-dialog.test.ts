/**
 * imageDialog.ts のテスト
 *
 * tests/design/image-dialog/conditions.toml (TASK-330) のconditionをカバーする。
 * @/components/ImageDialog.vue自体のUIロジックは対象外とし、propsを記録する
 * スタブコンポーネントに差し替える。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EXTENSION_IDS } from '@/utils/dom-selectors';
import type { DeckInfo } from '@/types/deck';

let lastProps: Record<string, unknown> | null = null;
vi.mock('@/components/ImageDialog.vue', () => ({
  default: {
    name: 'StubImageDialog',
    props: ['cgid', 'dno', 'deckData', 'buttonRect', 'genesysPoints', 'onClose'],
    setup(props: Record<string, unknown>) {
      lastProps = props;
      return () => null;
    }
  }
}));

const mockParseDeckDetail = vi.fn();
vi.mock('@/content/parser/deck-detail-parser', () => ({
  parseDeckDetail: (...args: unknown[]) => mockParseDeckDetail(...args)
}));

import { showImageDialogWithData, showImageDialog } from '@/content/deck-recipe/imageDialog';

const makeDeckInfo = (): DeckInfo => ({
  dno: 1,
  name: 'テストデッキ',
  mainDeck: [],
  extraDeck: [],
  sideDeck: [],
  category: [],
  tags: [],
  comment: '',
  deckCode: ''
});

describe('imageDialog.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    lastProps = null;
    vi.clearAllMocks();
  });

  describe('showImageDialogWithData', () => {
    it('[covers:show_image_dialog_with_data.creates_mount_point_and_mounts] mountPointを作成してマウントする', async () => {
      await showImageDialogWithData('cgid123', '1', makeDeckInfo());

      const mountPoint = document.getElementById('ygo-next-image-dialog-mount');
      expect(mountPoint).not.toBeNull();
      expect(document.body.contains(mountPoint)).toBe(true);
    });

    it('[covers:show_image_dialog_with_data.button_rect_defaults_to_null] buttonRect省略時はnullが渡される', async () => {
      await showImageDialogWithData('cgid123', '1', makeDeckInfo());

      expect(lastProps?.buttonRect).toBeNull();
    });

    it('[covers:show_image_dialog_with_data.unmounts_existing_dialog_first] 2回目の呼び出しで1回目のmountPointが削除される', async () => {
      await showImageDialogWithData('cgid123', '1', makeDeckInfo());
      const firstMountPoint = document.getElementById('ygo-next-image-dialog-mount');
      expect(firstMountPoint).not.toBeNull();

      await showImageDialogWithData('cgid456', '2', makeDeckInfo());

      expect(document.body.contains(firstMountPoint)).toBe(false);
      expect(document.querySelectorAll('#ygo-next-image-dialog-mount').length).toBe(1);
    });

    it('[covers:show_image_dialog_with_data.on_close_unmounts_and_removes_mount_point] onCloseでmountPointが削除される', async () => {
      await showImageDialogWithData('cgid123', '1', makeDeckInfo());
      expect(document.getElementById('ygo-next-image-dialog-mount')).not.toBeNull();

      const onClose = lastProps?.onClose as () => void;
      onClose();

      expect(document.getElementById('ygo-next-image-dialog-mount')).toBeNull();
    });
  });

  describe('showImageDialog', () => {
    function createButton(): HTMLElement {
      const button = document.createElement('button');
      button.id = EXTENSION_IDS.deckImage.deckImageButton;
      document.body.appendChild(button);
      return button;
    }

    it('[covers:show_image_dialog.no_button_logs_error_and_returns] ボタンが無い場合エラーログを出して終了する', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await showImageDialog();

      expect(errorSpy).toHaveBeenCalledWith('[YGO Helper] Button not found');
      expect(document.getElementById('ygo-next-image-dialog-mount')).toBeNull();
    });

    it('[covers:show_image_dialog.no_dno_in_url_logs_error_and_returns] URLにdnoが無い場合エラーログを出して終了する', async () => {
      createButton();
      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com/deck?cgid=abcdef1234567890' },
        writable: true
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await showImageDialog();

      expect(errorSpy).toHaveBeenCalledWith('[YGO Helper] Failed to get deck number from URL');
    });

    it('[covers:show_image_dialog.no_cgid_in_url_logs_error_and_returns] URLにcgidが無い場合エラーログを出して終了する', async () => {
      createButton();
      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com/deck?dno=5' },
        writable: true
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await showImageDialog();

      expect(errorSpy).toHaveBeenCalledWith('[YGO Helper] Failed to get user ID from URL');
    });

    it('[covers:show_image_dialog.parse_failure_logs_error_and_returns] パース失敗時はエラーログを出して終了する', async () => {
      createButton();
      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com/deck?dno=5&cgid=abcdef1234567890' },
        writable: true
      });
      mockParseDeckDetail.mockRejectedValue(new Error('parse failed'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await showImageDialog();

      expect(errorSpy).toHaveBeenCalledWith(
        '[YGO Helper] Failed to parse deck data from current page:',
        expect.any(Error)
      );
      expect(document.getElementById('ygo-next-image-dialog-mount')).toBeNull();
    });

    it('[covers:show_image_dialog.success_delegates_to_with_data] 正常時はshowImageDialogWithDataが呼ばれる', async () => {
      createButton();
      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com/deck?dno=5&cgid=abcdef1234567890' },
        writable: true
      });
      const deckData = makeDeckInfo();
      mockParseDeckDetail.mockResolvedValue(deckData);

      await showImageDialog();

      expect(document.getElementById('ygo-next-image-dialog-mount')).not.toBeNull();
      expect(lastProps?.cgid).toBe('abcdef1234567890');
      expect(lastProps?.dno).toBe('5');
      expect(lastProps?.deckData).toBe(deckData);
    });
  });
});
