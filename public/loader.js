/**
 * Content Script Loader
 * Webpack でビルドされた content.js を動的インポートするローダー
 * これにより content.js が ES Module として正しく読み込まれる
 */
(async () => {
  try {
    // Webpackでビルドされた本来のcontent.jsを動的インポート
    const src = chrome.runtime.getURL('content.js');
    console.log('[loader.js] Loading content.js from:', src);
    await import(src);
    console.log('[loader.js] Successfully loaded content.js');
  } catch (error) {
    console.error('[loader.js] Failed to load content.js:', error);
  }
})();
