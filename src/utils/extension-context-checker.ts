/**
 * 拡張機能コンテキストのエラーハンドリング
 */

/**
 * 拡張機能コンテキストが無効化されているかチェック
 */
export function isExtensionContextInvalidated(error: any): boolean {
  if (!error) return false;

  const message = error.message || String(error);
  return message.includes('Extension context invalidated') ||
         message.includes('Cannot access') ||
         chrome.runtime?.id === undefined;
}

/**
 * ページリロードを促すメッセージを表示
 */
export function showReloadPrompt(): void {
  const message = '拡張機能が更新されました。ページをリロードしてください。';

  // ページ上部に通知バナーを表示
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ff6b6b;
    color: white;
    padding: 16px;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    z-index: 999999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  banner.innerHTML = `
    ${message}
    <button style="
      margin-left: 16px;
      padding: 8px 16px;
      background: white;
      color: #ff6b6b;
      border: none;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
    " onclick="location.reload()">
      リロード
    </button>
  `;
  document.body.appendChild(banner);

  // コンソールにも出力
  console.error('[Extension] Context invalidated. Please reload the page.');
}

/**
 * chrome.storage API呼び出しをラップしてエラーハンドリング
 */
export async function safeStorageGet<T = any>(keys: string | string[]): Promise<Record<string, T>> {
  try {
    // コンテキストが既に無効化されているかチェック
    if (!chrome.runtime?.id) {
      throw new Error('Extension context invalidated');
    }

    // chrome.storage.local.get は callback-based API なので Promise でラップ
    return await new Promise<Record<string, T>>((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        // callback内でlastErrorをチェック
        if (chrome.runtime.lastError) {
          reject(new Error(`Storage get failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        resolve(result as Record<string, T>);
      });
    });
  } catch (error) {
    if (isExtensionContextInvalidated(error)) {
      showReloadPrompt();
    }
    throw error;
  }
}

/**
 * chrome.storage API呼び出しをラップしてエラーハンドリング（set版）
 */
export async function safeStorageSet(items: Record<string, any>): Promise<void> {
  try {
    // コンテキストが既に無効化されているかチェック
    if (!chrome.runtime?.id) {
      throw new Error('Extension context invalidated');
    }

    // chrome.storage.local.set は callback-based API なので Promise でラップ
    return await new Promise<void>((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        // callback内でlastErrorをチェック
        if (chrome.runtime.lastError) {
          reject(new Error(`Storage set failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        resolve();
      });
    });
  } catch (error) {
    if (isExtensionContextInvalidated(error)) {
      showReloadPrompt();
    }
    throw error;
  }
}
