// Background Service Worker for Yu-Gi-Oh! Deck Helper
console.log('Yu-Gi-Oh! Deck Helper: Background service worker started');
// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);
    if (details.reason === 'install') {
        // Initialize storage on first install
        chrome.storage.local.set({
            decks: [],
            settings: {
                theme: 'light',
                autoSync: true
            }
        });
    }
});
// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    switch (request.action) {
        case 'ping':
            sendResponse({ status: 'ok' });
            break;
        case 'getDecks':
            chrome.storage.local.get(['decks'], (result) => {
                sendResponse({ decks: result.decks || [] });
            });
            return true; // Keep channel open for async response
        default:
            sendResponse({ error: 'Unknown action' });
    }
});
export {};
