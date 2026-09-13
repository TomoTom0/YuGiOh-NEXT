/**
 * ImportExportDialog.vue のテスト
 *
 * tests/design/import-export-dialog/conditions.toml（TASK-500・Tier C第3号）の
 * 44条件をカバーする。1条件1itを基本とし、preview-image-stale-result-discarded のみ
 * (a)(b)の2観測シーケンスが長いため2it構成（合計45it）。
 *
 * 検証方針（条件書冒頭コメント・category-dialog様式）:
 * - BaseDialog実物（stubしない）: Teleport to="body" + v-if のため、観測はすべて
 *   document.body.querySelector(All) 経由で行う
 * - DOMイベント経由の操作（vm内部関数呼び出し・vm内部状態の直接読み取りはしない）
 * - 取得要素は必ず存在assertしてから操作する（requireElement系ヘルパー）
 * - 依存モジュールはvi.mockで差し替え:
 *   - @/utils/deck-import（importDeckFromFileの戻り値をテストごとに制御）
 *   - @/utils/deck-export（generateExportRows/exportToTXT/downloadFile/downloadDeckAsTXT）
 *   - @/content/deck-recipe/createDeckRecipeImage（保留キューで解決順を制御。
 *     ImageDialog.test.ts方式）
 * - FileReaderはvi.stubGlobalで差し替え（Blobごとに異なるdataURLを返す。
 *   競合ガード検証で1度目/2度目の生成結果を区別する）
 * - ファイル選択はinput.file-inputのfilesをDataTransfer経由で差し替えてchangeを発火
 * - wrapperのunmountはafterEachに一元化（mountDialogが管理帳簿へ登録。TASK-497対策）
 * - タイムスタンプ系条件はvi.useFakeTimers + setSystemTimeで時刻を固定
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, DOMWrapper, flushPromises, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import ImportExportDialog from '@/components/ImportExportDialog.vue';
import type { DeckInfo, DeckCardRef } from '@/types/deck';
import type { ImportResult } from '@/utils/deck-import';
import type { ExportRow, ExportOptions } from '@/utils/deck-export';
// createDeckRecipeImage の引数型の正本（src/content/deck-recipe/createDeckRecipeImage.ts は
// 再exportしていないため、定義元の types/deck-recipe-image から直接取り込む）
import type { CreateDeckRecipeImageOptions } from '@/types/deck-recipe-image';

// ============================================================
// mock（vi.hoisted: vi.mockファクトリから参照するため先に生成）
// ============================================================

/** 保留中の画像生成Promiseのresolve/reject（解決順をテスト側で制御する） */
interface PendingImageResolution {
  resolve: (blob: Blob) => void;
  reject: (error: unknown) => void;
}

const {
  mockImportDeckFromFile,
  mockGenerateExportRows,
  mockExportToTXT,
  mockDownloadFile,
  mockDownloadDeckAsTXT,
  mockCreateDeckRecipeImage,
  pendingImageResolvers,
  dataUrlByBlob
} = vi.hoisted(() => {
  // asキャスト禁止規約に従い、コールバック内で型注釈付きの変数として生成する
  const pendingImageResolvers: PendingImageResolution[] = [];
  // 値はFileReader stubのresult。非string（ArrayBuffer）を設定して異常系を駆動する場合がある
  const dataUrlByBlob = new Map<Blob, string | ArrayBuffer>();
  return {
    mockImportDeckFromFile: vi.fn<(file: File) => Promise<ImportResult>>(),
    mockGenerateExportRows: vi.fn<(deckInfo: DeckInfo, options?: ExportOptions) => ExportRow[]>(),
    mockExportToTXT: vi.fn<(deckInfo: DeckInfo, options?: ExportOptions) => string>(),
    mockDownloadFile: vi.fn<(content: string, filename: string, mimeType: string) => void>(),
    mockDownloadDeckAsTXT: vi.fn<(deckInfo: DeckInfo, filename: string, options?: ExportOptions) => void>(),
    // 戻り値は実装契約（Promise<Blob | Buffer>）に準じ、非Blob解決（Buffer相当）の
    // 異常系駆動のためBufferの基底クラスであるUint8Arrayも許容する
    mockCreateDeckRecipeImage: vi.fn<(options: CreateDeckRecipeImageOptions) => Promise<Blob | Uint8Array>>(),
    pendingImageResolvers,
    dataUrlByBlob
  };
});

vi.mock('@/utils/deck-import', () => ({
  importDeckFromFile: mockImportDeckFromFile
}));

vi.mock('@/utils/deck-export', () => ({
  generateExportRows: mockGenerateExportRows,
  exportToTXT: mockExportToTXT,
  downloadFile: mockDownloadFile,
  downloadDeckAsTXT: mockDownloadDeckAsTXT
}));

// ImportExportDialog.vueは '../content/deck-recipe/createDeckRecipeImage' を
// 相対importしているが、同じsrc/content配下ファイルへ解決されるためalias指定で差し替わる
// （ImageDialog.test.tsと同一方式）
vi.mock('@/content/deck-recipe/createDeckRecipeImage', () => ({
  createDeckRecipeImage: mockCreateDeckRecipeImage
}));

// ============================================================
// FileReader stub（generatePreviewImageのdataURL化。BlobごとにdataUrlByBlobの値を返す。
// 実FileReaderのresult型（string | ArrayBuffer | null）に合わせ、非string値も返せる）
// ============================================================

class StubFileReaderForPreview {
  result: string | ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  error: unknown = null;
  readAsDataURL(blob: Blob): void {
    this.result = dataUrlByBlob.get(blob) ?? 'data:image/png;base64,DEFAULT';
    queueMicrotask(() => this.onloadend?.());
  }
}

// ============================================================
// 要素取得ヘルパー（存在assert必須・取得失敗時は即fail）
// ============================================================

/** セレクタでbody直下の要素を取得する。存在しない場合はその場でfailする */
function requireElement<T extends Element>(selector: string): T {
  const el = document.body.querySelector<T>(selector);
  expect(el).not.toBeNull();
  if (el === null) {
    throw new Error(`[ImportExportDialog.test] element not found: ${selector}`);
  }
  return el;
}

/** セレクタ+テキスト完全一致で要素を取得する。存在しない場合はその場でfailする */
function requireElementWithText<T extends Element>(selector: string, text: string): T {
  const found = Array.from(document.body.querySelectorAll<T>(selector))
    .find(el => (el.textContent ?? '').trim() === text);
  expect(found).toBeDefined();
  if (found === undefined) {
    throw new Error(`[ImportExportDialog.test] element not found: ${selector} (text="${text}")`);
  }
  return found;
}

/** セレクタ+テキスト部分一致で要素を取得する（SVG等をtextContentに含む要素用） */
function requireElementContainingText<T extends Element>(selector: string, text: string): T {
  const found = Array.from(document.body.querySelectorAll<T>(selector))
    .find(el => (el.textContent ?? '').includes(text));
  expect(found).toBeDefined();
  if (found === undefined) {
    throw new Error(`[ImportExportDialog.test] element not found: ${selector} (contains "${text}")`);
  }
  return found;
}

// ============================================================
// fixture
// ============================================================

function cardRef(cid: string, quantity: number): DeckCardRef {
  return { cid, ciid: '1', lang: 'ja', quantity };
}

function makeDeckInfo(overrides: Partial<DeckInfo> = {}): DeckInfo {
  return {
    dno: 0,
    name: '',
    mainDeck: [],
    extraDeck: [],
    sideDeck: [],
    category: [],
    tags: [],
    comment: '',
    deckCode: '',
    ...overrides
  };
}

/** ImportResult成功（warningsは指定時のみ添付） */
function okResult(deckInfo: DeckInfo, warnings?: string[]): ImportResult {
  return warnings === undefined ? { success: true, deckInfo } : { success: true, deckInfo, warnings };
}

/** ExportRow fixture */
function makeRow(overrides: Partial<ExportRow> = {}): ExportRow {
  return {
    section: 'main',
    name: 'ブルーアイズ',
    cid: '1234',
    ciid: '1',
    enc: 'ab12',
    quantity: 2,
    ...overrides
  };
}

// ============================================================
// mount・操作ヘルパー
// ============================================================

interface MountOverrides {
  isVisible?: boolean;
  deckInfo?: DeckInfo | null;
  dno?: string;
  deckName?: string;
  initialTab?: 'import' | 'export';
  includeTimestamp?: boolean;
}

/** mountDialogで生成したwrapperの管理帳簿（afterEachで必ずunmountする。TASK-497対策） */
const mountedWrappers: Array<VueWrapper> = [];

/** 既定props（isVisible: true）を上書き可能にしてmountする。wrapperは帳簿へ登録 */
function mountDialog(overrides: MountOverrides = {}): VueWrapper {
  const wrapper = mount(ImportExportDialog, {
    props: {
      isVisible: true,
      ...overrides
    }
  });
  mountedWrappers.push(wrapper);
  return wrapper;
}

/** 帳簿末尾のwrapperをunmountする（1it内で複数mountする際の明示的な後片付け） */
function unmountLastDialog(): void {
  const wrapper = mountedWrappers.pop();
  wrapper?.unmount();
  document.body.innerHTML = '';
}

/** importDeckFromFileの解決とそれに続く描画（Transition切替込み）を待つ */
async function flushImport(): Promise<void> {
  await flushPromises();
  await nextTick();
  await nextTick();
}

/** input.file-inputのfilesを差し替えてchangeイベントを発火する */
async function selectFile(fileName: string): Promise<void> {
  const input = requireElement<HTMLInputElement>('input.file-input');
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(new File(['stub-content'], fileName));
  input.files = dataTransfer.files;
  await new DOMWrapper(input).trigger('change');
}

/** 保留キューのindex番目の画像生成を解決する（BlobとFileReaderのresult値を紐付けてからresolve。
 *  resultには非string（ArrayBuffer）も渡せ、非string時の異常系駆動に使用する） */
function resolveImage(index: number, fileReaderResult: string | ArrayBuffer): void {
  const entry = pendingImageResolvers[index];
  if (entry === undefined) {
    throw new Error(`[ImportExportDialog.test] pending image resolver not found: ${index}`);
  }
  const blob = new Blob(['preview'], { type: 'image/png' });
  dataUrlByBlob.set(blob, fileReaderResult);
  entry.resolve(blob);
}

/** Import Modeのラジオ（.radio-pill配下のinput）を選択する */
async function chooseImportMode(label: string): Promise<void> {
  const pill = requireElementWithText<HTMLLabelElement>('.radio-pill', label);
  const input = pill.querySelector('input[type="radio"]');
  expect(input).not.toBeNull();
  if (input === null) return;
  input.checked = true;
  await new DOMWrapper(input).trigger('change');
}

/** emitted('imported')の全イベントpayloadを取得する */
function emittedImported(wrapper: VueWrapper): Array<[DeckInfo, string]> {
  return wrapper.emitted<[DeckInfo, string][]>('imported') ?? [];
}

/** カラムピルのラベル一覧（並び替えの観測用） */
function columnPillLabels(): string[] {
  return Array.from(document.body.querySelectorAll('.column-pill'))
    .map(el => (el.textContent ?? '').trim());
}

/** textarea.export-previewの値 */
function exportPreviewValue(): string {
  return requireElement<HTMLTextAreaElement>('textarea.export-preview').value;
}

/** #filename-inputの値 */
function filenameValue(): string {
  return requireElement<HTMLInputElement>('#filename-input').value;
}

/** .preview-countsのラベルに対応する枚数表示のテキスト */
function previewCount(label: string): string {
  const fields = Array.from(document.body.querySelectorAll<HTMLElement>('.preview-counts .text-field'));
  const field = fields.find(f => (f.querySelector('.field-label')?.textContent ?? '').trim() === label);
  expect(field, `preview-counts field "${label}" not found`).toBeDefined();
  return (field?.querySelector('.count-value')?.textContent ?? '').trim();
}

beforeEach(() => {
  vi.stubGlobal('FileReader', StubFileReaderForPreview);
  // デフォルトのmock挙動（各itで上書き可能）
  mockImportDeckFromFile.mockResolvedValue(okResult(makeDeckInfo()));
  mockGenerateExportRows.mockReturnValue([]);
  mockExportToTXT.mockReturnValue('TXT-PREVIEW');
  mockCreateDeckRecipeImage.mockImplementation(
    () =>
      new Promise<Blob>((resolve, reject) => {
        pendingImageResolvers.push({ resolve, reject });
      })
  );
});

afterEach(() => {
  // it内のassert失敗に関わらず必ず全wrapperをunmountする（TASK-497のflaky対策。
  // body.innerHTML=''だけではコンポーネントのwatcher等が残留する）
  for (const wrapper of mountedWrappers) {
    wrapper.unmount();
  }
  mountedWrappers.length = 0;
  document.body.innerHTML = '';
  pendingImageResolvers.length = 0;
  dataUrlByBlob.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

// ============================================================
// テスト本体
// ============================================================

describe('components/ImportExportDialog', () => {
  describe('初期化・タブ', () => {
    it('[covers:import-export-dialog.initial-import-tab-state] マウント直後（ファイル未選択）はImport タブ初期状態（プレースホルダ・プレビュー待ち・Import disabled・モード選択非表示）', async () => {
      mountDialog();
      await nextTick();

      expect(requireElement('.file-name.placeholder').textContent?.trim()).toBe('No file selected');
      expect(requireElement('.preview-image-placeholder-text').textContent?.trim()).toBe('Preview will appear here');
      expect(document.body.querySelectorAll('.preview-view-tabs-row')).toHaveLength(0);
      expect(document.body.querySelectorAll('.preview-counts')).toHaveLength(0);
      expect(requireElement<HTMLButtonElement>('.btn-import').disabled).toBe(true);
      expect(document.body.querySelectorAll('.import-mode-group')).toHaveLength(0);
      expect(document.body.querySelectorAll('.warnings')).toHaveLength(0);
      expect(document.body.querySelectorAll('.error-message')).toHaveLength(0);
      expect(mockImportDeckFromFile).not.toHaveBeenCalled();
    });

    it('[covers:import-export-dialog.theme-default-follows-prefers-color-scheme] theme省略時はprefers-color-scheme: dark一致でdark・matchMedia非対応ではlight', async () => {
      // matches=true: dark
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
      mountDialog();
      await nextTick();
      expect(requireElement<HTMLElement>('.base-dialog-overlay').getAttribute('data-ygo-next-theme')).toBe('dark');

      unmountLastDialog();

      // matchMedia非対応環境相当（undefined）: light
      vi.stubGlobal('matchMedia', undefined);
      mountDialog();
      await nextTick();
      expect(requireElement<HTMLElement>('.base-dialog-overlay').getAttribute('data-ygo-next-theme')).toBe('light');
    });

    it('[covers:import-export-dialog.initial-tab-prop-on-mount] initialTab=exportでマウントするとExport タブが初期表示（本文・フッターがExport側）', async () => {
      mountDialog({ initialTab: 'export' });
      await nextTick();

      expect(requireElementWithText<HTMLButtonElement>('.dialog-tab', 'Export').classList.contains('active')).toBe(true);
      expect(requireElementWithText<HTMLButtonElement>('.dialog-tab', 'Import').classList.contains('active')).toBe(false);
      expect(requireElement<HTMLElement>('.dialog-body-export').style.display).not.toBe('none');
      expect(requireElement<HTMLElement>('.dialog-body:not(.dialog-body-export)').style.display).toBe('none');
      expect(document.body.querySelectorAll('.btn-export')).toHaveLength(1);
      expect(document.body.querySelectorAll('.btn-import')).toHaveLength(0);
    });

    it('[covers:import-export-dialog.tab-click-switches-body-and-footer] タブクリックでactive・本文（v-show）・フッターボタン（v-if）が連動して切替わる', async () => {
      mountDialog();
      await nextTick();

      // Export タブへ切替
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.dialog-tab', 'Export')).trigger('click');
      expect(requireElementWithText<HTMLButtonElement>('.dialog-tab', 'Export').classList.contains('active')).toBe(true);
      expect(requireElementWithText<HTMLButtonElement>('.dialog-tab', 'Import').classList.contains('active')).toBe(false);
      expect(requireElement<HTMLElement>('.dialog-body-export').style.display).not.toBe('none');
      expect(requireElement<HTMLElement>('.dialog-body:not(.dialog-body-export)').style.display).toBe('none');
      expect(document.body.querySelectorAll('.btn-export')).toHaveLength(1);
      expect(document.body.querySelectorAll('.btn-import')).toHaveLength(0);

      // Import タブへ復帰
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.dialog-tab', 'Import')).trigger('click');
      expect(requireElementWithText<HTMLButtonElement>('.dialog-tab', 'Import').classList.contains('active')).toBe(true);
      expect(requireElement<HTMLElement>('.dialog-body:not(.dialog-body-export)').style.display).not.toBe('none');
      expect(requireElement<HTMLElement>('.dialog-body-export').style.display).toBe('none');
      expect(document.body.querySelectorAll('.btn-import')).toHaveLength(1);
      expect(document.body.querySelectorAll('.btn-export')).toHaveLength(0);
    });
  });

  describe('Import: ファイル選択', () => {
    it('[covers:import-export-dialog.file-select-btn-delegates-to-hidden-input] ファイル選択ボタンのクリックは非表示input.file-inputのclickへ委譲する', async () => {
      mountDialog();
      await nextTick();

      const input = requireElement<HTMLInputElement>('input.file-input');
      const onInputClick = vi.fn();
      input.addEventListener('click', onInputClick);

      await new DOMWrapper(requireElement<HTMLButtonElement>('.file-select-btn')).trigger('click');
      expect(onInputClick).toHaveBeenCalledTimes(1);
    });

    it('[covers:import-export-dialog.change-without-file-ignored] filesが空のchangeイベントは何もしない（importDeckFromFile不呼び出し・状態不変）', async () => {
      mountDialog();
      await nextTick();

      await new DOMWrapper(requireElement<HTMLInputElement>('input.file-input')).trigger('change');
      await flushImport();

      expect(mockImportDeckFromFile).not.toHaveBeenCalled();
      expect(requireElement('.file-name.placeholder').textContent?.trim()).toBe('No file selected');
    });

    it('[covers:import-export-dialog.file-select-clears-previous-state] ファイル選択のたびに前回のwarnings・countsをクリアし、import解決前はImportボタンがdisabledに戻る', async () => {
      mountDialog();
      await nextTick();

      // 1度目: warnings付き成功（PNGなのでText初期表示）
      mockImportDeckFromFile.mockResolvedValue(
        okResult(makeDeckInfo({ mainDeck: [cardRef('1', 2)] }), ['警告1'])
      );
      await selectFile('deck.png');
      await flushImport();
      expect(document.body.querySelectorAll('.warnings')).toHaveLength(1);
      expect(document.body.querySelectorAll('.preview-counts')).toHaveLength(1);
      expect(requireElement<HTMLButtonElement>('.btn-import').disabled).toBe(false);

      // 2度目: mockの解決をpendingにしたまま別ファイルを選択
      mockImportDeckFromFile.mockReturnValue(new Promise<ImportResult>(() => {}));
      await selectFile('deck2.csv');
      await nextTick();

      // 選択直後（import解決前）: 前回状態はクリアされ、Importボタンはdisabledに戻る
      expect(document.body.querySelectorAll('.warnings')).toHaveLength(0);
      expect(document.body.querySelectorAll('.preview-counts')).toHaveLength(0);
      expect(requireElement<HTMLButtonElement>('.btn-import').disabled).toBe(true);
      expect(requireElement('.file-name').textContent?.trim()).toBe('deck2.csv');
      expect(document.body.querySelectorAll('.file-name.placeholder')).toHaveLength(0);
    });

    it('[covers:import-export-dialog.preview-view-mode-initial-by-file-type] プレビュー表示モードの初期値は読み込み元の逆（PNG（大文字含む）はtext・CSVはimage）', async () => {
      mountDialog();
      await nextTick();

      // 大文字拡張子 'DECK.PNG' でもPNG扱い（toLowerCase込み）でText初期表示
      await selectFile('DECK.PNG');
      await flushImport();

      const textSubTab = requireElementWithText<HTMLButtonElement>('.preview-view-tabs .sub-tab-btn', 'Text');
      const imageSubTab = requireElementWithText<HTMLButtonElement>('.preview-view-tabs .sub-tab-btn', 'Image');
      expect(textSubTab.classList.contains('active')).toBe(true);
      expect(imageSubTab.classList.contains('active')).toBe(false);
      expect(document.body.querySelectorAll('.preview-text-view')).toHaveLength(1);

      // CSVはImage初期表示（Textビューは非表示）
      await selectFile('deck.csv');
      await flushImport();

      expect(requireElementWithText<HTMLButtonElement>('.preview-view-tabs .sub-tab-btn', 'Image').classList.contains('active')).toBe(true);
      expect(requireElementWithText<HTMLButtonElement>('.preview-view-tabs .sub-tab-btn', 'Text').classList.contains('active')).toBe(false);
      expect(document.body.querySelectorAll('.preview-text-view')).toHaveLength(0);
    });

    it('[covers:import-export-dialog.preview-view-mode-toggle] Image/Textサブタブのクリックでプレビュー表示モードを手動切替できる', async () => {
      mockImportDeckFromFile.mockResolvedValue(okResult(makeDeckInfo()));
      mockGenerateExportRows.mockReturnValue([makeRow()]);
      mountDialog();
      await nextTick();

      // deck.csv選択（Image初期表示）
      await selectFile('deck.csv');
      await flushImport();
      expect(document.body.querySelectorAll('.preview-text-view')).toHaveLength(0);

      // Text サブタブをクリック
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.preview-view-tabs .sub-tab-btn', 'Text')).trigger('click');
      await flushImport();
      expect(requireElementWithText<HTMLButtonElement>('.preview-view-tabs .sub-tab-btn', 'Text').classList.contains('active')).toBe(true);
      expect(requireElementWithText<HTMLButtonElement>('.preview-view-tabs .sub-tab-btn', 'Image').classList.contains('active')).toBe(false);
      expect(document.body.querySelectorAll('.preview-text-view')).toHaveLength(1);

      // Image サブタブをクリックして復帰
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.preview-view-tabs .sub-tab-btn', 'Image')).trigger('click');
      await flushImport();
      expect(requireElementWithText<HTMLButtonElement>('.preview-view-tabs .sub-tab-btn', 'Image').classList.contains('active')).toBe(true);
      expect(document.body.querySelectorAll('.preview-text-view')).toHaveLength(0);
    });
  });

  describe('Import: 結果反映', () => {
    it('[covers:import-export-dialog.import-failure-shows-error-keeps-disabled] import失敗時はerror文言を表示しImportボタンdisabled・モード選択非表示のまま（プレビュー領域は空表示）', async () => {
      mockImportDeckFromFile.mockResolvedValue({ success: false, error: 'ファイルが空です' });
      mountDialog();
      await nextTick();

      await selectFile('deck.csv');
      await flushImport();

      expect(requireElement('.error-message').textContent?.trim()).toBe('ファイルが空です');
      expect(requireElement<HTMLButtonElement>('.btn-import').disabled).toBe(true);
      expect(document.body.querySelectorAll('.import-mode-group')).toHaveLength(0);
      // プレビュー領域のv-else-ifチェーンのいずれにも該当しない（プレースホルダなしの空表示）
      expect(document.body.querySelectorAll('.preview-image-area .preview-image-placeholder-text')).toHaveLength(0);
      expect(document.body.querySelectorAll('.preview-image-area .preview-image-wrapper')).toHaveLength(0);
      expect(document.body.querySelectorAll('.preview-image-area .preview-text-view')).toHaveLength(0);
    });

    it('[covers:import-export-dialog.import-failure-uses-default-error] success:falseかつerrorなしの場合はフォールバック文言「インポートに失敗しました」を表示する', async () => {
      mockImportDeckFromFile.mockResolvedValue({ success: false });
      mountDialog();
      await nextTick();

      await selectFile('deck.csv');
      await flushImport();

      expect(requireElement('.error-message').textContent?.trim()).toBe('インポートに失敗しました');
      expect(requireElement<HTMLButtonElement>('.btn-import').disabled).toBe(true);
      expect(document.body.querySelectorAll('.import-mode-group')).toHaveLength(0);
    });

    it('[covers:import-export-dialog.import-success-shows-counts-and-enables-import] import成功時はquantity合計をセクション毎に集計表示しImportボタン有効化・モード選択表示（Replace既定）', async () => {
      mockImportDeckFromFile.mockResolvedValue(
        okResult(
          makeDeckInfo({
            mainDeck: [cardRef('1', 2), cardRef('2', 3)],
            extraDeck: [cardRef('3', 1)],
            sideDeck: []
          })
        )
      );
      mountDialog();
      await nextTick();

      await selectFile('deck.csv');
      await flushImport();

      // エントリ数でなく枚数合計: main=2+3=5 / extra=1 / side=0
      expect(previewCount('main')).toBe('5');
      expect(previewCount('extra')).toBe('1');
      expect(previewCount('side')).toBe('0');
      expect(requireElement<HTMLButtonElement>('.btn-import').disabled).toBe(false);
      expect(document.body.querySelectorAll('.import-mode-group')).toHaveLength(1);
      expect(requireElementWithText<HTMLLabelElement>('.radio-pill', 'Replace').classList.contains('active')).toBe(true);
    });

    it('[covers:import-export-dialog.import-success-without-deckinfo-does-not-enable] success:trueかつdeckInfoなしの場合は何も更新しない（失敗扱いにしない・有効化もしない）', async () => {
      mockImportDeckFromFile.mockResolvedValue({ success: true });
      mountDialog();
      await nextTick();

      await selectFile('deck.csv');
      await flushImport();

      expect(document.body.querySelectorAll('.error-message')).toHaveLength(0);
      expect(document.body.querySelectorAll('.preview-counts')).toHaveLength(0);
      expect(requireElement<HTMLButtonElement>('.btn-import').disabled).toBe(true);
      expect(document.body.querySelectorAll('.import-mode-group')).toHaveLength(0);
    });

    it('[covers:import-export-dialog.import-warnings-listed] warningsがある場合は全件一覧表示し、なしの場合は非表示', async () => {
      mountDialog();
      await nextTick();

      // warningsあり: ヘッダ + li 2件（警告文そのまま）
      mockImportDeckFromFile.mockResolvedValue(
        okResult(makeDeckInfo(), ['行2: 不正なcid', '行3: 不正な数量'])
      );
      await selectFile('deck1.csv');
      await flushImport();

      expect(requireElement('.warning-header').textContent?.trim()).toBe('Warnings:');
      const items = Array.from(document.body.querySelectorAll('.warnings li'))
        .map(li => (li.textContent ?? '').trim());
      expect(items).toEqual(['行2: 不正なcid', '行3: 不正な数量']);

      // warningsなし: 非表示
      mockImportDeckFromFile.mockResolvedValue(okResult(makeDeckInfo()));
      await selectFile('deck2.csv');
      await flushImport();
      expect(document.body.querySelectorAll('.warnings')).toHaveLength(0);
    });

    it('[covers:import-export-dialog.import-preview-text-section-format] Textプレビューはセクション見出し+quantity行形式（行数0セクション省略・enc非表示）', async () => {
      mockImportDeckFromFile.mockResolvedValue(okResult(makeDeckInfo()));
      mockGenerateExportRows.mockReturnValue([
        makeRow({ section: 'main', name: 'ブルーアイズ', quantity: 2, enc: 'ENC123' }),
        makeRow({ section: 'side', name: '灰流うらら', quantity: 1, enc: 'ENC456' })
      ]);
      mountDialog();
      await nextTick();

      // PNGのためText初期表示
      await selectFile('deck.png');
      await flushImport();

      const text = requireElement<HTMLElement>('.preview-text-view').textContent ?? '';
      // 改行境界込みで行単位の完全比較を行う（部分indexOfでは改行混入や行の過不足を検証できないため）。
      // この完全一致により「行数0のExtra Deckセクションの省略」と
      // 「enc（画像ハッシュ）を含む行が存在しないこと（Export用TXT形式と異なる点）」も担保される
      expect(text.split('\n')).toEqual([
        '=== Main Deck (2 cards) ===',
        '2x ブルーアイズ',
        '',
        '=== Side Deck (1 cards) ===',
        '1x 灰流うらら'
      ]);
    });
  });

  describe('Import: プレビュー画像', () => {
    it('[covers:import-export-dialog.preview-image-delegates-fixed-args] プレビュー画像生成はcreateDeckRecipeImageへ固定引数（name空文字化コピー）で委譲する', async () => {
      const deckInfo = makeDeckInfo({ name: 'テストデッキ', mainDeck: [cardRef('1', 2)] });
      mockImportDeckFromFile.mockResolvedValue(okResult(deckInfo));
      mountDialog();
      await nextTick();

      await selectFile('deck.csv');
      await flushImport();

      expect(mockCreateDeckRecipeImage).toHaveBeenCalledTimes(1);
      const arg = mockCreateDeckRecipeImage.mock.calls[0]?.[0];
      expect(arg).toBeDefined();
      if (arg === undefined) return;
      expect(arg.cgid).toBe('');
      expect(arg.dno).toBe('0');
      expect(arg.color).toBe('red');
      expect(arg.includeQR).toBe(false);
      expect(arg.scale).toBe(1);
      // デッキ名はプレビュー画像に表示しないためnameを空文字化したコピーを渡す
      expect(arg.deckData).toEqual({ ...deckInfo, name: '' });
    });

    it('[covers:import-export-dialog.preview-image-loading-then-success] 生成中は「Generating preview…」表示、完了したらBlobをdataURL化してimg表示（Importedバッジ付き）', async () => {
      mockImportDeckFromFile.mockResolvedValue(okResult(makeDeckInfo()));
      mountDialog();
      await nextTick();

      await selectFile('deck.csv');
      await flushImport();

      // 解決前: loadingプレースホルダ表示でimgなし
      expect(requireElement('.preview-image-placeholder-text').textContent?.trim()).toBe('Generating preview…');
      expect(document.body.querySelectorAll('.preview-image')).toHaveLength(0);

      // 解決後: FileReader stub経由のdataURLでimg表示
      resolveImage(0, 'data:image/png;base64,AAA');
      await flushImport();

      const img = requireElement<HTMLImageElement>('.preview-image');
      expect(img.getAttribute('src')).toBe('data:image/png;base64,AAA');
      expect(document.body.querySelectorAll('.imported-badge')).toHaveLength(1);
    });

    it('[covers:import-export-dialog.preview-image-failure-shows-error] 画像生成失敗時は固定文言のエラー表示（import自体は成功扱いのままImportボタン有効）', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockImportDeckFromFile.mockResolvedValue(okResult(makeDeckInfo()));
      mockCreateDeckRecipeImage.mockImplementation(() => Promise.reject(new Error('boom')));
      mountDialog();
      await nextTick();

      await selectFile('deck.csv');
      await flushImport();

      const errorText = requireElement<HTMLElement>('.preview-image-placeholder-text.error');
      expect(errorText.textContent?.trim()).toBe('プレビュー画像の生成に失敗しました');
      expect(document.body.querySelectorAll('.preview-image')).toHaveLength(0);
      expect(requireElement<HTMLButtonElement>('.btn-import').disabled).toBe(false);
    });

    it('[covers:import-export-dialog.preview-image-non-blob-result-rejected] createDeckRecipeImageがBlob以外（Buffer相当）を返した場合はエラー表示・loading解除（import自体は成功扱いのまま）', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockImportDeckFromFile.mockResolvedValue(okResult(makeDeckInfo()));
      // 実装契約はPromise<Blob | Buffer>。Buffer相当としてBufferの基底クラスUint8Arrayを解決させる
      mockCreateDeckRecipeImage.mockResolvedValue(new Uint8Array([1]));
      mountDialog();
      await nextTick();

      await selectFile('deck.csv');
      await flushImport();

      const errorText = requireElement<HTMLElement>('.preview-image-placeholder-text.error');
      expect(errorText.textContent?.trim()).toBe('プレビュー画像の生成に失敗しました');
      expect(document.body.querySelectorAll('.preview-image')).toHaveLength(0);
      // finallyでloading解除されるため 'Generating preview…' には戻らない
      expect(requireElement('.preview-image-placeholder-text').textContent?.trim())
        .not.toBe('Generating preview…');
      expect(requireElement<HTMLButtonElement>('.btn-import').disabled).toBe(false);
    });

    it('[covers:import-export-dialog.preview-image-non-string-result-rejected] FileReaderのresultが非string（ArrayBuffer）の場合はエラー表示・loading解除（import自体は成功扱いのまま）', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockImportDeckFromFile.mockResolvedValue(okResult(makeDeckInfo()));
      mountDialog();
      await nextTick();

      await selectFile('deck.csv');
      await flushImport();

      // Blobは解決するが、FileReader stubのresultがArrayBuffer（非string）になる
      resolveImage(0, new ArrayBuffer(8));
      await flushImport();

      const errorText = requireElement<HTMLElement>('.preview-image-placeholder-text.error');
      expect(errorText.textContent?.trim()).toBe('プレビュー画像の生成に失敗しました');
      expect(document.body.querySelectorAll('.preview-image')).toHaveLength(0);
      expect(requireElement('.preview-image-placeholder-text').textContent?.trim())
        .not.toBe('Generating preview…');
      expect(requireElement<HTMLButtonElement>('.btn-import').disabled).toBe(false);
    });

    it('[covers:import-export-dialog.preview-image-stale-result-discarded] (a) 古い生成結果のresolveは反映されず最新の結果のみ表示される', async () => {
      mockImportDeckFromFile.mockResolvedValue(okResult(makeDeckInfo()));
      mountDialog();
      await nextTick();

      // 1度目のファイル選択（画像生成はpendingのまま）
      await selectFile('deck1.csv');
      await flushImport();
      expect(requireElement('.preview-image-placeholder-text').textContent?.trim()).toBe('Generating preview…');

      // 2度目のファイル選択（別の生成が開始される）
      await selectFile('deck2.csv');
      await flushImport();
      expect(pendingImageResolvers).toHaveLength(2);

      // 1度目の生成が後から完了しても反映されない（loadingも解除されない）
      resolveImage(0, 'data:image/png;base64,FIRST');
      await flushImport();
      expect(requireElement('.preview-image-placeholder-text').textContent?.trim()).toBe('Generating preview…');
      expect(document.body.querySelectorAll('.preview-image')).toHaveLength(0);

      // 2度目の生成結果のみ反映される
      resolveImage(1, 'data:image/png;base64,SECOND');
      await flushImport();
      expect(requireElement<HTMLImageElement>('.preview-image').getAttribute('src')).toBe('data:image/png;base64,SECOND');
      expect(document.body.querySelectorAll('.preview-image-placeholder-text')).toHaveLength(0);
    });

    it('[covers:import-export-dialog.preview-image-stale-result-discarded] (b) 古い生成結果のrejectは2度目のloading・error状態を上書きしない', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockImportDeckFromFile.mockResolvedValue(okResult(makeDeckInfo()));
      mountDialog();
      await nextTick();

      await selectFile('deck1.csv');
      await flushImport();
      await selectFile('deck2.csv');
      await flushImport();
      expect(pendingImageResolvers).toHaveLength(2);

      // 1度目のreject: エラー文言は出ず、2度目のloading表示のまま
      pendingImageResolvers[0]?.reject(new Error('first fails'));
      await flushImport();
      expect(requireElement('.preview-image-placeholder-text').textContent?.trim()).toBe('Generating preview…');
      expect(document.body.querySelectorAll('.preview-image-placeholder-text.error')).toHaveLength(0);

      // 2度目の結果で完了する
      resolveImage(1, 'data:image/png;base64,SECOND');
      await flushImport();
      expect(requireElement<HTMLImageElement>('.preview-image').getAttribute('src')).toBe('data:image/png;base64,SECOND');
      expect(document.body.querySelectorAll('.preview-image-placeholder-text.error')).toHaveLength(0);
    });
  });

  describe('Import実行・クローズ', () => {
    it('[covers:import-export-dialog.import-emits-deckinfo-and-mode] ImportボタンはimportMode（既定replace・選択どおりadd/new）とdeckInfoをimportedイベントでemitしcloseする', async () => {
      const deckInfo = makeDeckInfo({ mainDeck: [cardRef('1', 2)] });
      mockImportDeckFromFile.mockResolvedValue(okResult(deckInfo));
      const wrapper = mountDialog();
      await nextTick();

      await selectFile('deck.csv');
      await flushImport();

      // モード未選択（既定replace）
      await new DOMWrapper(requireElement<HTMLButtonElement>('.btn-import')).trigger('click');
      expect(emittedImported(wrapper)).toEqual([[deckInfo, 'replace']]);

      // Add選択後
      await chooseImportMode('Add');
      await new DOMWrapper(requireElement<HTMLButtonElement>('.btn-import')).trigger('click');
      expect(emittedImported(wrapper)[1]).toEqual([deckInfo, 'add']);

      // New選択後
      await chooseImportMode('New');
      await new DOMWrapper(requireElement<HTMLButtonElement>('.btn-import')).trigger('click');
      expect(emittedImported(wrapper)[2]).toEqual([deckInfo, 'new']);

      // closeは3回・exportedは発火しない
      expect(wrapper.emitted('close')).toHaveLength(3);
      expect(wrapper.emitted('exported')).toBeUndefined();
    });

    it('[covers:import-export-dialog.close-btn-emits-close] ヘッダーの×ボタンでcloseイベントをemitする（引数なし・他イベントなし）', async () => {
      const wrapper = mountDialog();
      await nextTick();

      await new DOMWrapper(requireElement<HTMLButtonElement>('.close-btn')).trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
      expect(wrapper.emitted('imported')).toBeUndefined();
      expect(wrapper.emitted('exported')).toBeUndefined();
    });

    it('[covers:import-export-dialog.overlay-self-click-emits-close] オーバーレイ自身のクリックでcloseし、ダイアログ内容のクリックではcloseしない', async () => {
      const wrapper = mountDialog();
      await nextTick();

      // ダイアログ内容のクリックではcloseしない
      await new DOMWrapper(requireElement<HTMLElement>('.dialog-content')).trigger('click');
      expect(wrapper.emitted('close')).toBeUndefined();

      // オーバーレイ自身（ダイアログ外の余白）のクリックでcloseする
      await new DOMWrapper(requireElement<HTMLElement>('.base-dialog-overlay')).trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  describe('再オープン', () => {
    it('[covers:import-export-dialog.reopen-resets-import-state] ダイアログを閉じるとImport状態（ファイル・プレビュー・モード・表示モード・入力値）がリセットされる', async () => {
      mockImportDeckFromFile.mockResolvedValue(
        okResult(makeDeckInfo({ mainDeck: [cardRef('1', 2)] }))
      );
      const wrapper = mountDialog();
      await nextTick();

      // Import成功状態を作る（CSVなのでImage初期表示 → 手動でTextサブタブへ切替）
      await selectFile('deck.csv');
      await flushImport();
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.preview-view-tabs .sub-tab-btn', 'Text')).trigger('click');
      await flushImport();
      expect(document.body.querySelectorAll('.preview-text-view')).toHaveLength(1);

      // Add選択
      await chooseImportMode('Add');
      expect(requireElementWithText<HTMLLabelElement>('.radio-pill', 'Add').classList.contains('active')).toBe(true);

      // ファイル入力には選択ファイル名が反映されている（happy-domのfake path表記）
      const fileInput = requireElement<HTMLInputElement>('input.file-input');
      expect(fileInput.value).toContain('deck.csv');

      // ダイアログを閉じて再オープン（isVisible false → true）
      await wrapper.setProps({ isVisible: false });
      await wrapper.setProps({ isVisible: true });
      await nextTick();

      // 再オープン直後: Import状態はリセット済み
      expect(requireElement('.file-name.placeholder').textContent?.trim()).toBe('No file selected');
      expect(requireElement('.preview-image-placeholder-text').textContent?.trim()).toBe('Preview will appear here');
      expect(requireElement<HTMLButtonElement>('.btn-import').disabled).toBe(true);
      expect(document.body.querySelectorAll('.import-mode-group')).toHaveLength(0);
      expect(requireElement<HTMLInputElement>('input.file-input').value).toBe('');

      // 再選択後: 表示モード初期値はImage（previewViewModeリセット）
      await selectFile('deck.csv');
      await flushImport();
      expect(requireElementWithText<HTMLButtonElement>('.preview-view-tabs .sub-tab-btn', 'Image').classList.contains('active')).toBe(true);
      expect(document.body.querySelectorAll('.preview-text-view')).toHaveLength(0);

      // Import実行で 'replace' がemitされる（importModeリセット）
      await new DOMWrapper(requireElement<HTMLButtonElement>('.btn-import')).trigger('click');
      expect(emittedImported(wrapper).at(-1)?.[1]).toBe('replace');
    });

    it('[covers:import-export-dialog.reopen-restores-initial-tab] 再オープン時にactiveTabはinitialTabへ戻る（既定import・initialTab=exportの両方）', async () => {
      const wrapper = mountDialog();
      await nextTick();

      // Import タブ（既定）からExport タブへ手動切替
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.dialog-tab', 'Export')).trigger('click');
      expect(requireElementWithText<HTMLButtonElement>('.dialog-tab', 'Export').classList.contains('active')).toBe(true);

      // 再オープン: 既定'import'へ戻る
      await wrapper.setProps({ isVisible: false });
      await wrapper.setProps({ isVisible: true });
      await nextTick();
      expect(requireElementWithText<HTMLButtonElement>('.dialog-tab', 'Import').classList.contains('active')).toBe(true);
      expect(requireElement<HTMLElement>('.dialog-body:not(.dialog-body-export)').style.display).not.toBe('none');

      // initialTab='export'を与えて再オープン: Export タブがactive
      await wrapper.setProps({ isVisible: false });
      await wrapper.setProps({ initialTab: 'export' });
      await wrapper.setProps({ isVisible: true });
      await nextTick();
      expect(requireElementWithText<HTMLButtonElement>('.dialog-tab', 'Export').classList.contains('active')).toBe(true);
    });

    it('[covers:import-export-dialog.reopen-keeps-export-ui-state] 現行挙動: format・includeSide・csvColumnsのON/OFFと並び替えは再オープンでも保持される', async () => {
      mockGenerateExportRows.mockReturnValue([makeRow()]);
      const wrapper = mountDialog({ initialTab: 'export' });
      await nextTick();

      // CSV（既定）: Name列OFF + Name ピルをCID の位置へ並び替え
      const namePill = requireElementWithText<HTMLButtonElement>('.column-pill', 'Name');
      await new DOMWrapper(namePill).trigger('click');
      await new DOMWrapper(namePill).trigger('dragstart');
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.column-pill', 'CID')).trigger('drop');
      await nextTick();
      expect(columnPillLabels()).toEqual(['Section', 'CID', 'Name', 'CIID', 'ENC', 'Qty']);

      // TXT形式へ切替（column-toggle-row は非表示）+ Side Deck OFF
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.sub-tabs .sub-tab-btn', 'TXT')).trigger('click');
      await nextTick();
      expect(document.body.querySelectorAll('.column-toggle-row')).toHaveLength(0);
      await new DOMWrapper(requireElementContainingText<HTMLButtonElement>('.export-tabs-row .toggle-pill', 'Side Deck')).trigger('click');
      await nextTick();

      // 再オープン
      await wrapper.setProps({ isVisible: false });
      await wrapper.setProps({ isVisible: true });
      await nextTick();

      // TXT選択は維持（column-toggle-row 非表示のまま）
      expect(requireElementWithText<HTMLButtonElement>('.sub-tabs .sub-tab-btn', 'TXT').classList.contains('active')).toBe(true);
      expect(document.body.querySelectorAll('.column-toggle-row')).toHaveLength(0);

      // CSVへ戻すと: Name列は非activeかつ並び替え後の順のまま・Side Deckピルは非active
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.sub-tabs .sub-tab-btn', 'CSV')).trigger('click');
      await nextTick();
      expect(requireElementWithText<HTMLButtonElement>('.column-pill', 'Name').classList.contains('active')).toBe(false);
      expect(columnPillLabels()).toEqual(['Section', 'CID', 'Name', 'CIID', 'ENC', 'Qty']);
      expect(requireElementContainingText<HTMLButtonElement>('.export-tabs-row .toggle-pill', 'Side Deck').classList.contains('active')).toBe(false);
    });

    it('[covers:import-export-dialog.reopen-keeps-filename-base] 現行挙動: filenameBaseは再オープンで再生成されず手編集値が残る', async () => {
      mockGenerateExportRows.mockReturnValue([makeRow()]);
      const wrapper = mountDialog({ initialTab: 'export', deckName: 'mydeck', includeTimestamp: false });
      await nextTick();
      expect(filenameValue()).toBe('mydeck');

      // 手編集
      await new DOMWrapper(requireElement<HTMLInputElement>('#filename-input')).setValue('renamed');
      expect(filenameValue()).toBe('renamed');

      // 再オープンしても再生成されず手編集値のまま
      await wrapper.setProps({ isVisible: false });
      await wrapper.setProps({ isVisible: true });
      await nextTick();
      expect(filenameValue()).toBe('renamed');
    });
  });

  describe('Export', () => {
    it('[covers:import-export-dialog.export-preview-empty-and-download-guard-without-deckinfo] deckInfoがない場合はプレビュー空・Downloadクリックでダウンロード・emit・closeを行わない', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const wrapper = mountDialog({ initialTab: 'export' });
      await nextTick();

      expect(exportPreviewValue()).toBe('');

      await new DOMWrapper(requireElement<HTMLButtonElement>('.btn-export')).trigger('click');
      await flushImport();

      expect(mockDownloadFile).not.toHaveBeenCalled();
      expect(mockDownloadDeckAsTXT).not.toHaveBeenCalled();
      expect(wrapper.emitted('exported')).toBeUndefined();
      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[covers:import-export-dialog.format-switch-updates-preview-columns-extension] CSV/TXTサブタブ切替でプレビュー内容・カラム行表示・拡張子表示が連動する', async () => {
      mockGenerateExportRows.mockReturnValue([makeRow()]);
      mountDialog({ initialTab: 'export', deckInfo: makeDeckInfo() });
      await nextTick();

      // CSV（既定）: カラム行描画・拡張子.csv・プレビューはCSV形式
      expect(document.body.querySelectorAll('.column-toggle-row')).toHaveLength(1);
      expect(requireElement<HTMLElement>('.file-extension').textContent?.trim()).toBe('.csv');
      expect(exportPreviewValue().split('\n')[0]).toBe('section,name,cid,ciid,enc,quantity');

      // TXTへ切替: active切替・カラム行非描画・拡張子.txt・プレビューはexportToTXT委譲結果
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.sub-tabs .sub-tab-btn', 'TXT')).trigger('click');
      await nextTick();
      expect(requireElementWithText<HTMLButtonElement>('.sub-tabs .sub-tab-btn', 'TXT').classList.contains('active')).toBe(true);
      expect(requireElementWithText<HTMLButtonElement>('.sub-tabs .sub-tab-btn', 'CSV').classList.contains('active')).toBe(false);
      expect(document.body.querySelectorAll('.column-toggle-row')).toHaveLength(0);
      expect(requireElement<HTMLElement>('.file-extension').textContent?.trim()).toBe('.txt');
      expect(exportPreviewValue()).toBe('TXT-PREVIEW');
    });

    it('[covers:import-export-dialog.csv-preview-enabled-columns-and-order] CSVプレビューは有効カラムのみをcsvColumnsの並び順どおりに組み立てる（ciidは空フィールドのまま）', async () => {
      mockGenerateExportRows.mockReturnValue([
        makeRow({ section: 'main', name: 'ブルーアイズ', cid: '1234', ciid: '', enc: 'ab12', quantity: 2 })
      ]);
      mountDialog({ initialTab: 'export', deckInfo: makeDeckInfo() });
      await nextTick();

      // 全列ON
      expect(exportPreviewValue()).toBe('section,name,cid,ciid,enc,quantity\nmain,ブルーアイズ,1234,,ab12,2');

      // ENC列OFF: ヘッダ・データ行から消え、残り列の並び順は維持
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.column-pill', 'ENC')).trigger('click');
      await nextTick();
      expect(exportPreviewValue()).toBe('section,name,cid,ciid,quantity\nmain,ブルーアイズ,1234,,2');
    });

    it('[covers:import-export-dialog.csv-name-field-escape] データ行のname列のみCSVエスケープする（引用符で括り二重引用符を二重化・他列はraw）', async () => {
      mountDialog({ initialTab: 'export', deckInfo: makeDeckInfo() });
      await nextTick();

      // exportPreviewTextはcomputedのため、mock戻り値を変えただけでは再計算されない。
      // ENCピルを一度トグルして戻す（最終的に全列ONのまま）ことでcomputedを再評価させる
      async function touchPreview(): Promise<void> {
        const pill = requireElementWithText<HTMLButtonElement>('.column-pill', 'ENC');
        await new DOMWrapper(pill).trigger('click');
        await new DOMWrapper(pill).trigger('click');
        await nextTick();
      }

      // (a) カンマと二重引用符を含む値
      mockGenerateExportRows.mockReturnValue([makeRow({ name: 'A"B,C' })]);
      await touchPreview();
      expect(exportPreviewValue()).toBe('section,name,cid,ciid,enc,quantity\nmain,"A""B,C",1234,1,ab12,2');

      // (b) 二重引用符のみを含む値
      mockGenerateExportRows.mockReturnValue([makeRow({ name: 'Q"x' })]);
      await touchPreview();
      expect(exportPreviewValue()).toBe('section,name,cid,ciid,enc,quantity\nmain,"Q""x",1234,1,ab12,2');

      // (c) 改行を含む値
      mockGenerateExportRows.mockReturnValue([makeRow({ name: 'X\nY' })]);
      await touchPreview();
      expect(exportPreviewValue()).toBe('section,name,cid,ciid,enc,quantity\nmain,"X\nY",1234,1,ab12,2');
    });

    it('[covers:import-export-dialog.toggle-column-excludes-from-csv] 非必須カラムのピルクリックでON/OFFがトグルしヘッダ・データ行から現れたり消えたりする', async () => {
      mockGenerateExportRows.mockReturnValue([makeRow()]);
      mountDialog({ initialTab: 'export', deckInfo: makeDeckInfo() });
      await nextTick();

      const namePill = requireElementWithText<HTMLButtonElement>('.column-pill', 'Name');
      expect(namePill.classList.contains('active')).toBe(true);

      // 1回目: OFF
      await new DOMWrapper(namePill).trigger('click');
      await nextTick();
      expect(namePill.classList.contains('active')).toBe(false);
      expect(exportPreviewValue()).toBe('section,cid,ciid,enc,quantity\nmain,1234,1,ab12,2');

      // 2回目: ON復帰
      await new DOMWrapper(namePill).trigger('click');
      await nextTick();
      expect(namePill.classList.contains('active')).toBe(true);
      expect(exportPreviewValue()).toBe('section,name,cid,ciid,enc,quantity\nmain,ブルーアイズ,1234,1,ab12,2');
    });

    it('[covers:import-export-dialog.required-columns-not-toggleable] 必須列（Section/CID/Qty）はピルクリックでOFFにできずrequiredクラスを保持する', async () => {
      mockGenerateExportRows.mockReturnValue([makeRow()]);
      mountDialog({ initialTab: 'export', deckInfo: makeDeckInfo() });
      await nextTick();

      const before = exportPreviewValue();
      for (const label of ['Section', 'CID', 'Qty']) {
        const pill = requireElementWithText<HTMLButtonElement>('.column-pill', label);
        await new DOMWrapper(pill).trigger('click');
        await nextTick();
        expect(pill.classList.contains('active'), `${label} is active`).toBe(true);
        expect(pill.classList.contains('required'), `${label} has required class`).toBe(true);
        expect(pill.getAttribute('title')).toBe('再インポートに必須の列のためOFFにできません');
      }
      expect(exportPreviewValue()).toBe(before);
    });

    it('[covers:import-export-dialog.column-drag-drop-reorders] カラムピルのdragstart/dropで列順を並び替えヘッダ・データ行へ反映する（draggingクラスはdrop後に解除）', async () => {
      mockGenerateExportRows.mockReturnValue([makeRow()]);
      mountDialog({ initialTab: 'export', deckInfo: makeDeckInfo() });
      await nextTick();

      const namePill = requireElementWithText<HTMLButtonElement>('.column-pill', 'Name');
      await new DOMWrapper(namePill).trigger('dragstart');
      await nextTick();
      expect(namePill.classList.contains('dragging')).toBe(true);

      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.column-pill', 'CID')).trigger('drop');
      await nextTick();
      expect(namePill.classList.contains('dragging')).toBe(false);
      expect(columnPillLabels()).toEqual(['Section', 'CID', 'Name', 'CIID', 'ENC', 'Qty']);
      expect(exportPreviewValue()).toBe('section,cid,name,ciid,enc,quantity\nmain,1234,ブルーアイズ,1,ab12,2');
    });

    it('[covers:import-export-dialog.column-drop-noop-guards] dragstartなしのdropと同一ピルへのdropは並び替えしない（同一ピルdropでもdraggingクラスは解除）', async () => {
      mockGenerateExportRows.mockReturnValue([makeRow()]);
      mountDialog({ initialTab: 'export', deckInfo: makeDeckInfo() });
      await nextTick();

      const before = exportPreviewValue();
      const labelsBefore = columnPillLabels();

      // (a) dragstartなしのdrop
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.column-pill', 'CID')).trigger('drop');
      await nextTick();
      expect(columnPillLabels()).toEqual(labelsBefore);
      expect(exportPreviewValue()).toBe(before);

      // (b) 同一ピルへのdrop: 並び替えしないがdraggingクラスは解除される
      const namePill = requireElementWithText<HTMLButtonElement>('.column-pill', 'Name');
      await new DOMWrapper(namePill).trigger('dragstart');
      expect(namePill.classList.contains('dragging')).toBe(true);
      await new DOMWrapper(namePill).trigger('drop');
      await nextTick();
      expect(columnPillLabels()).toEqual(labelsBefore);
      expect(exportPreviewValue()).toBe(before);
      expect(namePill.classList.contains('dragging')).toBe(false);
    });

    it('[covers:import-export-dialog.column-reset-restores-defaults] リセットボタンでカラムのON/OFFと並び順を既定（6列・全ON・既定順）へ戻す', async () => {
      mockGenerateExportRows.mockReturnValue([makeRow()]);
      mountDialog({ initialTab: 'export', deckInfo: makeDeckInfo() });
      await nextTick();

      // Name列OFF + Name ピルを先頭（Sectionの位置）へ移動
      const namePill = requireElementWithText<HTMLButtonElement>('.column-pill', 'Name');
      await new DOMWrapper(namePill).trigger('click');
      await new DOMWrapper(namePill).trigger('dragstart');
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.column-pill', 'Section')).trigger('drop');
      await nextTick();
      expect(columnPillLabels()).toEqual(['Name', 'Section', 'CID', 'CIID', 'ENC', 'Qty']);
      expect(namePill.classList.contains('active')).toBe(false);

      // リセット
      await new DOMWrapper(requireElement<HTMLButtonElement>('.column-reset-btn')).trigger('click');
      await nextTick();
      expect(columnPillLabels()).toEqual(['Section', 'Name', 'CID', 'CIID', 'ENC', 'Qty']);
      for (const label of columnPillLabels()) {
        const pill = requireElementWithText<HTMLButtonElement>('.column-pill', label);
        expect(pill.classList.contains('active'), `${label} is active`).toBe(true);
      }
      expect(exportPreviewValue()).toBe('section,name,cid,ciid,enc,quantity\nmain,ブルーアイズ,1234,1,ab12,2');
    });

    it('[covers:import-export-dialog.include-side-toggle-reflected] Side DeckピルのON/OFFはincludeSideオプションとしてプレビュー生成へ渡る', async () => {
      const deckInfo = makeDeckInfo();
      const rowsWithSide = [makeRow({ name: 'SIDE-ROW' })];
      const rowsAll = [makeRow({ name: 'ALL-ROW' })];
      mockGenerateExportRows.mockImplementation((_deckInfo, options) =>
        options?.includeSide === false ? rowsWithSide : rowsAll
      );
      mountDialog({ initialTab: 'export', deckInfo });
      await nextTick();
      expect(exportPreviewValue()).toContain('ALL-ROW');

      const sidePill = requireElementContainingText<HTMLButtonElement>('.export-tabs-row .toggle-pill', 'Side Deck');
      expect(sidePill.classList.contains('active')).toBe(true);

      await new DOMWrapper(sidePill).trigger('click');
      await nextTick();
      expect(sidePill.classList.contains('active')).toBe(false);
      expect(mockGenerateExportRows).toHaveBeenCalledWith(deckInfo, { includeSide: false });
      expect(exportPreviewValue()).toContain('SIDE-ROW');
    });
  });

  describe('ファイル名生成', () => {
    it('[covers:import-export-dialog.filename-priority-and-sanitization] ファイル名はdeckName優先（禁止文字_置換+trim・空ならdeck）・deckNameなしならdeck-{dno}・両方なしならdeck', async () => {
      // (a) 禁止文字は'_'置換
      mountDialog({ deckName: 'a<b>c', includeTimestamp: false });
      await nextTick();
      expect(filenameValue()).toBe('a_b_c');
      unmountLastDialog();

      // (b) 空白のみはtrim結果空のため'deck'
      mountDialog({ deckName: '   ', includeTimestamp: false });
      await nextTick();
      expect(filenameValue()).toBe('deck');
      unmountLastDialog();

      // (c) deckNameなしならdeck-{dno}
      mountDialog({ deckName: '', dno: '12', includeTimestamp: false });
      await nextTick();
      expect(filenameValue()).toBe('deck-12');
      unmountLastDialog();

      // (d) 両方なしなら'deck'
      mountDialog({ deckName: '', dno: '', includeTimestamp: false });
      await nextTick();
      expect(filenameValue()).toBe('deck');
    });

    it('[covers:import-export-dialog.filename-timestamp-suffix] includeTimestamp=true（既定）の場合はファイル名末尾に-YYYYMMDD-HHmm形式のタイムスタンプを付与する', async () => {
      // 2026-09-13 09:05（ローカル表記で固定。generateTimestampはローカル時刻成分を使う）
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 13, 9, 5));

      mountDialog({ deckName: 'mydeck' });
      await nextTick();
      expect(filenameValue()).toBe('mydeck-20260913-0905');
    });

    it('[covers:import-export-dialog.filename-updates-on-prop-change] filenameBaseはdno/deckName/includeTimestamp変更時に再生成される（手編集は上書きされる）', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 13, 9, 5));

      const wrapper = mountDialog({ initialTab: 'export', deckName: 'A', includeTimestamp: false });
      await nextTick();
      expect(filenameValue()).toBe('A');

      // 手編集してもprops変更時に上書きされる
      await new DOMWrapper(requireElement<HTMLInputElement>('#filename-input')).setValue('EDITED');
      expect(filenameValue()).toBe('EDITED');

      await wrapper.setProps({ deckName: 'B' });
      await nextTick();
      expect(filenameValue()).toBe('B');

      await wrapper.setProps({ includeTimestamp: true });
      await nextTick();
      expect(filenameValue()).toBe('B-20260913-0905');
    });
  });

  describe('Export実行', () => {
    it('[covers:import-export-dialog.export-csv-delegates-download-file] CSV DownloadはbuildCustomCsv結果をdownloadFileへ<filename>.csv・text/csvで委譲しexported/closeする（filename空はdeckにフォールバック）', async () => {
      mockGenerateExportRows.mockReturnValue([makeRow()]);
      const wrapper = mountDialog({ initialTab: 'export', deckInfo: makeDeckInfo(), deckName: 'mydeck', includeTimestamp: false });
      await nextTick();

      await new DOMWrapper(requireElement<HTMLButtonElement>('.btn-export')).trigger('click');
      await flushImport();

      // ダウンロード内容はプレビューと同一のCSV文字列
      expect(mockDownloadFile).toHaveBeenCalledTimes(1);
      expect(mockDownloadFile).toHaveBeenCalledWith(exportPreviewValue(), 'mydeck.csv', 'text/csv');
      expect(mockDownloadDeckAsTXT).not.toHaveBeenCalled();
      expect(wrapper.emitted<string[][]>('exported')).toEqual([['csv']]);
      expect(wrapper.emitted('close')).toHaveLength(1);

      // filenameBase空（ユーザーが入力欄を空にした場合）は'deck'にフォールバック。
      // 1つ目のダイアログがDOMに残っていると #filename-input/.btn-export の取得が
      // 1つ目に向いてしまうため、先にunmount（帳簿からも除去・bodyもクリア）してからmountする
      unmountLastDialog();
      const wrapper2 = mountDialog({ initialTab: 'export', deckInfo: makeDeckInfo(), deckName: 'mydeck', includeTimestamp: false });
      await nextTick();
      await new DOMWrapper(requireElement<HTMLInputElement>('#filename-input')).setValue('');
      await new DOMWrapper(requireElement<HTMLButtonElement>('.btn-export')).trigger('click');
      await flushImport();
      expect(mockDownloadFile).toHaveBeenCalledWith(exportPreviewValue(), 'deck.csv', 'text/csv');
    });

    it('[covers:import-export-dialog.export-txt-delegates-download-deck-as-txt] TXT DownloadはdownloadDeckAsTXTへdeckInfo・<filename>.txt・options（includeSide現在値）を委譲する', async () => {
      const deckInfo = makeDeckInfo();
      const wrapper = mountDialog({ initialTab: 'export', deckInfo, deckName: 'mydeck', includeTimestamp: false });
      await nextTick();

      // TXT形式へ切替
      await new DOMWrapper(requireElementWithText<HTMLButtonElement>('.sub-tabs .sub-tab-btn', 'TXT')).trigger('click');
      await nextTick();

      // (a) 既定（Side Deck ON）でDownload
      await new DOMWrapper(requireElement<HTMLButtonElement>('.btn-export')).trigger('click');
      await flushImport();
      expect(mockDownloadDeckAsTXT).toHaveBeenCalledTimes(1);
      expect(mockDownloadDeckAsTXT).toHaveBeenCalledWith(deckInfo, 'mydeck.txt', { includeSide: true });
      expect(mockDownloadFile).not.toHaveBeenCalled();
      expect(wrapper.emitted<string[][]>('exported')).toEqual([['txt']]);
      expect(wrapper.emitted('close')).toHaveLength(1);

      // (b) Side Deck OFFにしてDownload
      await new DOMWrapper(requireElementContainingText<HTMLButtonElement>('.export-tabs-row .toggle-pill', 'Side Deck')).trigger('click');
      await nextTick();
      await new DOMWrapper(requireElement<HTMLButtonElement>('.btn-export')).trigger('click');
      await flushImport();
      expect(mockDownloadDeckAsTXT).toHaveBeenCalledTimes(2);
      expect(mockDownloadDeckAsTXT).toHaveBeenLastCalledWith(deckInfo, 'mydeck.txt', { includeSide: false });
      expect(wrapper.emitted<string[][]>('exported')).toEqual([['txt'], ['txt']]);
      expect(wrapper.emitted('close')).toHaveLength(2);
      expect(mockDownloadFile).not.toHaveBeenCalled();
    });

    it('[covers:import-export-dialog.enter-key-on-filename-triggers-export] ファイル名入力欄でのEnterキーはDownloadボタンと同じhandleExportを実行する', async () => {
      mockGenerateExportRows.mockReturnValue([makeRow()]);
      const wrapper = mountDialog({ initialTab: 'export', deckInfo: makeDeckInfo(), deckName: 'mydeck', includeTimestamp: false });
      await nextTick();

      await new DOMWrapper(requireElement<HTMLInputElement>('#filename-input')).trigger('keyup', { key: 'Enter' });
      await flushImport();

      expect(mockDownloadFile).toHaveBeenCalledTimes(1);
      expect(mockDownloadFile).toHaveBeenCalledWith(exportPreviewValue(), 'mydeck.csv', 'text/csv');
      expect(wrapper.emitted<string[][]>('exported')).toEqual([['csv']]);
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });
});
