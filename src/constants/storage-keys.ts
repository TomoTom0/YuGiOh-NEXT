/**
 * localStorage キー定数
 *
 * 全てのlocalStorageキーは `ygoNext:` プレフィックスで統一
 * （他のサイトや拡張機能とのキー衝突を避けるため）
 */

/**
 * デッキ情報キャッシュ
 * 型: Map<デッキ番号, CachedDeckInfo>
 */
export const STORAGE_KEY_DECK_INFO_CACHE = 'ygoNext:deckInfoCache';

/**
 * デッキサムネイル
 * 型: Map<デッキ番号, Data URL>
 */
export const STORAGE_KEY_DECK_THUMBNAILS = 'ygoNext:deckThumbnails';

/**
 * デッキリスト順序
 * 型: デッキ番号配列
 */
export const STORAGE_KEY_DECK_LIST_ORDER = 'ygoNext:deckListOrder';

/**
 * 最後に使用したデッキ番号（レガシー）
 * 型: デッキ番号
 */
export const STORAGE_KEY_LAST_USED_DNO = 'ygoNext:lastUsedDno';

/**
 * 最後に使用したデッキ番号
 * 型: デッキ番号
 */
export const STORAGE_KEY_LAST_DECK_DNO = 'ygoNext:lastDeckDno';

/**
 * 拡張機能設定
 * 型: AppSettings（JSON）
 */
export const STORAGE_KEY_SETTINGS = 'ygoNext:settings';

/**
 * chrome.storage.local キー定数
 *
 * chrome.storage.local は衝突の恐れがないため、プレフィックス不要
 */

/**
 * アプリケーション設定
 * 型: AppSettings
 */
export const CHROME_STORAGE_KEY_APP_SETTINGS = 'appSettings';

/**
 * 機能設定
 * 型: FeatureSettings
 */
export const CHROME_STORAGE_KEY_FEATURE_SETTINGS = 'featureSettings';

/**
 * 末尾配置カードID
 * 型: string[]
 */
export const CHROME_STORAGE_KEY_TAIL_PLACEMENT_CARD_IDS = 'tailPlacementCardIds';

/**
 * デッキ先頭優先配置カード
 * 型: Record<string, string[]>
 */
export const CHROME_STORAGE_KEY_DECK_HEAD_PLACEMENT_CARDS = 'deck_head_placement_cards';

/**
 * ユーザーCGID
 * 型: string
 */
export const CHROME_STORAGE_KEY_USER_CGID = 'ygo-user-cgid';

/**
 * デッキリストプリロードデータ
 * 型: string (JSON)
 */
export const CHROME_STORAGE_KEY_DECK_LIST_PRELOAD = 'ygo-deck-list-preload';

/**
 * localStorage削除キーリスト（Content Script起動時に削除）
 * 型: string[]
 */
export const CHROME_STORAGE_KEY_CLEAR_LOCAL_STORAGE_KEYS = 'clearLocalStorageKeys';
