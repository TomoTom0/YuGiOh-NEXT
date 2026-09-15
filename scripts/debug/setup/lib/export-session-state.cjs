/**
 * 起動中Chromiumのcookieを Playwright storageState 形式で書き出す（TASK-467）
 *
 * CDPのbrowserレベルendpointに接続し Storage.getCookies で全cookieを取得する
 * （ドメイン絞り込みなし。browser context既定分のみ）。
 * 使い方: node export-session-state.cjs <browserWsUrl> <outputPath>
 *   （export-session-state.sh から起動される。直接は実行しない）
 *
 * 注意: 出力には認証情報が含まれるため、cookieの値をログ・標準出力へ出力しない。
 */

const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const RESPONSE_TIMEOUT_MS = 10000;

/** エラー終了（メッセージはstderrへ） */
function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exit(1);
}

/**
 * browser endpointへ接続して Storage.getCookies を送り、結果とwsを返す
 * 接続・応答とも RESPONSE_TIMEOUT_MS でタイムアウトする
 */
function fetchAllCookies(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`CDPへの接続・応答がタイムアウトしました（${RESPONSE_TIMEOUT_MS / 1000}秒）`));
    }, RESPONSE_TIMEOUT_MS);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id, method: 'Storage.getCookies' }));
    });
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.id !== id) return;
      clearTimeout(timer);
      if (message.error) {
        ws.close();
        reject(new Error(`Storage.getCookies が失敗しました: ${message.error.message}`));
        return;
      }
      resolve({ ws, cookies: (message.result && message.result.cookies) || [] });
    });
    ws.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`CDPへの接続に失敗しました: ${e.message}`));
    });
  });
}

async function main() {
  const browserWsUrl = process.argv[2];
  const outputPath = process.argv[3];
  if (!browserWsUrl || !outputPath) {
    fail('引数が不足しています。使い方: node export-session-state.cjs <browserWsUrl> <outputPath>');
  }

  const { ws, cookies } = await fetchAllCookies(browserWsUrl);
  ws.close();

  // ログインチェック: db.yugioh-card.com のcookieが無ければ書き出しても意味がない
  const dbCookies = cookies.filter(
    (c) => typeof c.domain === 'string' && c.domain.endsWith('db.yugioh-card.com')
  );
  if (dbCookies.length === 0) {
    fail('db.yugioh-card.com のcookieが0件です。Chromiumでログインしてから再実行してください');
  }

  // storageState形式へ変換。sameSite は Strict/Lax のみキーを設定し、それ以外
  // （未指定・空文字）はキー自体を省略する（明示的な 'None' への変換を避けるため）
  const stateCookies = cookies.map((c) => {
    const ck = {
      name: c.name, value: c.value, domain: c.domain, path: c.path,
      expires: c.expires, httpOnly: c.httpOnly, secure: c.secure
    };
    if (c.sameSite === 'Strict' || c.sameSite === 'Lax') ck.sameSite = c.sameSite;
    return ck;
  });

  // 出力（認証情報を含むため 0644 で一瞬存在する状態を避け、0o600 で作成する。
  // openSyncのmodeは新規作成時のみ適用されるため、既存ファイルもfchmodで強制する）
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const fd = fs.openSync(outputPath, 'w', 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify({ cookies: stateCookies, origins: [] }, null, 2)}\n`);
    fs.fchmodSync(fd, 0o600);
  } finally {
    fs.closeSync(fd);
  }

  // 標準出力は合計件数 + ドメイン別件数の集計のみ（値は一切出さない）
  const counts = new Map();
  for (const c of cookies) {
    counts.set(c.domain, (counts.get(c.domain) || 0) + 1);
  }
  console.log(`[OK] cookieを書き出しました: ${outputPath}`);
  console.log(`     合計 ${cookies.length}件（db.yugioh-card.com: ${dbCookies.length}件）`);
  for (const [domain, count] of counts) {
    console.log(`     ${domain}: ${count}件`);
  }
}

main().catch((e) => fail(e.message));
