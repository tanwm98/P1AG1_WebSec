const tabs = document.querySelectorAll('.tab-link');
const tabContent = document.getElementById('tab-content');

// Function to initialize tab5 functionality
function initializeTab5() {
    const urlCountElement = document.getElementById('urlCount');
    const autoParseToggle = document.getElementById('autoParseToggle');
    const toggleStatus = document.getElementById('toggleStatus');
    const panelBtn = document.getElementById('panelBtn');
    const reparseBtn = document.getElementById('reparseBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const urlFilter = document.getElementById('urlFilter');
    const urlDisplay = document.getElementById('urlDisplay');

    if (!urlCountElement) return; // Not on tab5

    // Get initial auto parse state
    chrome.storage.local.get(['autoParseEnabled', 'endpoints'], (result) => {
        if (result.autoParseEnabled !== undefined) {
            autoParseToggle.checked = result.autoParseEnabled;
            toggleStatus.textContent = result.autoParseEnabled ? 'ON' : 'OFF';
            toggleStatus.style.color = result.autoParseEnabled ? '#ed8936' : '#a0aec0';
        }
        if (result.endpoints) {
            urlCountElement.textContent = result.endpoints.length;
            displayUrls(result.endpoints);
        }
    });

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

    // Function to handle reparse
    function handleReparse() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const activeTab = tabs[0];
            if (activeTab && activeTab.id !== undefined) {
                chrome.tabs.sendMessage(activeTab.id, { action: "parseEndpoints" }, response => {
                    if (chrome.runtime.lastError) {
                        console.error("Error:", chrome.runtime.lastError);
                        return;
                    }
                });
            }
        });
    }

    // Event Listeners
    autoParseToggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.storage.local.set({ autoParseEnabled: isEnabled });
        toggleStatus.textContent = isEnabled ? 'ON' : 'OFF';
        toggleStatus.style.color = isEnabled ? '#ed8936' : '#a0aec0';
        
        if (isEnabled) {
            handleReparse();
        }
    });

    panelBtn.addEventListener('click', function() {
        chrome.storage.local.set({ endpoints: [] });
        urlCountElement.textContent = '0';
        displayUrls([]);
    });

    reparseBtn.addEventListener('click', handleReparse);

    downloadBtn.addEventListener('click', downloadURLsAsTxt);

    let filterTimeout;
    urlFilter.addEventListener('input', (e) => {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            filterURLs(e.target.value);
        }, 300);
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

    // Initial parse when tab5 is loaded
    handleReparse();
}

tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        const file = tab.getAttribute('data-file');

        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));

        // Add active class to the clicked tab
        tab.classList.add('active');

        // Fetch and display the content for the selected tab
        fetch(file)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(data => {
                tabContent.innerHTML = data;
                if (file === 'tab5.html') {
                    initializeTab5();
                }
            })
            .catch(error => {
                console.error('Error loading tab content:', error);
                tabContent.innerHTML = '<p>Error loading content. Please try again.</p>';
            });
    });
});