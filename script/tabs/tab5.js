export function initializeTab5() {
    const elements = {
        urlCount: document.getElementById('urlCount'),
        autoParseToggle: document.getElementById('autoParseToggle'),
        toggleStatus: document.getElementById('toggleStatus'),
        panelBtn: document.getElementById('panelBtn'),
        reparseBtn: document.getElementById('reparseBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        urlFilter: document.getElementById('urlFilter'),
        urlDisplay: document.getElementById('urlDisplay')
    };

    if (!elements.urlCount) return; // Not on tab5

    initializeAutoParseState(elements);
    setupEventListeners(elements);
    setupMessageListener(elements);
    handleInitialParse();
}

function initializeAutoParseState(elements) {
    chrome.storage.local.get(['autoParseEnabled', 'endpoints'], (result) => {
        if (result.autoParseEnabled !== undefined) {
            elements.autoParseToggle.checked = result.autoParseEnabled;
            updateToggleStatus(elements.toggleStatus, result.autoParseEnabled);
        }
        if (result.endpoints) {
            updateUrlCount(elements.urlCount, result.endpoints.length);
            displayUrls(elements.urlDisplay, result.endpoints);
        }
    });
}

function setupEventListeners(elements) {
    elements.autoParseToggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.storage.local.set({ autoParseEnabled: isEnabled });
        updateToggleStatus(elements.toggleStatus, isEnabled);
        if (isEnabled) handleReparse();
    });

    elements.panelBtn.addEventListener('click', () => clearEndpoints(elements));
    elements.reparseBtn.addEventListener('click', handleReparse);
    elements.downloadBtn.addEventListener('click', downloadURLsAsTxt);

    setupUrlFilter(elements.urlFilter, elements.urlDisplay);
}

function setupUrlFilter(filterElement, displayElement) {
    let filterTimeout;
    filterElement.addEventListener('input', (e) => {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            filterURLs(e.target.value, displayElement);
        }, 300);
    });
}

function setupMessageListener(elements) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'endpointsUpdated') {
            updateUrlCount(elements.urlCount, request.count);
            chrome.storage.local.get(['endpoints'], (result) => {
                displayUrls(elements.urlDisplay, result.endpoints);
            });
        }
    });
}

function updateToggleStatus(toggleStatus, isEnabled) {
    toggleStatus.textContent = isEnabled ? 'ON' : 'OFF';
    toggleStatus.style.color = isEnabled ? '#ed8936' : '#a0aec0';
}

function updateUrlCount(urlCountElement, count) {
    urlCountElement.textContent = count;
}

function displayUrls(displayElement, endpoints) {
    if (!endpoints?.length) {
        displayElement.innerHTML = '<p class="info-text">No URLs captured</p>';
        return;
    }

    displayElement.innerHTML = endpoints.map(endpoint => `
        <div class="url-item">
            ${endpoint.url}
            <span style="color: #a0aec0; font-size: 0.8em;">[${endpoint.source || 'link'}]</span>
        </div>
    `).join('');
}

function filterURLs(searchTerm, displayElement) {
    chrome.storage.local.get(['endpoints'], (result) => {
        if (!result.endpoints) return;

        const filtered = searchTerm
            ? result.endpoints.filter(endpoint =>
                endpoint.url.toLowerCase().includes(searchTerm.toLowerCase()))
            : result.endpoints;

        displayUrls(displayElement, filtered);
    });
}

function clearEndpoints(elements) {
    chrome.storage.local.set({ endpoints: [] });
    updateUrlCount(elements.urlCount, 0);
    displayUrls(elements.urlDisplay, []);
}

function handleReparse() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id !== undefined) {
            chrome.tabs.sendMessage(activeTab.id, { action: "parseEndpoints" });
        }
    });
}

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

function handleInitialParse() {
    // Trigger initial parse when tab is loaded
    handleReparse();
}