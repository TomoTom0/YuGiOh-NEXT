/**
 * Console オブジェクトの拡張定義
 *
 * 一時的なデバッグログ用の console.temp() エイリアスを追加
 */

declare global {
  interface Console {
    /**
     * 一時的なデバッグログ（console.debug のエイリアス）
     *
     * 利用後は必ず削除するか console.debug に変更すること
     *
     * @param message - ログメッセージ
     * @param optionalParams - 追加パラメータ
     *
     * @example
     * console.temp('[DEBUG] Temporary log:', data);
     * // 使用後は削除または以下に変更：
     * console.debug('[DEBUG] Temporary log:', data);
     */
    temp: typeof console.debug;
  }
}

export {};
