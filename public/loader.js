/**
 * Content Script Loader
 * Webpack でビルドされた content.js を動的インポートするローダー
 * これにより content.js が ES Module として正しく読み込まれる
 */
(async () => {
  try {
    // Webpackでビルドされた本来のcontent.jsを動的インポート
    const src = chrome.runtime.getURL('content.js');
    await import(src);
  } catch (error) {
    console.error('[loader.js] Failed to load content.js:', error);
  }
})();
