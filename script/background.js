let isAutoParserEnabled = false;
function parseEndpointsForCurrentTab() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.id !== undefined && activeTab.url?.startsWith('http')) {
            chrome.tabs.sendMessage(activeTab.id, { action: "parseEndpoints" });
        }
    });
}

// Add this listener for when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    if (tab.url?.startsWith('http')) {
        parseEndpointsForCurrentTab();
    }
});
// Load initial state
chrome.storage.local.get(['autoParseEnabled'], (result) => {
    isAutoParserEnabled = result.autoParseEnabled || false;
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'endpointsUpdated') {
        // Forward messages to the popup if it's open
        chrome.runtime.sendMessage(request);
    }
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