document.addEventListener('DOMContentLoaded', function() {
    const urlCountElement = document.getElementById('urlCount');
    const autoParseToggle = document.getElementById('autoParseToggle');
    const toggleStatus = document.getElementById('toggleStatus');
    const panelBtn = document.getElementById('panelBtn');
    const reparseBtn = document.getElementById('reparseBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const urlFilter = document.getElementById('urlFilter');
    const urlDisplay = document.getElementById('urlDisplay');

    // Get initial auto parse state from background script
    chrome.runtime.sendMessage({ action: 'getAutoParseState' }, (response) => {
        if (response && response.state !== undefined) {
            autoParseToggle.checked = response.state;
            toggleStatus.textContent = response.state ? 'ON' : 'OFF';
            toggleStatus.style.color = response.state ? '#ed8936' : '#a0aec0';
        }
    });

    // Initialize by loading current tab's URLs if needed
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab) {
            chrome.tabs.sendMessage(activeTab.id, { action: "parseEndpoints" });
        }
    });

    function downloadURLsAsTxt() {
        chrome.storage.local.get(['endpoints'], (result) => {
            const urls = result.endpoints?.map(endpoint => endpoint.url) || [];
            const blob = new Blob([urls.join('\n')], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'urls-unmodified.txt';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    function filterURLs(searchTerm) {
        chrome.storage.local.get(['endpoints'], (result) => {
            if (!result.endpoints) return;
            
            const filtered = searchTerm 
                ? result.endpoints.filter(endpoint => 
                    endpoint.url.toLowerCase().includes(searchTerm.toLowerCase()))
                : result.endpoints;
                
            displayUrls(filtered);
        });
    }

    function displayUrls(endpoints) {
        if (!endpoints || !endpoints.length) {
            urlDisplay.innerHTML = '<p class="info-text">No URLs captured</p>';
            return;
        }

        const html = endpoints.map(endpoint => `
            <div class="url-item">
                ${endpoint.url}
                <span style="color: #a0aec0; font-size: 0.8em;">[${endpoint.source || 'link'}]</span>
            </div>
        `).join('');

        urlDisplay.innerHTML = html;
    }

    // Handle auto parse toggle
    autoParseToggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.runtime.sendMessage({ 
            action: 'setAutoParseState', 
            state: isEnabled 
        });
        toggleStatus.textContent = isEnabled ? 'ON' : 'OFF';
        toggleStatus.style.color = isEnabled ? '#ed8936' : '#a0aec0';
        
        if (isEnabled) {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "parseEndpoints" });
                }
            });
        }
    });

    // Handle panel clear
    panelBtn.addEventListener('click', function() {
        chrome.storage.local.set({ endpoints: [] });
        urlCountElement.textContent = '0';
        displayUrls([]);
    });

    // Handle reparse
    reparseBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "parseEndpoints" });
            }
        });
    });

    // Handle download
    downloadBtn.addEventListener('click', downloadURLsAsTxt);

    // Handle URL filtering
    let filterTimeout;
    urlFilter.addEventListener('input', (e) => {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            filterURLs(e.target.value);
        }, 300); // Debounce the filter
    });

    // Listen for updates from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'endpointsUpdated') {
            urlCountElement.textContent = request.count;
            chrome.storage.local.get(['endpoints'], (result) => {
                displayUrls(result.endpoints);
            });
        }
    });
});