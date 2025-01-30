function findURLsInPage() {
    const urls = [];
    
    // Get all links
    document.querySelectorAll('a[href]').forEach(link => {
        if (link.href && !link.href.startsWith('javascript:')) {
            try {
                const url = new URL(link.href);
                urls.push({
                    url: link.href,
                    source: 'link',
                    type: 'regular'
                });
            } catch (e) {
                // Skip invalid URLs
            }
        }
    });

    // Get form actions
    document.querySelectorAll('form[action]').forEach(form => {
        if (form.action && !form.action.startsWith('javascript:')) {
            try {
                const url = new URL(form.action);
                urls.push({
                    url: form.action,
                    source: 'form',
                    type: 'form'
                });
            } catch (e) {
                // Skip invalid URLs
            }
        }
    });

    // Remove duplicates
    const uniqueUrls = Array.from(new Set(urls.map(u => u.url)))
        .map(url => urls.find(u => u.url === url));

    return uniqueUrls;
}

// Listen for parse requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "parseEndpoints") {
        const urls = findURLsInPage();
        chrome.storage.local.set({ endpoints: urls }, () => {
            chrome.runtime.sendMessage({
                action: 'endpointsUpdated',
                count: urls.length
            });
        });
        sendResponse({ success: true });
    }
    return true;
});