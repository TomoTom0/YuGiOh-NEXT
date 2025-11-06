/**
 * 開発用APIテストスクリプト
 *
 * 使い方:
 * 1. dev/session.example.env を .env.local にコピー
 * 2. ブラウザでログインしてセッション情報を取得
 * 3. .env.local に設定
 * 4. npx tsx dev/test-api.ts
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
// .env.local から環境変数を読み込み
dotenv.config({ path: resolve(__dirname, '../.env.local') });
const BASE_URL = 'https://www.db.yugioh-card.com/yugiohdb';
// セッション情報
const COOKIES = {
    JSESSIONID: process.env.JSESSIONID || '',
    AWSALB: process.env.AWSALB || '',
    AWSALBCORS: process.env.AWSALBCORS || '',
};
const CGID = process.env.CGID || '';
const YTKN = process.env.YTKN || '';
/**
 * Cookie文字列を生成
 */
function buildCookieString() {
    return Object.entries(COOKIES)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
}
/**
 * デッキ一覧を取得
 */
async function testGetDeckList() {
    console.log('📋 デッキ一覧取得テスト...');
    if (!CGID) {
        console.error('❌ CGIDが設定されていません');
        return;
    }
    const url = `${BASE_URL}/member_deck.action?ope=4&wname=MemberDeck&cgid=${CGID}`;
    try {
        const response = await fetch(url, {
            headers: {
                'Cookie': buildCookieString(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });
        if (!response.ok) {
            console.error(`❌ HTTPエラー: ${response.status}`);
            return;
        }
        const html = await response.text();
        // 簡易的な確認
        if (html.includes('ログイン')) {
            console.error('❌ セッションが無効です（ログインが必要）');
        }
        else if (html.includes('デッキ') || html.includes('Deck')) {
            console.log('✅ デッキページの取得に成功');
            console.log(`📄 HTMLサイズ: ${html.length} bytes`);
            // デッキ数を概算（暫定）
            const deckMatches = html.match(/deck/gi);
            console.log(`🎴 "deck"の出現回数: ${deckMatches?.length || 0}`);
        }
        else {
            console.warn('⚠️ 想定外のレスポンス');
        }
        // HTMLを一時ファイルに保存（デバッグ用）
        const fs = await import('fs/promises');
        await fs.writeFile(resolve(__dirname, '../tmp/deck-list.html'), html);
        console.log('💾 HTMLを tmp/deck-list.html に保存しました');
    }
    catch (error) {
        console.error('❌ エラー:', error);
    }
}
/**
 * カード検索をテスト
 */
async function testCardSearch() {
    console.log('\n🔍 カード検索テスト...');
    const url = `${BASE_URL}/card_search.action?ope=1&sess=1&rp=10&keyword=ブラック・マジシャン`;
    try {
        const response = await fetch(url, {
            headers: {
                'Cookie': buildCookieString(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });
        if (!response.ok) {
            console.error(`❌ HTTPエラー: ${response.status}`);
            return;
        }
        const html = await response.text();
        console.log('✅ カード検索の取得に成功');
        console.log(`📄 HTMLサイズ: ${html.length} bytes`);
        // HTMLを保存
        const fs = await import('fs/promises');
        await fs.writeFile(resolve(__dirname, '../tmp/card-search.html'), html);
        console.log('💾 HTMLを tmp/card-search.html に保存しました');
    }
    catch (error) {
        console.error('❌ エラー:', error);
    }
}
/**
 * メイン処理
 */
async function main() {
    console.log('🚀 遊戯王DB APIテスト開始\n');
    // 設定チェック
    console.log('⚙️ 設定確認:');
    console.log(`  JSESSIONID: ${COOKIES.JSESSIONID ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`  CGID: ${CGID ? '✅ 設定済み' : '⚠️ 未設定（デッキAPI使用不可）'}`);
    console.log(`  YTKN: ${YTKN ? '✅ 設定済み' : '⚠️ 未設定（デッキ編集不可）'}`);
    console.log('');
    if (!COOKIES.JSESSIONID) {
        console.error('❌ JSESSIONIDが設定されていません');
        console.log('💡 .env.local を作成してセッション情報を設定してください');
        return;
    }
    // tmpディレクトリ作成
    const fs = await import('fs/promises');
    await fs.mkdir(resolve(__dirname, '../tmp'), { recursive: true });
    // テスト実行
    await testCardSearch();
    if (CGID) {
        await testGetDeckList();
    }
    else {
        console.log('\n⚠️ CGIDが未設定のため、デッキAPIテストはスキップしました');
    }
    console.log('\n✨ テスト完了');
}
// 実行
main().catch(console.error);
