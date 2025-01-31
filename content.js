class EndpointParser {
    constructor() {
        this.endpoints = new Set();
    }

    parseAll() {
        try {
            this.endpoints.clear();
            this.parseFromDOM();
            this.parseFromScripts();
            this.parseFromRequests();
            return Array.from(this.endpoints);
        } catch (error) {
            console.error('Error parsing endpoints:', error);
            return [];
        }
    }

    parseFromDOM() {
        const anchors = document.getElementsByTagName('a');
        const forms = document.getElementsByTagName('form');
        
        [...anchors].forEach(a => {
            if (a.href) this.addEndpoint(a.href, 'anchor');
        });

        [...forms].forEach(form => {
            if (form.action) this.addEndpoint(form.action, 'form');
        });
    }

    parseFromScripts() {
        const scripts = document.getElementsByTagName('script');
        [...scripts].forEach(script => {
            if (script.src) this.addEndpoint(script.src, 'script');
        });
    }

    parseFromRequests() {
        const entries = performance.getEntriesByType('resource');
        entries.forEach(entry => {
            this.addEndpoint(entry.name, entry.initiatorType);
        });
    }

    addEndpoint(url, source) {
        try {
            const parsedUrl = new URL(url, window.location.origin);
            if (!parsedUrl.href.includes('chrome-extension://')) {
                this.endpoints.add({
                    url: parsedUrl.href,
                    source: source,
                    timestamp: Date.now()
                });
            }
        } catch (e) {
            console.error('Invalid URL:', url);
        }
    }
}

// Create parser instance and handle messages
const parser = new EndpointParser();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "parseEndpoints") {
        const endpoints = parser.parseAll();
        chrome.storage.local.set({ endpoints }, () => {
            sendResponse({ 
                success: true, 
                count: endpoints.length 
            });
        });
        return true; // Keep message channel open for async response
    }
});