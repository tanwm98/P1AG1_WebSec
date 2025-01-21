document.addEventListener('DOMContentLoaded', function() {
    const urlCountElement = document.getElementById('urlCount');
    const autoParseToggle = document.getElementById('autoParseToggle');
    const toggleStatus = document.getElementById('toggleStatus');
    const panelBtn = document.getElementById('panelBtn');
    const reparseBtn = document.getElementById('reparseBtn');

    // Load saved state
    chrome.storage.local.get(['autoParseEnabled', 'endpoints'], (result) => {
        if (result.autoParseEnabled !== undefined) {
            autoParseToggle.checked = result.autoParseEnabled;
            toggleStatus.textContent = result.autoParseEnabled ? 'ON' : 'OFF';
            toggleStatus.style.color = result.autoParseEnabled ? '#ed8936' : '#a0aec0';
        }
        if (result.endpoints) {
            urlCountElement.textContent = result.endpoints.length;
        }
    });

    // Handle auto parse toggle
    autoParseToggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.storage.local.set({ autoParseEnabled: isEnabled });
        toggleStatus.textContent = isEnabled ? 'ON' : 'OFF';
        toggleStatus.style.color = isEnabled ? '#ed8936' : '#a0aec0';
    });

    // Handle panel clear
    panelBtn.addEventListener('click', function() {
        chrome.storage.local.set({ endpoints: [] });
        urlCountElement.textContent = '0';
    });

    // Handle reparse
    reparseBtn.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "parseEndpoints" });
            }
        });
    });

    // Listen for updates from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'endpointsUpdated') {
            urlCountElement.textContent = request.count;
        }
    });
});