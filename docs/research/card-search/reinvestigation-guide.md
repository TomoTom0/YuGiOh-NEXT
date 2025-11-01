# カード検索機能 再調査ガイド

**最終更新**: 2025-10-30

このドキュメントは、遊戯王DBのカード検索機能について、仕様変更があった場合や他言語対応が必要になった場合に、同じ手順で再調査するためのガイドです。

## 目次

1. [再調査が必要なケース](#再調査が必要なケース)
2. [事前準備](#事前準備)
3. [調査手順](#調査手順)
4. [他言語対応の調査手順](#他言語対応の調査手順)
5. [差分確認の方法](#差分確認の方法)
6. [トラブルシューティング](#トラブルシューティング)

---

## 再調査が必要なケース

### ケース1: 仕様変更の確認
- 検索フォームにフィールドが追加された
- パラメータ名が変更された
- 新しい検索条件が追加された
- UIが刷新された

### ケース2: 他言語対応
- 英語（en）、韓国語（ko）、中国語（zh-CN）などでの動作確認
- 各言語のi18nデータ作成

### ケース3: 定期的な動作確認
- 隠しパラメータ（rp=2000など）が引き続き有効か確認
- パラメータの動作が変わっていないか確認

---

## 事前準備

### 1. 環境セットアップ

```bash
# Chrome起動
./scripts/debug/setup/start-chrome.sh

# 手動でログイン（必要に応じて）
# ブラウザで https://www.db.yugioh-card.com/yugiohdb/ を開いてログイン

# 作業ディレクトリの準備
mkdir -p tmp/reinvestigation-$(date +%Y%m%d)
cd tmp/reinvestigation-$(date +%Y%m%d)
```

### 2. 前回の調査結果を確認

```bash
# 前回の完全仕様書を確認
cat ../../docs/research/card-search-parameters-complete-spec.md

# 前回のi18nデータを確認
cat ../wip/card-search-params-i18n.json
```

---

## 調査手順

### ステップ1: フォーム構造の確認

**目的**: フィールド数や構造に変更がないか確認

**スクリプト**: `step1-check-form-structure.js`

```javascript
const WebSocket = require('ws');
const fs = require('fs');

const wsUrl = fs.readFileSync('../../.chrome_playwright_ws', 'utf8').trim();
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
    console.log('フォーム構造を確認中...\n');

    await sendCommand('Page.navigate', {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=ja'
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // フォームフィールドを取得
    const fields = await sendCommand('Runtime.evaluate', {
      expression: `
        const inputs = document.querySelectorAll('#form_search input, #form_search select, #form_search textarea');
        const fieldTypes = {};
        inputs.forEach(input => {
          const type = input.type || input.tagName.toLowerCase();
          fieldTypes[type] = (fieldTypes[type] || 0) + 1;
        });

        {
          totalCount: inputs.length,
          fieldTypes: fieldTypes,
          fields: Array.from(inputs).map(input => ({
            tag: input.tagName,
            type: input.type || '',
            name: input.name || '',
            id: input.id || ''
          }))
        };
      `,
      returnByValue: true
    });

    console.log('フィールド数:', fields.result.value.totalCount);
    console.log('タイプ別内訳:', fields.result.value.fieldTypes);

    fs.writeFileSync('step1-form-structure.json', JSON.stringify(fields.result.value, null, 2));
    console.log('\n✓ step1-form-structure.json に保存しました');

    // 前回との比較
    console.log('\n【前回との比較】');
    console.log('前回のフィールド数: 140');
    console.log('今回のフィールド数:', fields.result.value.totalCount);

    if (fields.result.value.totalCount !== 140) {
      console.log('⚠️ フィールド数が変更されています！差分を確認してください。');
    } else {
      console.log('✓ フィールド数は変更なし');
    }

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

**実行**:
```bash
node step1-check-form-structure.js
```

**確認ポイント**:
- フィールド数が140個から変わっていないか
- 新しいフィールドが追加されていないか
- 削除されたフィールドはないか

### ステップ2: パラメータ名の確認

**目的**: パラメータ名に変更がないか確認

**スクリプト**: `step2-check-parameter-names.js`

```javascript
const WebSocket = require('ws');
const fs = require('fs');

const wsUrl = fs.readFileSync('../../.chrome_playwright_ws', 'utf8').trim();
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
    console.log('パラメータ名を確認中...\n');

    await sendCommand('Page.navigate', {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=ja'
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const paramNames = await sendCommand('Runtime.evaluate', {
      expression: `
        const inputs = document.querySelectorAll('#form_search input, #form_search select');
        const names = new Set();
        inputs.forEach(input => {
          if (input.name) names.add(input.name);
        });
        Array.from(names).sort();
      `,
      returnByValue: true
    });

    console.log('パラメータ名一覧:');
    paramNames.result.value.forEach(name => console.log(`  - ${name}`));

    fs.writeFileSync('step2-parameter-names.json', JSON.stringify(paramNames.result.value, null, 2));
    console.log('\n✓ step2-parameter-names.json に保存しました');

    // 前回のパラメータ名リスト
    const previousParams = [
      'ope', 'sess', 'rp', 'mode', 'sort', 'keyword', 'stype', 'ctype',
      'attr', 'species', 'effe', 'othercon', 'other', 'jogai',
      'starfr', 'starto', 'pscalefr', 'pscaleto',
      'linkmarkerfr', 'linkmarkerto', 'linkbtn1', 'linkbtn2', 'linkbtn3',
      'linkbtn4', 'linkbtn6', 'linkbtn7', 'linkbtn8', 'linkbtn9', 'link_m',
      'atkfr', 'atkto', 'deffr', 'defto',
      'releaseDStart', 'releaseMStart', 'releaseYStart',
      'releaseDEnd', 'releaseMEnd', 'releaseYEnd'
    ];

    const currentParams = paramNames.result.value;
    const added = currentParams.filter(p => !previousParams.includes(p));
    const removed = previousParams.filter(p => !currentParams.includes(p));

    console.log('\n【差分確認】');
    if (added.length > 0) {
      console.log('追加されたパラメータ:', added);
    }
    if (removed.length > 0) {
      console.log('削除されたパラメータ:', removed);
    }
    if (added.length === 0 && removed.length === 0) {
      console.log('✓ パラメータ名に変更なし');
    }

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

**実行**:
```bash
node step2-check-parameter-names.js
```

### ステップ3: 選択肢とラベルの抽出

**目的**: パラメータの値とラベルが変わっていないか確認

**スクリプト**: `step3-extract-labels.js`

このスクリプトは以下を抽出します：
1. sortの選択肢（前回は13個）
2. attr（属性）の値とラベル（前回は7個）
3. species（種族）の値とラベル（前回は26個）
4. other/jogaiの値とラベル（前回は15個ずつ）
5. effeの値とラベル（前回は7個）

```javascript
const WebSocket = require('ws');
const fs = require('fs');

const wsUrl = fs.readFileSync('../../.chrome_playwright_ws', 'utf8').trim();
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
    console.log('ラベル情報を抽出中...\n');

    // 検索ページ
    await sendCommand('Page.navigate', {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=ja'
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // すべてのパラメータのラベルを取得
    const labels = await sendCommand('Runtime.evaluate', {
      expression: `
        const result = {};

        // attr, species, effe, other, jogai, othercon
        ['attr', 'species', 'effe', 'other', 'jogai', 'othercon'].forEach(name => {
          const inputs = document.querySelectorAll(\`input[name="\${name}"]\`);
          result[name] = Array.from(inputs).map(input => {
            let label = '';
            if (input.id) {
              const labelEl = document.querySelector(\`label[for="\${input.id}"]\`);
              if (labelEl) label = labelEl.innerText.trim();
            }
            if (!label) {
              const parentLabel = input.closest('label');
              if (parentLabel) label = parentLabel.innerText.trim();
            }
            return { value: input.value, label: label };
          });
        });

        result;
      `,
      returnByValue: true
    });

    console.log('検索フォームのラベル:');
    Object.keys(labels.result.value).forEach(key => {
      console.log(`  ${key}: ${labels.result.value[key].length}個`);
    });

    // 検索結果ページに移動してsortを取得
    await sendCommand('Page.navigate', {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&keyword=&stype=1&rp=10&request_locale=ja'
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const sortOptions = await sendCommand('Runtime.evaluate', {
      expression: `
        const select = document.querySelector('select[name="sort"]');
        if (select) {
          Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text
          }));
        } else {
          [];
        }
      `,
      returnByValue: true
    });

    labels.result.value.sort = sortOptions.result.value;
    console.log(`  sort: ${sortOptions.result.value.length}個`);

    fs.writeFileSync('step3-all-labels.json', JSON.stringify(labels.result.value, null, 2));
    console.log('\n✓ step3-all-labels.json に保存しました');

    // 個数の比較
    const expectedCounts = {
      attr: 7,
      species: 26,
      effe: 7,
      other: 15,
      jogai: 15,
      othercon: 2,
      sort: 13
    };

    console.log('\n【個数確認】');
    Object.keys(expectedCounts).forEach(key => {
      const actual = labels.result.value[key]?.length || 0;
      const expected = expectedCounts[key];
      const status = actual === expected ? '✓' : '⚠️';
      console.log(`${status} ${key}: 期待=${expected}, 実際=${actual}`);
    });

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

**実行**:
```bash
node step3-extract-labels.js
```

### ステップ4: 隠しパラメータの動作確認

**目的**: rp=2000、sort値などの隠し機能が引き続き有効か確認

**スクリプト**: `step4-test-hidden-params.js`

```javascript
const WebSocket = require('ws');
const fs = require('fs');

const wsUrl = fs.readFileSync('../../.chrome_playwright_ws', 'utf8').trim();
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
    console.log('隠しパラメータをテスト中...\n');

    const tests = [
      { name: 'rp=2000（全件取得）', url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&keyword=ブラック&stype=1&rp=2000&sort=1&request_locale=ja' },
      { name: 'rp=5000（範囲外）', url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&keyword=ブラック&stype=1&rp=5000&sort=1&request_locale=ja' },
      { name: 'sort=10（欠番）', url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&keyword=ブラック&stype=1&rp=10&sort=10&request_locale=ja' },
      { name: 'sort=21（新しい順）', url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&keyword=ブラック&stype=1&rp=10&sort=21&request_locale=ja' }
    ];

    const results = [];

    for (const test of tests) {
      console.log(`テスト: ${test.name}`);

      await sendCommand('Page.navigate', { url: test.url });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const result = await sendCommand('Runtime.evaluate', {
        expression: `
          const hasError = document.querySelector('.error, .errorMessage') !== null;
          const countText = document.querySelector('.count_of_all')?.textContent || '';
          const match = countText.match(/全(\\d+)件/);
          const resultCount = match ? parseInt(match[1]) : 0;
          const cardItems = document.querySelectorAll('.card_list_item, .card-item').length;

          {
            hasError: hasError,
            totalResults: resultCount,
            displayedCards: cardItems,
            url: window.location.href
          };
        `,
        returnByValue: true
      });

      results.push({
        test: test.name,
        ...result.result.value
      });

      console.log(`  エラー: ${result.result.value.hasError ? 'あり' : 'なし'}`);
      console.log(`  総結果数: ${result.result.value.totalResults}件`);
      console.log(`  表示カード数: ${result.result.value.displayedCards}件\n`);
    }

    fs.writeFileSync('step4-hidden-params-test.json', JSON.stringify(results, null, 2));
    console.log('✓ step4-hidden-params-test.json に保存しました');

    console.log('\n【判定】');
    const rp2000Test = results.find(r => r.test.includes('rp=2000'));
    if (rp2000Test && !rp2000Test.hasError && rp2000Test.displayedCards > 100) {
      console.log('✓ rp=2000は引き続き有効');
    } else {
      console.log('⚠️ rp=2000の動作が変わっている可能性があります');
    }

    const sort10Test = results.find(r => r.test.includes('sort=10'));
    if (sort10Test && (sort10Test.hasError || sort10Test.totalResults === 0)) {
      console.log('✓ sort=10は引き続き無効（欠番）');
    } else {
      console.log('⚠️ sort=10の挙動が変わっている可能性があります');
    }

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

**実行**:
```bash
node step4-test-hidden-params.js
```

### ステップ5: 複数選択パラメータの動作確認

**目的**: 複数選択パラメータの動作が変わっていないか確認

**スクリプト**: `step5-test-multi-select.js`

```javascript
const WebSocket = require('ws');
const fs = require('fs');

const wsUrl = fs.readFileSync('../../.chrome_playwright_ws', 'utf8').trim();
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
    console.log('複数選択パラメータをテスト中...\n');

    await sendCommand('Page.navigate', {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=ja'
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 複数の属性を選択
    await sendCommand('Runtime.evaluate', {
      expression: `
        document.querySelector('input[name="attr"][value="11"]').checked = true;
        document.querySelector('input[name="attr"][value="12"]').checked = true;
        document.querySelector('input[name="attr"][value="14"]').checked = true;
        document.getElementById('form_search').submit();
      `
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const url = await sendCommand('Runtime.evaluate', {
      expression: 'window.location.href',
      returnByValue: true
    });

    console.log('テストURL:', url.result.value);

    // URLパラメータの確認
    const hasMultipleAttr = (url.result.value.match(/attr=/g) || []).length;
    console.log(`attr パラメータの出現回数: ${hasMultipleAttr}`);

    if (hasMultipleAttr === 3) {
      console.log('✓ 複数選択パラメータは引き続き「パラメータ名の繰り返し」方式');
    } else {
      console.log('⚠️ 複数選択の実装方式が変わっている可能性があります');
    }

    fs.writeFileSync('step5-multi-select-test.json', JSON.stringify({
      url: url.result.value,
      attrCount: hasMultipleAttr
    }, null, 2));
    console.log('\n✓ step5-multi-select-test.json に保存しました');

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

**実行**:
```bash
node step5-test-multi-select.js
```

---

## 他言語対応の調査手順

### ステップA: 言語ロケールの確認

**対象言語**: en（英語）、ko（韓国語）、zh-CN（中国語）など

**スクリプト**: `stepA-check-locale.js`

```javascript
const WebSocket = require('ws');
const fs = require('fs');

const wsUrl = fs.readFileSync('../../.chrome_playwright_ws', 'utf8').trim();
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
    // テストする言語
    const locales = ['ja', 'en', 'ko', 'zh-CN'];
    const results = {};

    for (const locale of locales) {
      console.log(`\nロケール: ${locale} をテスト中...`);

      await sendCommand('Page.navigate', {
        url: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=${locale}`
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ページタイトルとフォームの存在を確認
      const pageInfo = await sendCommand('Runtime.evaluate', {
        expression: `
          {
            title: document.title,
            hasForm: document.getElementById('form_search') !== null,
            url: window.location.href,
            lang: document.documentElement.lang || ''
          };
        `,
        returnByValue: true
      });

      results[locale] = pageInfo.result.value;

      console.log(`  タイトル: ${pageInfo.result.value.title}`);
      console.log(`  フォーム存在: ${pageInfo.result.value.hasForm ? 'あり' : 'なし'}`);
      console.log(`  言語属性: ${pageInfo.result.value.lang}`);
    }

    fs.writeFileSync('stepA-locale-check.json', JSON.stringify(results, null, 2));
    console.log('\n✓ stepA-locale-check.json に保存しました');

    console.log('\n【対応言語】');
    Object.keys(results).forEach(locale => {
      if (results[locale].hasForm) {
        console.log(`✓ ${locale}: 対応`);
      } else {
        console.log(`✗ ${locale}: 非対応または要確認`);
      }
    });

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

**実行**:
```bash
node stepA-check-locale.js
```

### ステップB: 他言語のラベル抽出

**スクリプト**: `stepB-extract-locale-labels.js`

```javascript
const WebSocket = require('ws');
const fs = require('fs');

// 調査する言語を指定
const TARGET_LOCALE = process.argv[2] || 'en';

const wsUrl = fs.readFileSync('../../.chrome_playwright_ws', 'utf8').trim();
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
    console.log(`ロケール ${TARGET_LOCALE} のラベルを抽出中...\n`);

    await sendCommand('Page.navigate', {
      url: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=${TARGET_LOCALE}`
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 全パラメータのラベルを取得
    const labels = await sendCommand('Runtime.evaluate', {
      expression: `
        const result = {
          locale: '${TARGET_LOCALE}',
          parameters: {}
        };

        ['attr', 'species', 'effe', 'other', 'jogai', 'othercon'].forEach(name => {
          const inputs = document.querySelectorAll(\`input[name="\${name}"]\`);
          result.parameters[name] = {};

          inputs.forEach(input => {
            let label = '';
            if (input.id) {
              const labelEl = document.querySelector(\`label[for="\${input.id}"]\`);
              if (labelEl) label = labelEl.innerText.trim();
            }
            if (!label) {
              const parentLabel = input.closest('label');
              if (parentLabel) label = parentLabel.innerText.trim();
            }

            result.parameters[name][input.value] = label;
          });
        });

        result;
      `,
      returnByValue: true
    });

    // 検索結果ページでsortを取得
    await sendCommand('Page.navigate', {
      url: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&keyword=&stype=1&rp=10&request_locale=${TARGET_LOCALE}`
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const sortOptions = await sendCommand('Runtime.evaluate', {
      expression: `
        const select = document.querySelector('select[name="sort"]');
        const result = {};
        if (select) {
          Array.from(select.options).forEach(opt => {
            result[opt.value] = opt.text;
          });
        }
        result;
      `,
      returnByValue: true
    });

    labels.result.value.parameters.sort = sortOptions.result.value;

    // stypeの選択肢も取得
    await sendCommand('Page.navigate', {
      url: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=${TARGET_LOCALE}`
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const stypeLabels = await sendCommand('Runtime.evaluate', {
      expression: `
        const radios = document.querySelectorAll('input[name="stype"]');
        const result = {};
        radios.forEach(radio => {
          const label = document.querySelector(\`label[for="\${radio.id}"]\`)?.innerText.trim() || '';
          result[radio.value] = label;
        });
        result;
      `,
      returnByValue: true
    });

    labels.result.value.parameters.stype = stypeLabels.result.value;

    // ctypeの選択肢も取得
    const ctypeLabels = await sendCommand('Runtime.evaluate', {
      expression: `
        const radios = document.querySelectorAll('input[name="ctype"]');
        const result = { '': 'All cards' }; // デフォルト値
        radios.forEach(radio => {
          const label = document.querySelector(\`label[for="\${radio.id}"]\`)?.innerText.trim() || '';
          result[radio.value] = label;
        });
        result;
      `,
      returnByValue: true
    });

    labels.result.value.parameters.ctype = ctypeLabels.result.value;

    const filename = `stepB-labels-${TARGET_LOCALE}.json`;
    fs.writeFileSync(filename, JSON.stringify(labels.result.value, null, 2));
    console.log(`✓ ${filename} に保存しました`);

    console.log('\n【抽出内容】');
    Object.keys(labels.result.value.parameters).forEach(key => {
      const count = Object.keys(labels.result.value.parameters[key]).length;
      console.log(`  ${key}: ${count}個`);
    });

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

**実行**:
```bash
# 英語
node stepB-extract-locale-labels.js en

# 韓国語
node stepB-extract-locale-labels.js ko

# 中国語
node stepB-extract-locale-labels.js zh-CN
```

### ステップC: i18nデータの生成

抽出したラベルを使って、各言語のi18nデータファイルを生成します。

**手動作業**:
1. `stepB-labels-XX.json`を`../wip/card-search-params-i18n-XX.json`にコピー
2. 既存の日本語版（`card-search-params-i18n.json`）の構造に合わせて整形
3. metadataセクションを追加

**フォーマット例**:
```json
{
  "locale": "en",
  "parameters": {
    "sort": {
      "1": "Alphabetical order",
      "2": "Level/Rank (High to Low)",
      ...
    },
    "attr": {
      "11": "LIGHT",
      "12": "DARK",
      ...
    },
    ...
  },
  "metadata": {
    "rp": {
      "valid_values": [10, 25, 50, 100],
      "hidden_max": 2000,
      "note": "rp can be set up to 2000, but it's not shown in the UI"
    },
    ...
  }
}
```

---

## 差分確認の方法

### 自動差分チェックスクリプト

**スクリプト**: `check-differences.js`

```javascript
const fs = require('fs');

console.log('差分確認ツール\n');

// ステップ1の結果を読み込み
const step1 = JSON.parse(fs.readFileSync('step1-form-structure.json', 'utf8'));

console.log('【フィールド数】');
console.log(`前回: 140`);
console.log(`今回: ${step1.totalCount}`);
console.log(step1.totalCount === 140 ? '✓ 変更なし\n' : '⚠️ 変更あり\n');

// ステップ2の結果を読み込み
const step2 = JSON.parse(fs.readFileSync('step2-parameter-names.json', 'utf8'));

const previousParams = [
  'ope', 'sess', 'rp', 'mode', 'sort', 'keyword', 'stype', 'ctype',
  'attr', 'species', 'effe', 'othercon', 'other', 'jogai',
  'starfr', 'starto', 'pscalefr', 'pscaleto',
  'linkmarkerfr', 'linkmarkerto', 'linkbtn1', 'linkbtn2', 'linkbtn3',
  'linkbtn4', 'linkbtn6', 'linkbtn7', 'linkbtn8', 'linkbtn9', 'link_m',
  'atkfr', 'atkto', 'deffr', 'defto',
  'releaseDStart', 'releaseMStart', 'releaseYStart',
  'releaseDEnd', 'releaseMEnd', 'releaseYEnd'
];

const added = step2.filter(p => !previousParams.includes(p));
const removed = previousParams.filter(p => !step2.includes(p));

console.log('【パラメータ名】');
if (added.length > 0) {
  console.log('追加:', added);
}
if (removed.length > 0) {
  console.log('削除:', removed);
}
if (added.length === 0 && removed.length === 0) {
  console.log('✓ 変更なし\n');
}

// ステップ3の結果を読み込み
const step3 = JSON.parse(fs.readFileSync('step3-all-labels.json', 'utf8'));

const expectedCounts = {
  attr: 7,
  species: 26,
  effe: 7,
  other: 15,
  jogai: 15,
  othercon: 2,
  sort: 13
};

console.log('【選択肢の個数】');
let hasChanges = false;
Object.keys(expectedCounts).forEach(key => {
  const actual = step3[key]?.length || 0;
  const expected = expectedCounts[key];
  if (actual !== expected) {
    console.log(`⚠️ ${key}: 期待=${expected}, 実際=${actual}`);
    hasChanges = true;
  }
});
if (!hasChanges) {
  console.log('✓ すべて変更なし\n');
}

// ステップ4の結果を読み込み
const step4 = JSON.parse(fs.readFileSync('step4-hidden-params-test.json', 'utf8'));

console.log('【隠しパラメータ】');
const rp2000Test = step4.find(r => r.test.includes('rp=2000'));
if (rp2000Test && !rp2000Test.hasError && rp2000Test.displayedCards > 100) {
  console.log('✓ rp=2000は引き続き有効');
} else {
  console.log('⚠️ rp=2000の動作が変わっている');
}

console.log('\n【まとめ】');
const totalIssues = (step1.totalCount !== 140 ? 1 : 0) +
                    (added.length + removed.length > 0 ? 1 : 0) +
                    (hasChanges ? 1 : 0);

if (totalIssues === 0) {
  console.log('✓ 重大な変更は検出されませんでした');
  console.log('  前回の仕様書はそのまま使用できます');
} else {
  console.log(`⚠️ ${totalIssues}件の変更が検出されました`);
  console.log('  仕様書の更新が必要です');
}
```

**実行**:
```bash
node check-differences.js
```

---

## トラブルシューティング

### 問題: スクリプトが動かない

**確認事項**:
1. Chromeが起動しているか
2. WebSocket URLが正しいか
3. ログインしているか

```bash
# WebSocket URL確認
cat ../../.chrome_playwright_ws

# Chrome再起動
./../../scripts/debug/setup/stop-chrome.sh
./../../scripts/debug/setup/start-chrome.sh
```

### 問題: ラベルが取得できない

**原因**: HTMLの構造が変わっている可能性

**対処**:
```javascript
// デバッグ用にHTML構造を確認
const html = await sendCommand('Runtime.evaluate', {
  expression: `document.querySelector('#form_search').innerHTML`,
  returnByValue: true
});
fs.writeFileSync('debug-form-html.html', html.result.value);
```

### 問題: セッションエラー

**対処**:
1. ブラウザで手動ログイン
2. スクリプト実行前に30秒待機

---

## 更新チェックリスト

再調査後、以下をチェック：

- [ ] ステップ1: フォーム構造の確認完了
- [ ] ステップ2: パラメータ名の確認完了
- [ ] ステップ3: ラベル抽出完了
- [ ] ステップ4: 隠しパラメータの動作確認完了
- [ ] ステップ5: 複数選択パラメータの動作確認完了
- [ ] 差分チェック実行
- [ ] 変更があった場合、仕様書を更新
- [ ] 変更があった場合、i18nデータを更新
- [ ] 更新履歴をdone.mdに記録

---

## まとめ

このガイドに従うことで：
- ✅ 仕様変更を素早く検出できる
- ✅ 他言語のi18nデータを効率的に作成できる
- ✅ 差分を明確に把握できる
- ✅ 再調査の工数を最小化できる

定期的（月1回程度）にステップ1〜5を実行して、仕様変更がないか確認することを推奨します。
