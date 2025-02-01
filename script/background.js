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
    } else if (request.type === 'FETCH_URL') {
        console.log('Background script fetching:', request.url);
        fetch(request.url)
            .then(async response => {
                const text = await response.text();
                console.log('Fetch succeeded, text length:', text.length);
                sendResponse({ ok: true, text });
            })
            .catch(error => {
                console.error('Background fetch error:', error);
                sendResponse({ ok: false, error: error.message });
            });
        return true; // Keep message channel open
    }
    // No final return needed here.
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

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('code-modal')) {
    e.target.style.display = 'none';
  }
});
