/**
 * テスト用UIのエントリーポイント
 *
 * 特定URL（#/ytomo/test）にアクセスした際に、
 * ページ全体を書き換えてテスト用UIを表示する
 */

// Import実装済み関数
import { getCgid, getYtkn } from '../session/session';
import { searchCardsByName } from '@/api/card-search';
import { createNewDeck, duplicateDeck, deleteDeck, saveDeck } from '@/api/deck-operations';
import { detectCardType } from '../card/detector';
import type { CardType } from '@/types/card';

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
          <button id="btn-get-ytkn">ytkn取得</button>
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
          <button id="btn-duplicate-deck">デッキ複製 (dno=4)</button>
          <button id="btn-delete-deck">デッキ削除 (dno=4)</button>
        </div>
        <div class="test-result" id="result-deck-ops"></div>
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
        <h2>カードタイプ判定テスト</h2>
        <div class="test-controls">
          <button id="btn-test-detector">判定テスト実行</button>
        </div>
        <div class="test-result" id="result-detector"></div>
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
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        flex: 1;
        min-width: 150px;
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
  document.getElementById('btn-get-ytkn')?.addEventListener('click', handleGetYtkn);

  // カード検索
  document.getElementById('btn-search-cards')?.addEventListener('click', handleSearchCards);

  // デッキ操作
  document.getElementById('btn-create-deck')?.addEventListener('click', handleCreateDeck);
  document.getElementById('btn-duplicate-deck')?.addEventListener('click', handleDuplicateDeck);
  document.getElementById('btn-delete-deck')?.addEventListener('click', handleDeleteDeck);

  // デッキ保存
  document.getElementById('btn-save-deck')?.addEventListener('click', handleSaveDeck);

  // カードタイプ判定テスト
  document.getElementById('btn-test-detector')?.addEventListener('click', handleTestDetector);
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
    const cgid = getCgid();
    if (cgid) {
      displayResult('result-session', { cgid, length: cgid.length });
    } else {
      displayResult('result-session', { error: 'cgid not found' }, true);
    }
  } catch (error) {
    displayResult('result-session', { error: String(error) }, true);
  }
}

async function handleGetYtkn(): Promise<void> {
  try {
    const ytkn = getYtkn();
    if (ytkn) {
      displayResult('result-session', { ytkn, length: ytkn.length });
    } else {
      displayResult('result-session', { error: 'ytkn not found' }, true);
    }
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
    const cgid = getCgid();
    if (!cgid) {
      displayResult('result-deck-ops', { error: 'cgid not found' }, true);
      return;
    }

    displayResult('result-deck-ops', { message: 'デッキ作成中...' });

    const newDno = await createNewDeck(cgid);

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
    const cgid = getCgid();
    if (!cgid) {
      displayResult('result-deck-ops', { error: 'cgid not found' }, true);
      return;
    }

    displayResult('result-deck-ops', { message: 'デッキ複製中...' });

    const newDno = await duplicateDeck(cgid, 4);

    displayResult('result-deck-ops', {
      message: 'デッキ複製完了',
      sourceDno: 4,
      newDno
    });
  } catch (error) {
    displayResult('result-deck-ops', { error: String(error) }, true);
  }
}

async function handleDeleteDeck(): Promise<void> {
  try {
    const cgid = getCgid();
    const ytkn = getYtkn();

    if (!cgid) {
      displayResult('result-deck-ops', { error: 'cgid not found' }, true);
      return;
    }
    if (!ytkn) {
      displayResult('result-deck-ops', { error: 'ytkn not found' }, true);
      return;
    }

    displayResult('result-deck-ops', { message: 'デッキ削除中...' });

    const result = await deleteDeck(cgid, 4, ytkn);

    displayResult('result-deck-ops', {
      message: 'デッキ削除完了',
      dno: 4,
      result
    }, !result.success);
  } catch (error) {
    displayResult('result-deck-ops', { error: String(error) }, true);
  }
}

async function handleSaveDeck(): Promise<void> {
  try {
    const cgid = getCgid();
    const ytkn = getYtkn();

    if (!cgid) {
      displayResult('result-save', { error: 'cgid not found' }, true);
      return;
    }
    if (!ytkn) {
      displayResult('result-save', { error: 'ytkn not found' }, true);
      return;
    }

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
          name: 'ブラック・マジシャン',
          cardId: '4335',
          cardType: 'モンスター' as CardType,
          imageId: '1',
          quantity: 1
        }
      ],
      extraDeck: [],
      sideDeck: []
    };

    displayResult('result-save', { message: 'デッキ保存中...' });

    const result = await saveDeck(cgid, dno, deckData, ytkn);

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

async function handleTestDetector(): Promise<void> {
  try {
    // テスト用のHTML要素を作成
    const tests = [
      {
        name: 'モンスター（光属性）',
        html: '<div class="box_card_attribute"><img src="/yugiohdb/icon/attribute_icon_light.png"></div>'
      },
      {
        name: '魔法',
        html: '<div class="box_card_attribute"><img src="/yugiohdb/icon/attribute_icon_spell.png"></div>'
      },
      {
        name: '罠',
        html: '<div class="box_card_attribute"><img src="/yugiohdb/icon/attribute_icon_trap.png"></div>'
      }
    ];

    const results = tests.map(test => {
      const container = document.createElement('div');
      container.innerHTML = test.html;
      const element = container.firstElementChild as HTMLElement;
      const detectedType = detectCardType(element);

      return {
        test: test.name,
        detected: detectedType,
        success: detectedType !== null
      };
    });

    displayResult('result-detector', {
      message: 'カードタイプ判定テスト完了',
      results
    });
  } catch (error) {
    displayResult('result-detector', { error: String(error) }, true);
  }
}

// Content Script起動時に実行
watchUrlChanges();
