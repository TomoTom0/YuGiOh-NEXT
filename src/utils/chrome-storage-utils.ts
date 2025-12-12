/**
 * Chrome Storage Promise ユーティリティ
 *
 * chrome.storage API のコールバックベースのインターフェースを
 * Promise ベースに変換して使いやすくする
 */

/**
 * Chrome Storage Local から値を取得（Promise版）
 */
export async function getFromStorageLocal(key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Chrome Storage error: ${chrome.runtime.lastError.message}`));
      } else {
        resolve(result[key] ?? null);
      }
    });
  });
}

/**
 * Chrome Storage Local に値を設定（Promise版）
 */
export async function setToStorageLocal(key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Chrome Storage error: ${chrome.runtime.lastError.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Chrome Storage Local から複数の値を取得（Promise版）
 */
export async function getFromStorageLocalMultiple(keys: string[]): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Chrome Storage error: ${chrome.runtime.lastError.message}`));
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Chrome Storage Local から複数の値を設定（Promise版）
 */
export async function setToStorageLocalMultiple(items: Record<string, any>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Chrome Storage error: ${chrome.runtime.lastError.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Chrome Storage Local から値を削除（Promise版）
 */
export async function removeFromStorageLocal(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(key, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Chrome Storage error: ${chrome.runtime.lastError.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Chrome Storage Local から複数の値を削除（Promise版）
 */
export async function removeFromStorageLocalMultiple(keys: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Chrome Storage error: ${chrome.runtime.lastError.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Chrome Storage Local をクリア（Promise版）
 */
export async function clearStorageLocal(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Chrome Storage error: ${chrome.runtime.lastError.message}`));
      } else {
        resolve();
      }
    });
  });
}
