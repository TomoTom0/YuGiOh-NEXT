/**
 * テスト用UIのエントリーポイント
 *
 * 特定URL（#/ytomo/test）にアクセスした際に、
 * ページ全体を書き換えてテスト用UIを表示する
 */

// Import実装済み関数
import { sessionManager } from '../session/session';
import { searchCardsByName, getCardDetail } from '@/api/card-search';
import { getDeckDetail } from '@/api/deck-operations';
import { getCardFAQList, getFAQDetail } from '@/api/card-faq';
import { downloadDeckRecipeImage } from '../deck-recipe';
import type { CardType } from '@/types/card';
import type { ColorVariant } from '@/types/deck-recipe-image';

const TEST_URL_HASH = '#/ytomo/test';

// テストUIが既に読み込まれているかどうかのフラグ
let isTestUILoaded = false;

/**
 * 現在のURLがテスト用URLかどうかをチェック
 */
function isTestUrl(): boolean {
  return window.location.hash === TEST_URL_HASH;
}

/**
 * URLの変更を監視
 */
function watchUrlChanges(): void {
  // DOMが読み込まれてから実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isTestUrl() && !isTestUILoaded) {
        loadTestUI();
      }
    });
  } else {
    // すでに読み込まれている場合
    if (isTestUrl() && !isTestUILoaded) {
      loadTestUI();
    }
  }

  // hashchangeイベントを監視
  window.addEventListener('hashchange', () => {
    if (isTestUrl() && !isTestUILoaded) {
      loadTestUI();
    } else if (!isTestUrl() && isTestUILoaded) {
      // テストURL以外に移動した場合はフラグをリセット
      isTestUILoaded = false;
    }
  });
}

/**
 * テスト用UIを読み込んで表示
 */
function loadTestUI(): void {
  if (isTestUILoaded) {
    console.log('Test UI already loaded, skipping...');
    return;
  }

  console.log('Loading test UI...');

  // div#bg要素を取得
  const bgElement = document.getElementById('bg');
  if (!bgElement) {
    console.error('div#bg not found, waiting...');
    // 少し待ってから再試行
    setTimeout(loadTestUI, 100);
    return;
  }

  // div#bgの内容だけを書き換え
  bgElement.innerHTML = getTestUITemplate();

  // イベントハンドラを登録
  attachEventHandlers();

  // フラグを設定
  isTestUILoaded = true;

  console.log('Test UI loaded successfully');
}

/**
 * テスト用UIのHTMLテンプレートを取得
 */
function getTestUITemplate(): string {
  return `
    <div id="test-ui-container">
      <h1>遊戯王デッキヘルパー - 機能テスト</h1>

      <div class="test-section">
        <h2>セッション情報</h2>
        <div class="test-controls">
          <button id="btn-get-cgid">cgid取得</button>
        </div>
        <div class="test-result" id="result-session"></div>
      </div>

      <div class="test-section">
        <h2>カード検索</h2>
        <div class="test-controls">
          <input type="text" id="input-card-name" placeholder="カード名を入力" value="ブラック・マジシャン">
          <select id="select-card-type">
            <option value="">すべて</option>
            <option value="モンスター">モンスター</option>
            <option value="魔法">魔法</option>
            <option value="罠">罠</option>
          </select>
          <button id="btn-search-cards">検索</button>
        </div>
        <div class="test-result" id="result-search"></div>
      </div>

      <div class="test-section">
        <h2>デッキ操作</h2>
        <div class="test-controls">
          <button id="btn-create-deck">新規デッキ作成</button>
        </div>
        <div class="test-result" id="result-deck-ops"></div>
      </div>

      <div class="test-section">
        <h2>デッキ複製</h2>
        <div class="test-controls">
          <input type="number" id="input-duplicate-dno" placeholder="複製元デッキ番号" value="4">
          <button id="btn-duplicate-deck">複製</button>
        </div>
        <div class="test-result" id="result-duplicate"></div>
      </div>

      <div class="test-section">
        <h2>デッキ削除</h2>
        <div class="test-controls">
          <input type="number" id="input-delete-dno" placeholder="削除デッキ番号" value="4">
          <button id="btn-delete-deck">削除</button>
        </div>
        <div class="test-result" id="result-delete"></div>
      </div>

      <div class="test-section">
        <h2>デッキ保存</h2>
        <div class="test-controls">
          <input type="number" id="input-deck-no" placeholder="デッキ番号" value="4">
          <input type="text" id="input-deck-name" placeholder="デッキ名" value="テストデッキ">
          <button id="btn-save-deck">保存</button>
        </div>
        <div class="test-result" id="result-save"></div>
      </div>

      <div class="test-section">
        <h2>デッキレシピ画像作成</h2>
        <div class="test-controls">
          <input type="number" id="input-recipe-dno" placeholder="デッキ番号" value="4">
          <div class="color-selection">
            <label>カラー:</label>
            <label><input type="radio" name="recipe-color" value="red" checked> 赤</label>
            <label><input type="radio" name="recipe-color" value="blue"> 青</label>
          </div>
          <label><input type="checkbox" id="checkbox-include-qr" checked> QRコード</label>
          <input type="number" id="input-scale" placeholder="スケール" value="2" min="1" max="4" step="0.5">
          <button id="btn-create-recipe-image">画像作成＆ダウンロード</button>
        </div>
        <div class="test-result" id="result-recipe"></div>
      </div>

      <div class="test-section">
        <h2>デッキ個別取得</h2>
        <div class="test-controls">
          <input type="number" id="input-get-deck-dno" placeholder="デッキ番号" value="4">
          <button id="btn-get-deck">取得</button>
        </div>
        <div class="test-result" id="result-get-deck"></div>
      </div>

      <div class="test-section">
        <h2>マイデッキ一覧取得</h2>
        <div class="test-controls">
          <button id="btn-get-deck-list">取得</button>
        </div>
        <div class="test-result" id="result-deck-list"></div>
      </div>

      <div class="test-section">
        <h2>カード詳細情報取得</h2>
        <div class="test-controls">
          <input type="text" id="input-card-detail-id" placeholder="カードID" value="4335">
          <button id="btn-get-card-detail">取得</button>
        </div>
        <div class="test-result" id="result-card-detail"></div>
      </div>

      <div class="test-section">
        <h2>カードQA一覧取得</h2>
        <div class="test-controls">
          <input type="text" id="input-faq-list-cid" placeholder="カードID" value="4335">
          <button id="btn-get-faq-list">取得</button>
        </div>
        <div class="test-result" id="result-faq-list"></div>
      </div>

      <div class="test-section">
        <h2>個別QA詳細取得</h2>
        <div class="test-controls">
          <input type="text" id="input-faq-detail-fid" placeholder="FAQ ID" value="115">
          <button id="btn-get-faq-detail">取得</button>
        </div>
        <div class="test-result" id="result-faq-detail"></div>
      </div>
    </div>

    <style>
      #test-ui-container {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        max-width: 1200px;
        margin: 20px auto;
        padding: 20px;
        background: #f5f5f5;
      }

      h1 {
        color: #333;
        border-bottom: 3px solid #4CAF50;
        padding-bottom: 10px;
      }

      h2 {
        color: #555;
        margin-top: 30px;
        font-size: 1.3em;
      }

      .test-section {
        background: white;
        padding: 20px;
        margin: 20px 0;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      .test-controls {
        margin: 15px 0;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      button {
        padding: 10px 20px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.3s;
      }

      button:hover {
        background: #45a049;
      }

      button:active {
        background: #3d8b40;
      }

      input[type="text"],
      input[type="number"],
      select {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        max-width: 300px;
        min-width: 150px;
      }

      .color-selection {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: #f0f0f0;
        border-radius: 4px;
      }

      .color-selection label {
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
      }

      input[type="checkbox"] {
        cursor: pointer;
        width: 18px;
        height: 18px;
      }

      input[type="radio"] {
        cursor: pointer;
        width: 18px;
        height: 18px;
      }

      .test-result {
        margin-top: 15px;
        padding: 15px;
        background: #f9f9f9;
        border-left: 4px solid #4CAF50;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        white-space: pre-wrap;
        max-height: 400px;
        overflow-y: auto;
      }

      .test-result:empty {
        display: none;
      }

      .error {
        border-left-color: #f44336;
        background: #ffebee;
        color: #c62828;
      }

      .success {
        border-left-color: #4CAF50;
        background: #e8f5e9;
        color: #2e7d32;
      }
    </style>
  `;
}

/**
 * イベントハンドラを登録
 */
function attachEventHandlers(): void {
  // セッション情報
  document.getElementById('btn-get-cgid')?.addEventListener('click', handleGetCgid);

  // カード検索
  document.getElementById('btn-search-cards')?.addEventListener('click', handleSearchCards);

  // デッキ操作
  document.getElementById('btn-create-deck')?.addEventListener('click', handleCreateDeck);
  document.getElementById('btn-duplicate-deck')?.addEventListener('click', handleDuplicateDeck);
  document.getElementById('btn-delete-deck')?.addEventListener('click', handleDeleteDeck);

  // デッキ保存
  document.getElementById('btn-save-deck')?.addEventListener('click', handleSaveDeck);

  // デッキレシピ画像作成
  document.getElementById('btn-create-recipe-image')?.addEventListener('click', handleCreateRecipeImage);

  // デッキ個別取得
  document.getElementById('btn-get-deck')?.addEventListener('click', handleGetDeck);

  // マイデッキ一覧取得
  document.getElementById('btn-get-deck-list')?.addEventListener('click', handleGetDeckList);

  // カード詳細情報取得
  document.getElementById('btn-get-card-detail')?.addEventListener('click', handleGetCardDetail);

  // カードQA一覧取得
  document.getElementById('btn-get-faq-list')?.addEventListener('click', handleGetFAQList);

  // 個別QA詳細取得
  document.getElementById('btn-get-faq-detail')?.addEventListener('click', handleGetFAQDetail);
}

/**
 * 結果を表示
 */
function displayResult(elementId: string, result: unknown, isError = false): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.className = `test-result ${isError ? 'error' : 'success'}`;
  element.textContent = JSON.stringify(result, null, 2);
}

/**
 * 以下、各ハンドラ関数
 */

async function handleGetCgid(): Promise<void> {
  try {
    displayResult('result-session', { message: 'cgid取得中...' });
    const cgid = await sessionManager.getCgid();
    displayResult('result-session', { cgid, length: cgid.length });
  } catch (error) {
    displayResult('result-session', { error: String(error) }, true);
  }
}

async function handleSearchCards(): Promise<void> {
  try {
    const input = document.getElementById('input-card-name') as HTMLInputElement;
    const select = document.getElementById('select-card-type') as HTMLSelectElement;

    const keyword = input.value;
    const cardType = select.value as CardType | '';

    displayResult('result-search', { message: '検索中...' });

    const results = await searchCardsByName(keyword, cardType || undefined);

    displayResult('result-search', {
      keyword,
      cardType: cardType || 'すべて',
      count: results.length,
      results: results.slice(0, 10) // 最初の10件のみ表示
    });
  } catch (error) {
    displayResult('result-search', { error: String(error) }, true);
  }
}

async function handleCreateDeck(): Promise<void> {
  try {
    displayResult('result-deck-ops', { message: 'デッキ作成中...' });
    const newDno = await sessionManager.createDeck();
    displayResult('result-deck-ops', {
      message: 'デッキ作成完了',
      newDno
    });
  } catch (error) {
    displayResult('result-deck-ops', { error: String(error) }, true);
  }
}

async function handleDuplicateDeck(): Promise<void> {
  try {
    const dnoInput = document.getElementById('input-duplicate-dno') as HTMLInputElement;
    const sourceDno = parseInt(dnoInput.value, 10);

    displayResult('result-duplicate', { message: 'デッキ複製中...', sourceDno });
    const newDno = await sessionManager.duplicateDeck(sourceDno);
    displayResult('result-duplicate', {
      message: 'デッキ複製完了',
      sourceDno,
      newDno
    });
  } catch (error) {
    displayResult('result-duplicate', { error: String(error) }, true);
  }
}

async function handleDeleteDeck(): Promise<void> {
  try {
    const dnoInput = document.getElementById('input-delete-dno') as HTMLInputElement;
    const dno = parseInt(dnoInput.value, 10);

    displayResult('result-delete', { message: 'デッキ削除中...', dno });
    const result = await sessionManager.deleteDeck(dno);
    displayResult('result-delete', {
      message: 'デッキ削除完了',
      dno,
      result
    }, !result.success);
  } catch (error) {
    displayResult('result-delete', { error: String(error) }, true);
  }
}

async function handleSaveDeck(): Promise<void> {
  try {
    const dnoInput = document.getElementById('input-deck-no') as HTMLInputElement;
    const nameInput = document.getElementById('input-deck-name') as HTMLInputElement;

    const dno = parseInt(dnoInput.value, 10);
    const name = nameInput.value;

    // テスト用のデッキデータ
    const deckData = {
      dno,
      name,
      mainDeck: [
        {
          card: {
            name: 'ブラック・マジシャン',
            cardId: '4335',
            imageId: '1',
            cardType: 'monster' as const,
            attribute: 'dark' as const,
            levelType: 'level' as const,
            levelValue: 7,
            race: 'spellcaster' as const,
            types: ['normal' as const],
            isExtraDeck: false
          },
          quantity: 1
        }
      ],
      extraDeck: [],
      sideDeck: [],
      category: [],
      tags: [],
      comment: "",
      deckCode: ""
    };

    displayResult('result-save', { message: 'デッキ保存中...' });
    const result = await sessionManager.saveDeck(dno, deckData);
    displayResult('result-save', {
      message: 'デッキ保存完了',
      dno,
      name,
      result
    }, !result.success);
  } catch (error) {
    displayResult('result-save', { error: String(error) }, true);
  }
}


async function handleCreateRecipeImage(): Promise<void> {
  try {
    // 入力値を取得
    const dnoInput = document.getElementById('input-recipe-dno') as HTMLInputElement;
    const dno = dnoInput.value;

    // カラー選択を取得
    const colorRadio = document.querySelector('input[name="recipe-color"]:checked') as HTMLInputElement;
    const color = (colorRadio?.value || 'red') as ColorVariant;

    // QRコード有無を取得
    const qrCheckbox = document.getElementById('checkbox-include-qr') as HTMLInputElement;
    const includeQR = qrCheckbox?.checked ?? true;

    // スケールを取得
    const scaleInput = document.getElementById('input-scale') as HTMLInputElement;
    const scale = parseFloat(scaleInput.value) || 2;

    displayResult('result-recipe', {
      message: 'デッキレシピ画像作成中...',
      dno,
      color,
      includeQR,
      scale
    });

    // 画像作成とダウンロード
    await downloadDeckRecipeImage({
      dno,
      color,
      includeQR,
      scale
    });

    displayResult('result-recipe', {
      message: 'デッキレシピ画像作成完了！ダウンロードが開始されました。',
      dno,
      color,
      includeQR,
      scale
    });
  } catch (error) {
    displayResult('result-recipe', {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, true);
  }
}

async function handleGetDeck(): Promise<void> {
  try {
    const dnoInput = document.getElementById('input-get-deck-dno') as HTMLInputElement;
    const dno = parseInt(dnoInput.value, 10);

    displayResult('result-get-deck', { message: 'デッキ取得中...' });

    const cgid = await sessionManager.getCgid();
    const deckInfo = await getDeckDetail(dno, cgid);

    displayResult('result-get-deck', {
      message: 'デッキ取得完了',
      dno,
      deckInfo
    }, !deckInfo);
  } catch (error) {
    displayResult('result-get-deck', { error: String(error) }, true);
  }
}

async function handleGetDeckList(): Promise<void> {
  try {
    displayResult('result-deck-list', { message: 'デッキ一覧取得中...' });

    const deckList = await sessionManager.getDeckList();

    displayResult('result-deck-list', {
      message: 'デッキ一覧取得完了',
      count: deckList.length,
      deckList
    });
  } catch (error) {
    displayResult('result-deck-list', { error: String(error) }, true);
  }
}

async function handleGetCardDetail(): Promise<void> {
  try {
    const cardIdInput = document.getElementById('input-card-detail-id') as HTMLInputElement;
    const cardId = cardIdInput.value;

    displayResult('result-card-detail', { message: 'カード詳細取得中...' });

    const cardDetail = await getCardDetail(cardId);

    displayResult('result-card-detail', {
      message: 'カード詳細取得完了',
      cardId,
      cardDetail
    }, !cardDetail);
  } catch (error) {
    displayResult('result-card-detail', { error: String(error) }, true);
  }
}

async function handleGetFAQList(): Promise<void> {
  try {
    const cardIdInput = document.getElementById('input-faq-list-cid') as HTMLInputElement;
    const cardId = cardIdInput.value;

    displayResult('result-faq-list', { message: 'カードQA一覧取得中...' });

    const faqList = await getCardFAQList(cardId);

    displayResult('result-faq-list', {
      message: 'カードQA一覧取得完了',
      cardId,
      faqList
    }, !faqList);
  } catch (error) {
    displayResult('result-faq-list', { error: String(error) }, true);
  }
}

async function handleGetFAQDetail(): Promise<void> {
  try {
    const faqIdInput = document.getElementById('input-faq-detail-fid') as HTMLInputElement;
    const faqId = faqIdInput.value;

    displayResult('result-faq-detail', { message: '個別QA詳細取得中...' });

    const faqDetail = await getFAQDetail(faqId);

    displayResult('result-faq-detail', {
      message: '個別QA詳細取得完了',
      faqId,
      faqDetail
    }, !faqDetail);
  } catch (error) {
    displayResult('result-faq-detail', { error: String(error) }, true);
  }
}

// Content Script起動時に実行
watchUrlChanges();
