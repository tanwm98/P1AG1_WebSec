let isAutoParserEnabled = false;

// Load initial state
chrome.storage.local.get(['autoParseEnabled'], (result) => {
    isAutoParserEnabled = result.autoParseEnabled || false;
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'endpointsUpdated') {
        try {
            chrome.runtime.sendMessage(request);
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error forwarding message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Keep message channel open for async response
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
        chrome.storage.local.get(['autoParseEnabled'], (result) => {
            if (result.autoParseEnabled) {
                chrome.tabs.sendMessage(tabId, { action: "parseEndpoints" });
            }
        });
    }
});

// Add icon click handler
chrome.action.onClicked.addListener((tab) => {
    if (tab.url?.startsWith('http')) {
        chrome.tabs.sendMessage(tab.id, { action: "parseEndpoints" });
    }
});