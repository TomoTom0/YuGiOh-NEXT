// Popup script for Yu-Gi-Oh! Deck Helper
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded');
    await updateStatus();
    await loadDeckCount();
    setupEventListeners();
});
async function updateStatus() {
    const extensionStatus = document.getElementById('extensionStatus');
    const siteStatus = document.getElementById('siteStatus');
    if (extensionStatus) {
        extensionStatus.textContent = '起動中';
        extensionStatus.className = 'status-value online';
    }
    // 現在のタブが公式サイトかチェック
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url?.includes('db.yugioh-card.com')) {
            if (siteStatus) {
                siteStatus.textContent = '公式サイト上';
                siteStatus.className = 'status-value online';
            }
        }
        else {
            if (siteStatus) {
                siteStatus.textContent = '他のサイト';
                siteStatus.className = 'status-value offline';
            }
        }
    }
    catch (error) {
        console.error('Error checking site status:', error);
    }
}
async function loadDeckCount() {
    try {
        const result = await chrome.storage.local.get(['decks']);
        const decks = result.decks || [];
        const deckCountElement = document.getElementById('deckCount');
        if (deckCountElement) {
            deckCountElement.textContent = decks.length.toString();
        }
    }
    catch (error) {
        console.error('Error loading deck count:', error);
    }
}
function setupEventListeners() {
    // デッキ管理ボタン
    const openDeckManagerBtn = document.getElementById('openDeckManager');
    if (openDeckManagerBtn) {
        openDeckManagerBtn.addEventListener('click', () => {
            chrome.tabs.create({
                url: 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4&wname=MemberDeck'
            });
        });
    }
    // 同期ボタン
    const syncDecksBtn = document.getElementById('syncDecks');
    if (syncDecksBtn) {
        syncDecksBtn.addEventListener('click', async () => {
            await syncWithCurrentPage();
        });
    }
    // 設定ボタン
    const openSettingsBtn = document.getElementById('openSettings');
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            alert('設定画面は開発中です');
        });
    }
}
async function syncWithCurrentPage() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url?.includes('db.yugioh-card.com')) {
            alert('遊戯王公式サイトを開いてから同期してください');
            return;
        }
        // Content scriptにメッセージを送信
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'getPageInfo'
        });
        console.log('Page info:', response);
        // ユーザー主導でエクスポートする：クリップボードへコピーとJSONファイルをダウンロード
        try {
            const json = JSON.stringify(response, null, 2);
            // クリップボードコピー（ポップアップのコンテキストでは navigator.clipboard が使える）
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(json);
                alert('ページ情報をクリップボードにコピーしました');
            }
            else {
                // フォールバック：ダウンロードのみ
                downloadJson(json, 'page-info.json');
                alert('ページ情報をファイルに保存しました');
            }
            // 常にダウンロードも行う
            downloadJson(json, 'page-info.json');
        }
        catch (err) {
            console.error('Export error:', err);
            alert('ページ情報のエクスポートに失敗しました');
        }
    }
    catch (error) {
        console.error('Sync error:', error);
        alert('エラーが発生しました');
    }
}
function downloadJson(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
// Background scriptとの接続確認
chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
    console.log('Background connection test:', response);
});
export {};
