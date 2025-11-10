/**
 * セッション情報
 */
export interface SessionInfo {
  /** ユーザー識別子（32文字hex） */
  cgid: string;
  /** CSRFトークン（64文字hex、ページ遷移ごとに変わる） */
  ytkn: string;
}
