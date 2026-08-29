/**
 * 検索フィルターの複数モンスタータイプ選択時のAND/OR回帰テスト（TASK-373）
 *
 * 過去に以下2つのバグがあった：
 * 1. モンスタータイプを2種類以上選択しても、URL構築時（buildApiUrl）が
 *    同名パラメータ（other=X&other=Y）を上書きしてしまい、実際には1種類しか
 *    サーバーへ送信されていなかった（AND/ORを切り替えても結果が変わらなかった）
 * 2. デフォルトソート（release_desc=新しい順のはず）のAPI値が実際には
 *    最古のカードを返す値になっていた（SORT_ORDER_TO_API_VALUEの逆転）
 *
 * このテストは、融合(fusion)+シンクロ(synchro)の2種類をOR/ANDそれぞれで検索し、
 * 実際にサーバーへ送信されるURLパラメータと、返ってくる結果件数を確認する。
 * 融合とシンクロを同時に持つカードは仕様上存在しないため、正しく動作すれば
 * OR > 0件・AND = 0件になる。
 */

const { connectCDP } = require('./cdp-helper.cjs');

const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

async function ensureNormalState(cdp, dataType) {
  for (let i = 0; i < 4; i++) {
    const state = await cdp.evaluate(`
      (() => {
        const btn = document.querySelector('.chip.chip-fixed[data-type="${dataType}"]');
        if (!btn) return null;
        return { active: btn.classList.contains('active'), not: btn.classList.contains('not') };
      })()
    `);
    if (state && state.active && !state.not) return state;
    await cdp.evaluate(`(() => { const b = document.querySelector('.chip.chip-fixed[data-type="${dataType}"]'); if (b) b.click(); })()`);
    await cdp.wait(150);
  }
  return null;
}

async function ensureMode(cdp, targetMode) {
  for (let i = 0; i < 3; i++) {
    const mode = await cdp.evaluate(`(() => { const b = document.querySelector('.chip-mode'); return b ? b.textContent.trim() : null; })()`);
    if (mode === targetMode) return mode;
    await cdp.evaluate(`(() => { const b = document.querySelector('.chip-mode'); if (b) b.click(); })()`);
    await cdp.wait(150);
  }
  return null;
}

function captureNextSearchUrl(cdp) {
  return new Promise((resolve) => {
    const handler = (params) => {
      if (params.request.url.includes('/yugiohdb/card_search.action')) {
        cdp.off('Network.requestWillBeSent', handler);
        resolve(params.request.url);
      }
    };
    cdp.on('Network.requestWillBeSent', handler);
  });
}

async function runSearchAndCollect(cdp) {
  const reqPromise = captureNextSearchUrl(cdp);
  await cdp.evaluate(`(() => { const b = document.querySelector('.search-btn'); if (b) b.click(); })()`);
  const url = await reqPromise;
  await cdp.wait(1500);
  const badge = await cdp.evaluate(`(() => { const b = document.querySelector('.count-badge'); return b ? b.textContent.trim() : null; })()`);
  return { url: new URL(url), badge };
}

async function testMultiTypeAndOr() {
  console.log('【複数モンスタータイプ選択時のAND/OR回帰テスト（TASK-373）】\n');

  const cdp = await connectCDP();
  let failed = false;

  try {
    // ハッシュ部分のみが異なる/同一のURLへのnavigateは同一ドキュメント内遷移となり
    // 前回のスクリプト実行のPinia状態（フィルター選択等）が残留することがあるため、
    // 一度別ページを経由して確実にフルリロードさせる
    await cdp.navigate('about:blank');
    await cdp.wait(300);
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000);
    await cdp.sendCommand('Network.enable');

    await cdp.evaluate(`(() => { const b = document.querySelector('.menu-btn'); if (b) b.click(); })()`);
    await cdp.wait(500);
    await cdp.evaluate(`(() => { const b = document.querySelector('.clear-btn'); if (b) b.click(); })()`);
    await cdp.wait(300);

    await ensureNormalState(cdp, 'fusion');
    await ensureNormalState(cdp, 'synchro');
    await ensureMode(cdp, 'OR');

    await cdp.evaluate(`(() => { const b = document.querySelector('.close-btn'); if (b) b.click(); })()`);
    await cdp.wait(300);

    const orResult = await runSearchAndCollect(cdp);
    const orOther = orResult.url.searchParams.getAll('other');

    console.log('OR検索: other=' + JSON.stringify(orOther) + ' othercon=' + orResult.url.searchParams.get('othercon') + ' 件数=' + orResult.badge);

    if (orOther.length !== 2) {
      console.log('❌ FAIL: 融合+シンクロ2種類を選択したのに、otherパラメータが' + orOther.length + '個しか送信されていない（url-builder.tsの複数パラメータ上書きバグの再発）');
      failed = true;
    } else {
      console.log('✅ otherパラメータが2個とも正しく送信されている');
    }

    const orCount = parseInt(orResult.badge, 10) || 0;
    if (orCount <= 0) {
      console.log('❌ FAIL: OR検索の結果が0件（融合またはシンクロのカードが存在するはず）');
      failed = true;
    } else {
      console.log('✅ OR検索で' + orCount + '件ヒット');
    }

    await cdp.evaluate(`(() => { const b = document.querySelector('.menu-btn'); if (b) b.click(); })()`);
    await cdp.wait(500);
    await ensureMode(cdp, 'AND');
    await cdp.evaluate(`(() => { const b = document.querySelector('.close-btn'); if (b) b.click(); })()`);
    await cdp.wait(300);

    const andResult = await runSearchAndCollect(cdp);
    const andCount = parseInt(andResult.badge, 10) || 0;

    console.log('AND検索: othercon=' + andResult.url.searchParams.get('othercon') + ' 件数=' + andResult.badge);

    if (andCount !== 0) {
      console.log('❌ FAIL: AND検索の結果が0件ではない（融合とシンクロを同時に持つカードは存在しないはず。AND絞り込みが機能していない可能性）');
      failed = true;
    } else {
      console.log('✅ AND検索で正しく0件（融合とシンクロを同時に持つカードは存在しない）');
    }

    if (orCount === andCount) {
      console.log('❌ FAIL: OR件数とAND件数が同じ（AND/ORの切替が結果に反映されていない）');
      failed = true;
    }
  } catch (error) {
    console.error('エラーが発生しました:', error);
    failed = true;
  } finally {
    cdp.close();
  }

  console.log('\n=== テスト結果:', failed ? '❌ FAIL' : '✅ PASS', '===\n');
  process.exit(failed ? 1 : 0);
}

testMultiTypeAndOr();
