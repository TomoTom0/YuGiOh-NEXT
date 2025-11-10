# 遊戯王DB 調査手法ガイド

**最終更新**: 2025-10-30

このドキュメントは、遊戯王公式データベースの任意のページや機能を調査するための汎用的な手法をまとめたものです。

## 目次

1. [調査環境のセットアップ](#調査環境のセットアップ)
2. [基本的な調査フロー](#基本的な調査フロー)
3. [調査手法の種類](#調査手法の種類)
4. [データ抽出のパターン](#データ抽出のパターン)
5. [テストと検証](#テストと検証)
6. [トラブルシューティング](#トラブルシューティング)

---

## 調査環境のセットアップ

### 1. Chrome Remote Debugging の起動

標準化されたセットアップスクリプトを使用：

```bash
# Chrome起動（リモートデバッグモード）
./scripts/debug/setup/start-chrome.sh

# 停止
./scripts/debug/setup/stop-chrome.sh
```

**重要な設定**:
- デバッグポート: `9222`
- プロファイルディレクトリ: `.chrome_cache`（永続的なログイン状態を保持）
- WebSocket URL: `.chrome_playwright_ws`に保存

### 2. WebSocket接続の確立

すべての調査スクリプトで使用する基本テンプレート：

```javascript
const WebSocket = require('ws');
const fs = require('fs');

// WebSocket URLを読み込み
const wsUrl = fs.readFileSync('.chrome_playwright_ws', 'utf8').trim();
const ws = new WebSocket(wsUrl);

let messageId = 1;

function sendCommand(method, params = {}) {
  return new Promise((resolve) => {
    const id = messageId++;
    const handler = (data) => {
      const message = JSON.parse(data);
      if (message.id === id) {
        ws.off('message', handler);
        resolve(message.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.on('open', async () => {
  try {
    // ここに調査ロジックを記述

    ws.close();
  } catch (error) {
    console.error('Error:', error);
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### 3. 必要なパッケージ

```bash
npm install ws
```

---

## 基本的な調査フロー

### フェーズ1: ページ構造の把握

1. **ページへの移動**
```javascript
await sendCommand('Page.navigate', {
  url: 'https://www.db.yugioh-card.com/yugiohdb/調査対象ページ.action?request_locale=ja'
});
await new Promise(resolve => setTimeout(resolve, 2000)); // ページロード待機
```

2. **フォーム要素の特定**
```javascript
const formInfo = await sendCommand('Runtime.evaluate', {
  expression: `
    const forms = document.querySelectorAll('form');
    const result = [];
    forms.forEach((form, idx) => {
      result.push({
        index: idx,
        id: form.id,
        name: form.name,
        action: form.action,
        method: form.method
      });
    });
    result;
  `,
  returnByValue: true
});
```

3. **入力フィールドの列挙**
```javascript
const fields = await sendCommand('Runtime.evaluate', {
  expression: `
    const inputs = document.querySelectorAll('input, select, textarea');
    const result = [];
    inputs.forEach(input => {
      result.push({
        tag: input.tagName,
        type: input.type,
        name: input.name,
        id: input.id,
        value: input.value,
        className: input.className
      });
    });
    result;
  `,
  returnByValue: true
});
```

### フェーズ2: ラベルとマッピングの取得

1. **選択肢の抽出（select要素）**
```javascript
const selectOptions = await sendCommand('Runtime.evaluate', {
  expression: `
    const selects = document.querySelectorAll('select[name="パラメータ名"]');
    const result = [];
    selects.forEach(select => {
      const options = Array.from(select.options).map(opt => ({
        value: opt.value,
        text: opt.text
      }));
      result.push({ selectName: select.name, options });
    });
    result;
  `,
  returnByValue: true
});
```

2. **チェックボックス/ラジオボタンのラベル抽出**
```javascript
const checkboxLabels = await sendCommand('Runtime.evaluate', {
  expression: `
    const result = {};
    ['パラメータ名1', 'パラメータ名2'].forEach(name => {
      const inputs = document.querySelectorAll(\`input[name="\${name}"]\`);
      result[name] = [];

      inputs.forEach(input => {
        let label = '';

        // 方法1: label要素から取得
        if (input.id) {
          const labelEl = document.querySelector(\`label[for="\${input.id}"]\`);
          if (labelEl) label = labelEl.innerText.trim();
        }

        // 方法2: 親label要素から取得
        if (!label) {
          const parentLabel = input.closest('label');
          if (parentLabel) label = parentLabel.innerText.trim();
        }

        // 方法3: 隣接要素から取得
        if (!label && input.nextElementSibling) {
          label = (input.nextElementSibling.innerText ||
                   input.nextElementSibling.textContent || '').trim();
        }

        result[name].push({
          value: input.value,
          label: label,
          id: input.id,
          type: input.type
        });
      });
    });
    result;
  `,
  returnByValue: true
});
```

### フェーズ3: 実際の動作テスト

1. **パラメータ設定とフォーム送信**
```javascript
// 値を設定
await sendCommand('Runtime.evaluate', {
  expression: `
    // テキスト入力
    document.querySelector('input[name="keyword"]').value = 'テスト';

    // セレクトボックス
    document.querySelector('select[name="sort"]').value = '1';

    // チェックボックス
    document.querySelector('input[name="attr"][value="11"]').checked = true;
    document.querySelector('input[name="attr"][value="12"]').checked = true;

    // ラジオボタン
    document.querySelector('input[name="othercon"][value="1"]').checked = true;
  `
});

// フォームを送信
await sendCommand('Runtime.evaluate', {
  expression: `
    const form = document.getElementById('form_search');
    if (form) form.submit();
  `
});

await new Promise(resolve => setTimeout(resolve, 3000)); // 遷移待機

// 結果URLを取得
const urlResult = await sendCommand('Runtime.evaluate', {
  expression: 'window.location.href',
  returnByValue: true
});

console.log('Result URL:', urlResult.result.value);
```

2. **結果ページの解析**
```javascript
// 結果数の取得
const resultCount = await sendCommand('Runtime.evaluate', {
  expression: `
    const countText = document.querySelector('.result_count')?.textContent || '';
    const match = countText.match(/全(\\d+)件/);
    match ? parseInt(match[1]) : 0;
  `,
  returnByValue: true
});

// 結果リストの取得
const resultItems = await sendCommand('Runtime.evaluate', {
  expression: `
    const items = document.querySelectorAll('.result_item');
    Array.from(items).map(item => ({
      title: item.querySelector('.title')?.textContent.trim() || '',
      id: item.dataset.id || '',
      url: item.querySelector('a')?.href || ''
    }));
  `,
  returnByValue: true
});
```

---

## 調査手法の種類

### 1. 静的HTML解析

**用途**: ページ構造、フォーム要素、デフォルト値の把握

**手法**:
- `document.querySelectorAll()`でDOM要素を取得
- 属性値（name, id, class, value）を収集
- 構造化データ（JSON）として保存

**例**: 検索フォームの140フィールドの列挙

### 2. 動的操作テスト

**用途**: 実際のパラメータ動作、URLパラメータの確認

**手法**:
- 値を設定してフォームをsubmit
- 遷移後のURLを記録
- パラメータと結果の関係を確認

**例**:
- 属性検索のURLパラメータ確認
- 複数選択パラメータの動作確認
- リンクマーカーの方向マッピング

### 3. イベントリスナー調査

**用途**: JavaScriptイベントハンドラの特定

**手法**:
```javascript
const eventListeners = await sendCommand('Runtime.evaluate', {
  expression: `
    const element = document.getElementById('target');
    getEventListeners(element); // Chrome DevTools専用API
  `,
  returnByValue: true
});
```

### 4. Network監視

**用途**: AJAX通信、API呼び出しの記録

**手法**:
```javascript
// Networkイベントの有効化
await sendCommand('Network.enable');

// リクエスト監視
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.method === 'Network.requestWillBeSent') {
    console.log('Request:', message.params.request);
  }
  if (message.method === 'Network.responseReceived') {
    console.log('Response:', message.params.response);
  }
});
```

### 5. JavaScript関数の実行

**用途**: ページ内の関数を直接呼び出し

**手法**:
```javascript
const result = await sendCommand('Runtime.evaluate', {
  expression: `
    // ページ内の関数を呼び出し
    if (typeof Regist === 'function') {
      Regist();
      { success: true };
    } else {
      { success: false, error: 'Function not found' };
    }
  `,
  awaitPromise: true,
  returnByValue: true
});
```

---

## データ抽出のパターン

### パターン1: 全フィールド列挙

```javascript
const allFields = await sendCommand('Runtime.evaluate', {
  expression: `
    const fields = document.querySelectorAll('input, select, textarea');
    Array.from(fields).map(field => ({
      tag: field.tagName,
      type: field.type || '',
      name: field.name || '',
      id: field.id || '',
      value: field.value || '',
      checked: field.checked || false,
      className: field.className || ''
    }));
  `,
  returnByValue: true
});

fs.writeFileSync('tmp/all-fields.json', JSON.stringify(allFields.result.value, null, 2));
```

### パターン2: 選択肢とラベルのマッピング

```javascript
const mappings = await sendCommand('Runtime.evaluate', {
  expression: `
    const result = {};

    // select要素
    document.querySelectorAll('select').forEach(select => {
      if (select.name) {
        result[select.name] = Array.from(select.options).map(opt => ({
          value: opt.value,
          label: opt.text
        }));
      }
    });

    // checkbox/radio要素
    ['param1', 'param2'].forEach(paramName => {
      const inputs = document.querySelectorAll(\`input[name="\${paramName}"]\`);
      result[paramName] = Array.from(inputs).map(input => {
        const label = document.querySelector(\`label[for="\${input.id}"]\`)?.textContent.trim() || '';
        return { value: input.value, label };
      });
    });

    result;
  `,
  returnByValue: true
});

fs.writeFileSync('tmp/field-mappings.json', JSON.stringify(mappings.result.value, null, 2));
```

### パターン3: URLパラメータの記録

```javascript
const testResults = [];

for (const testCase of testCases) {
  // パラメータ設定
  await sendCommand('Runtime.evaluate', {
    expression: `
      // 値を設定
      ${testCase.setupCode}

      // フォームsubmit
      document.getElementById('form_search').submit();
    `
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  // URL記録
  const url = await sendCommand('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true
  });

  testResults.push({
    testName: testCase.name,
    params: testCase.params,
    url: url.result.value
  });

  // 元のページに戻る
  await sendCommand('Page.navigate', {
    url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=ja'
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
}

fs.writeFileSync('tmp/url-test-results.json', JSON.stringify(testResults, null, 2));
```

---

## テストと検証

### 1. パラメータ範囲のテスト

```javascript
// 数値範囲パラメータのテスト
const rangeTests = [
  { param: 'rp', values: [1, 10, 25, 50, 100, 500, 1000, 2000, 5000] },
  { param: 'sort', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20, 21] }
];

for (const test of rangeTests) {
  console.log(`\nTesting ${test.param}:`);

  for (const value of test.values) {
    await sendCommand('Page.navigate', {
      url: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&${test.param}=${value}&...`
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // エラーチェック
    const hasError = await sendCommand('Runtime.evaluate', {
      expression: `document.querySelector('.error') !== null`,
      returnByValue: true
    });

    console.log(`  ${test.param}=${value}: ${hasError.result.value ? 'ERROR' : 'OK'}`);
  }
}
```

### 2. 複数選択のテスト

```javascript
// 複数選択パラメータのテスト
const multiSelectTests = [
  { param: 'attr', values: ['11', '12', '14'] },
  { param: 'species', values: ['1', '15', '18'] },
  { param: 'other', values: ['1', '2', '9'] }
];

for (const test of multiSelectTests) {
  await sendCommand('Page.navigate', {
    url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=ja'
  });
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 複数選択
  const setupCode = test.values.map(v =>
    `document.querySelector('input[name="${test.param}"][value="${v}"]').checked = true;`
  ).join('\n');

  await sendCommand('Runtime.evaluate', {
    expression: `
      ${setupCode}
      document.getElementById('form_search').submit();
    `
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  const url = await sendCommand('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true
  });

  console.log(`${test.param} multiple select:`, url.result.value);
}
```

### 3. 条件結合のテスト

```javascript
// AND/OR条件のテスト
const conditionTests = [
  { params: ['other=1', 'other=9'], condition: 'othercon=1', desc: 'AND' },
  { params: ['other=1', 'other=9'], condition: 'othercon=2', desc: 'OR' }
];

for (const test of conditionTests) {
  await sendCommand('Page.navigate', {
    url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=ja'
  });
  await new Promise(resolve => setTimeout(resolve, 2000));

  await sendCommand('Runtime.evaluate', {
    expression: `
      document.querySelector('input[name="other"][value="1"]').checked = true;
      document.querySelector('input[name="other"][value="9"]').checked = true;
      document.querySelector('input[name="othercon"][value="${test.condition.split('=')[1]}"]').checked = true;
      document.getElementById('form_search').submit();
    `
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  const url = await sendCommand('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true
  });

  const count = await sendCommand('Runtime.evaluate', {
    expression: `
      const text = document.querySelector('.count_of_all')?.textContent || '';
      const match = text.match(/全(\\d+)件/);
      match ? parseInt(match[1]) : 0;
    `,
    returnByValue: true
  });

  console.log(`${test.desc} condition: ${count.result.value} results`);
}
```

---

## トラブルシューティング

### 問題1: WebSocket接続エラー

**症状**: `ECONNREFUSED` または `No such target id`

**解決方法**:
```bash
# Chromeを再起動
./scripts/debug/setup/stop-chrome.sh
./scripts/debug/setup/start-chrome.sh

# WebSocket URLを再取得
curl http://localhost:9222/json > tmp/targets.json
# 最初のwebSocketDebuggerUrlを.chrome_playwright_wsに保存
```

### 問題2: ページが遷移しない

**症状**: フォームsubmit後もURLが変わらない

**原因**:
- JavaScriptエラーが発生している
- submitボタンではなくイベントハンドラが必要

**解決方法**:
```javascript
// エラーチェック
const errors = await sendCommand('Runtime.evaluate', {
  expression: `
    const errors = [];
    window.addEventListener('error', (e) => errors.push(e.message));
    errors;
  `,
  returnByValue: true
});

// 代替手段: 直接URLを構築
const params = new URLSearchParams({
  ope: '1',
  sess: '1',
  attr: '11',
  // ...
});
await sendCommand('Page.navigate', {
  url: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?${params.toString()}`
});
```

### 問題3: セッションが切れる

**症状**: ログインページにリダイレクトされる

**解決方法**:
```javascript
// セッションIDを確認
const cookies = await sendCommand('Network.getCookies', {
  urls: ['https://www.db.yugioh-card.com']
});

console.log('Cookies:', cookies.cookies.map(c => `${c.name}=${c.value}`));

// 必要に応じて手動ログイン
console.log('Please login manually in the browser');
await new Promise(resolve => setTimeout(resolve, 30000)); // 30秒待機
```

### 問題4: データが取得できない

**症状**: `querySelector`が`null`を返す

**解決方法**:
```javascript
// ページロード完了を待つ
await sendCommand('Runtime.evaluate', {
  expression: `
    new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });
  `,
  awaitPromise: true
});

// セレクタの確認
const elementExists = await sendCommand('Runtime.evaluate', {
  expression: `document.querySelector('セレクタ') !== null`,
  returnByValue: true
});

if (!elementExists.result.value) {
  console.log('Element not found. Checking alternatives...');

  // 代替セレクタを試す
  const alternatives = [
    '.class-name',
    '#id-name',
    'input[name="field-name"]'
  ];

  for (const selector of alternatives) {
    const exists = await sendCommand('Runtime.evaluate', {
      expression: `document.querySelector('${selector}') !== null`,
      returnByValue: true
    });
    if (exists.result.value) {
      console.log(`Found with selector: ${selector}`);
      break;
    }
  }
}
```

---

## ベストプラクティス

### 1. データの保存

```javascript
// 日時付きでファイル名を生成
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `tmp/調査名-${timestamp}.json`;
fs.writeFileSync(filename, JSON.stringify(data, null, 2));
console.log(`✓ Saved to ${filename}`);
```

### 2. 待機時間の調整

```javascript
// ページロード: 2000ms
await new Promise(resolve => setTimeout(resolve, 2000));

// 軽い操作: 500ms
await new Promise(resolve => setTimeout(resolve, 500));

// フォーム送信後: 3000ms
await new Promise(resolve => setTimeout(resolve, 3000));
```

### 3. エラーハンドリング

```javascript
try {
  const result = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        try {
          // 操作
          return { success: true, data: 'result' };
        } catch (e) {
          return { success: false, error: e.message };
        }
      })();
    `,
    returnByValue: true
  });

  if (!result.result.value.success) {
    console.error('Error:', result.result.value.error);
  }
} catch (error) {
  console.error('WebSocket error:', error);
}
```

### 4. スクリプトの構造化

```javascript
// 関数として切り出す
async function extractFormFields(formId) {
  const result = await sendCommand('Runtime.evaluate', {
    expression: `
      const form = document.getElementById('${formId}');
      if (!form) return null;

      const fields = form.querySelectorAll('input, select, textarea');
      Array.from(fields).map(field => ({
        name: field.name,
        type: field.type,
        value: field.value
      }));
    `,
    returnByValue: true
  });

  return result.result.value;
}

async function navigateAndWait(url, waitMs = 2000) {
  await sendCommand('Page.navigate', { url });
  await new Promise(resolve => setTimeout(resolve, waitMs));
}

// メインロジック
ws.on('open', async () => {
  try {
    await navigateAndWait('https://www.db.yugioh-card.com/yugiohdb/page.action');
    const fields = await extractFormFields('form_search');
    console.log('Fields:', fields);

    ws.close();
  } catch (error) {
    console.error('Error:', error);
    ws.close();
  }
});
```

---

## 調査結果のドキュメント化

### テンプレート構造

```markdown
# [ページ名] 調査結果

**調査日**: YYYY-MM-DD
**対象URL**: https://...
**ロケール**: ja

## 概要
[ページの目的と機能の説明]

## フォーム構造
- フォームID: `form_id`
- メソッド: GET/POST
- アクション: URL
- フィールド数: N個

## パラメータ一覧

### パラメータ名1
- **説明**: [用途]
- **型**: string/integer/boolean
- **値**: [可能な値のリスト]
- **デフォルト**: [デフォルト値]
- **必須**: はい/いいえ

## 動作確認

### テストケース1
- **条件**: [設定内容]
- **結果URL**: [実際のURL]
- **結果**: [期待通り/エラー]

## 発見事項
- [重要な発見や隠し機能]

## 今後の調査項目
- [ ] [未確認の項目]
```

---

## まとめ

この手法を使用することで：
- ✅ 任意のページを体系的に調査できる
- ✅ データを構造化して保存できる
- ✅ 再現可能なテストスクリプトを作成できる
- ✅ 変更があった場合に差分を特定できる

調査時は必ず：
1. tmpディレクトリにスクリプトと結果を保存
2. docsディレクトリに調査結果をドキュメント化
3. 重要な発見はREADMEやSUMMARYに記載
