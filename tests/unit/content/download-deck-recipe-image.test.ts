/**
 * downloadDeckRecipeImage.ts のテスト
 *
 * tests/design/download-deck-recipe-image/conditions.toml (TASK-330) のconditionをカバーする。
 * createDeckRecipeImage自体はtests/design/create-deck-recipe-imageで別途検証済みのため、
 * ここではモック化し呼び出し配線のみを検証する。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DeckInfo } from '@/types/deck';

const mockCreateDeckRecipeImage = vi.fn();
vi.mock('@/content/deck-recipe/createDeckRecipeImage', () => ({
  createDeckRecipeImage: (...args: unknown[]) => mockCreateDeckRecipeImage(...args)
}));

const mockParseDeckDetail = vi.fn();
vi.mock('@/content/parser/deck-detail-parser', () => ({
  parseDeckDetail: (...args: unknown[]) => mockParseDeckDetail(...args)
}));

const mockGetCgid = vi.fn();
vi.mock('@/content/session/session', () => ({
  sessionManager: { getCgid: (...args: unknown[]) => mockGetCgid(...args) }
}));

const mockEmbedDeckInfoToPNG = vi.fn();
vi.mock('@/utils/png-metadata', () => ({
  embedDeckInfoToPNG: (...args: unknown[]) => mockEmbedDeckInfoToPNG(...args)
}));

vi.mock('@/utils/page-detector', () => ({
  detectCardGameType: () => 'ocg'
}));

const mockGetDeckDisplayUrl = vi.fn().mockReturnValue('https://example.com/deck-display');
vi.mock('@/utils/url-builder', () => ({
  getDeckDisplayUrl: (...args: unknown[]) => mockGetDeckDisplayUrl(...args)
}));

const mockAxiosGet = vi.fn();
vi.mock('axios', () => ({
  default: { get: (...args: unknown[]) => mockAxiosGet(...args) }
}));

import { downloadDeckRecipeImage } from '@/content/deck-recipe/downloadDeckRecipeImage';

const makeDeckInfo = (name = 'テストデッキ'): DeckInfo => ({
  dno: 1,
  name,
  mainDeck: [],
  extraDeck: [],
  sideDeck: [],
  category: [],
  tags: [],
  comment: '',
  deckCode: ''
});

describe('downloadDeckRecipeImage.ts', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateDeckRecipeImage.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('[covers:download_deck_recipe_image.deckdata_provided_skips_fetch] deckDataが渡されていればcgid取得・axios取得を行わない', async () => {
    const deckData = makeDeckInfo();

    await downloadDeckRecipeImage({ dno: '1', color: 'red', includeQR: false, deckData });

    expect(mockGetCgid).not.toHaveBeenCalled();
    expect(mockAxiosGet).not.toHaveBeenCalled();
    expect(mockCreateDeckRecipeImage).toHaveBeenCalledWith(
      expect.objectContaining({ deckData })
    );
  });

  it('[covers:download_deck_recipe_image.no_deckdata_fetches_own_deck_via_dno] deckData未指定でdnoがあればHTMLを取得しパースする', async () => {
    mockGetCgid.mockResolvedValue('cgid123');
    mockAxiosGet.mockResolvedValue({ data: '<html><body>deck page</body></html>' });
    const parsedDeckInfo = makeDeckInfo('パース済みデッキ');
    mockParseDeckDetail.mockResolvedValue(parsedDeckInfo);

    await downloadDeckRecipeImage({ dno: '1', color: 'red', includeQR: false });

    expect(mockGetCgid).toHaveBeenCalled();
    expect(mockGetDeckDisplayUrl).toHaveBeenCalledWith('cgid123', 1, 'ocg');
    expect(mockAxiosGet).toHaveBeenCalledWith('https://example.com/deck-display', { withCredentials: true });
    expect(mockParseDeckDetail).toHaveBeenCalled();
    expect(mockCreateDeckRecipeImage).toHaveBeenCalledWith(
      expect.objectContaining({ deckData: parsedDeckInfo })
    );
  });

  it('[covers:download_deck_recipe_image.no_deckdata_no_dno_stays_undefined] deckData・dnoともに無い場合deckDataはundefinedのまま渡される', async () => {
    await downloadDeckRecipeImage({ color: 'red', includeQR: false } as never);

    expect(mockGetCgid).not.toHaveBeenCalled();
    expect(mockCreateDeckRecipeImage).toHaveBeenCalledWith(
      expect.objectContaining({ deckData: undefined })
    );
  });

  it('[covers:download_deck_recipe_image.embeds_png_metadata_when_deckdata_present] deckDataがある場合embedDeckInfoToPNGの結果がダウンロードされる', async () => {
    const deckData = makeDeckInfo();
    const embeddedBlob = new Blob(['embedded'], { type: 'image/png' });
    mockEmbedDeckInfoToPNG.mockResolvedValue(embeddedBlob);

    await downloadDeckRecipeImage({ dno: '1', color: 'red', includeQR: false, deckData });

    expect(mockEmbedDeckInfoToPNG).toHaveBeenCalledWith(expect.any(Blob), deckData);
    expect(createObjectURLSpy).toHaveBeenCalledWith(embeddedBlob);
  });

  it('[covers:download_deck_recipe_image.embed_failure_falls_back_to_original_blob] 埋め込み失敗時は元のBlobがダウンロードされる', async () => {
    const deckData = makeDeckInfo();
    const originalBlob = new Blob(['original'], { type: 'image/png' });
    mockCreateDeckRecipeImage.mockResolvedValue(originalBlob);
    mockEmbedDeckInfoToPNG.mockRejectedValue(new Error('embed failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await downloadDeckRecipeImage({ dno: '1', color: 'red', includeQR: false, deckData });

    expect(errorSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalledWith(originalBlob);
  });

  it('[covers:download_deck_recipe_image.no_deckdata_skips_png_embedding] deckDataが無い場合embedDeckInfoToPNGは呼ばれない', async () => {
    await downloadDeckRecipeImage({ color: 'red', includeQR: false } as never);

    expect(mockEmbedDeckInfoToPNG).not.toHaveBeenCalled();
  });

  it('[covers:download_deck_recipe_image.uses_provided_filename_or_generates] fileName指定時はそれが使われる', async () => {
    const deckData = makeDeckInfo();

    await downloadDeckRecipeImage({ dno: '1', color: 'red', includeQR: false, deckData, fileName: 'custom.png' });

    const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe('custom.png');
  });

  describe('generateFileName (downloadDeckRecipeImage経由)', () => {
    it('[covers:generate_file_name.uses_deck_name_as_prefix] deckName有りの場合プレフィックスに使われる', async () => {
      const deckData = makeDeckInfo('マイデッキ');

      await downloadDeckRecipeImage({ dno: '1', color: 'red', includeQR: false, deckData });

      const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
      expect(anchor.download).toMatch(/^マイデッキ_.+\.png$/);
    });

    it('[covers:generate_file_name.default_prefix_when_no_deck_name][covers:generate_file_name.timestamp_strips_colons_and_ms] deckName未指定時はdeck-recipeプレフィックス+タイムスタンプになる', async () => {
      await downloadDeckRecipeImage({ color: 'red', includeQR: false } as never);

      const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
      expect(anchor.download).toMatch(/^deck-recipe_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.png$/);
    });
  });

  describe('downloadBlob (downloadDeckRecipeImage経由)', () => {
    it('[covers:download_blob.creates_url_triggers_click_and_cleans_up] クリック後にrevokeObjectURLでクリーンアップされる', async () => {
      const deckData = makeDeckInfo();

      await downloadDeckRecipeImage({ dno: '1', color: 'red', includeQR: false, deckData });

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});
