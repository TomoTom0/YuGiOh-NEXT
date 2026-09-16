/**
 * style-loader のカスタム挿入先モジュール（TASK-510: document_start 対応）
 *
 * style-loader 4.x のデフォルト挿入先（runtime/insertBySelector.js）は
 * document.querySelector("head") に固定されている。manifest の run_at:
 * document_start で content.js が評価されるとき head が未生成の場合があり、
 * その場合は style target 未発見の例外となり content.js のモジュール評価全体が
 * 失敗する（notifyStart 未到達 -> フェイルセーフ発火 -> 編集UIが起動しない）。
 *
 * 本モジュールを webpack.config.cjs の style-loader options.insert（絶対パス）に
 * 指定することで、head が無いときは documentElement へ直付けする
 * （public/loader.js の early-hide/overlay と同一フォールバック）。
 * head が存在する場合はデフォルトと同じ位置へ挿入されるため、popup/options 等の
 * 通常ページ（HTML文書）では挙動が変わらない。
 */
module.exports = function insertStyleElement(styleElement) {
  var parent = document.head || document.documentElement;
  parent.appendChild(styleElement);
};
