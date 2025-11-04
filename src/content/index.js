// Content Script for Yu-Gi-Oh! Deck Helper
// Runs on https://www.db.yugioh-card.com/*
// ページ上で動作するため、認証は不要（ユーザーが既にログイン済み）
console.log('Yu-Gi-Oh! Deck Helper: Content script loaded');
// ページの種類を判定
const currentUrl = window.location.href;
const isDeckPage = currentUrl.includes('member_deck.action');
const isCardSearchPage = currentUrl.includes('card_search.action');
if (isDeckPage) {
    console.log('Detected deck page');
    initDeckPageEnhancements();
}
else if (isCardSearchPage) {
    console.log('Detected card search page');
    initCardSearchEnhancements();
}
function initDeckPageEnhancements() {
    // デッキページ用の機能拡張
    // cgid, ytkn の取得（ページ内のhidden inputから）
    const cgid = extractCgid();
    const ytkn = extractYtkn();
    console.log('Deck page data:', { cgid, ytkn });
    // TODO: デッキページの機能拡張
    // - エクスポートボタンの追加
    // - デッキ編集UIの改善
    // - 履歴管理機能
}
function initCardSearchEnhancements() {
    // カード検索ページ用の機能拡張
    // TODO: カード検索の機能拡張
    // - フィルター強化
    // - クイック追加ボタン
}
function extractCgid() {
    // cgidを取得（hidden inputまたはJavaScript変数から）
    const cgidInput = document.querySelector('[name="cgid"]');
    return cgidInput?.value || null;
}
function extractYtkn() {
    // ytknを取得（hidden inputまたはJavaScript変数から）
    const ytknInput = document.querySelector('[name="ytkn"]');
    return ytknInput?.value || null;
}
function extractDeckDataFromPage() {
    // TODO: ページからデッキデータを抽出
    // DOMをパースしてデッキ情報を取得
    return {
        name: document.title,
        cards: []
    };
}
function extractCardDataFromPage() {
    // TODO: ページからカード検索結果を抽出
    return {
        results: []
    };
}
// Background scriptやpopupからのメッセージ受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    switch (request.action) {
        case 'getDeckData':
            const deckData = extractDeckDataFromPage();
            sendResponse({ deckData });
            break;
        case 'getCardData':
            const cardData = extractCardDataFromPage();
            sendResponse({ cardData });
            break;
        case 'getPageInfo':
            // ページ情報を返す
            sendResponse({
                url: window.location.href,
                isDeckPage,
                isCardSearchPage,
                cgid: extractCgid(),
                ytkn: extractYtkn()
            });
            break;
        default:
            sendResponse({ error: 'Unknown action' });
    }
});
export {};
