/**
 * Webpackの__webpack_public_path__を設定
 * Chrome拡張の動的チャンクを正しく読み込むための設定
 */

// Webpackが認識する特別な変数
// eslint-disable-next-line no-undef, @typescript-eslint/ban-ts-comment
// @ts-ignore
__webpack_public_path__ = chrome.runtime.getURL('');
