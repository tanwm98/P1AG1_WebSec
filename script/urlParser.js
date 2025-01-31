// Content script for endpoint detection
let endpoints = [];

function parseEndpoints() {
    const newEndpoints = [];
    
    // Parse links
    document.querySelectorAll('a[href]').forEach(link => {
        try {
            const url = new URL(link.href);
            if (url.protocol.startsWith('http')) {
                newEndpoints.push({
                    url: link.href,
                    source: 'link'
                });
            }
        } catch (e) {
            // Invalid URL, skip
        }
    });

    // Parse scripts
    document.querySelectorAll('script[src]').forEach(script => {
        try {
            const url = new URL(script.src);
            if (url.protocol.startsWith('http')) {
                newEndpoints.push({
                    url: script.src,
                    source: 'script'
                });
            }
        } catch (e) {
            // Invalid URL, skip
        }
    });

    // Parse images
    document.querySelectorAll('img[src]').forEach(img => {
        try {
            const url = new URL(img.src);
            if (url.protocol.startsWith('http')) {
                newEndpoints.push({
                    url: img.src,
                    source: 'image'
                });
            }
        } catch (e) {
            // Invalid URL, skip
        }
    });

    // Deduplicate endpoints
    endpoints = Array.from(new Set(newEndpoints.map(e => JSON.stringify(e))))
        .map(e => JSON.parse(e));

    // Store endpoints
    chrome.storage.local.set({ endpoints }, () => {
        // Notify about the update
        chrome.runtime.sendMessage({
            action: 'endpointsUpdated',
            count: endpoints.length,
            endpoints: endpoints
        });
    });
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "parseEndpoints") {
        parseEndpoints();
        sendResponse({ success: true });
    }
    return true;
});

// Initial parse
parseEndpoints();