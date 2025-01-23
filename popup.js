const tabs = document.querySelectorAll('.tab-link');
const tabContent = document.getElementById('tab-content');

// Initialize main page data
function initializeMainPage() {
    const techStackData = [
        { name: 'Google Font API', version: '', cve: true },
        { name: 'MooTools', version: '1.6.0', cve: true },
        { name: 'XenForo', version: '', cve: true },
        { name: 'MySQL', version: '', cve: true }
    ];

    const wafCdnData = [
        { name: 'FortiWeb (Fortinet)', status: 'Detected' },
        { name: 'Cloudfront (Amazon)', status: 'Detected' }
    ];

    const headersData = [
        { name: 'X-XSS-Protection', description: 'X-XSS-Protection header is deprecated' }
    ];

    const storageData = [
        { type: 'Cookie', action: 'View' },
        { type: 'localStorage', action: 'View' },
        { type: 'sessionStorage', action: 'View' }
    ];

    // Populate Tech Stack
    const techStackBody = document.getElementById('techStackBody');
    if (techStackBody) {
        techStackBody.innerHTML = techStackData.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.version}</td>
                <td>${item.cve ? '<a href="#" class="view-link">View</a>' : ''}</td>
            </tr>
        `).join('');
    }

    // Populate WAF/CDN
    const wafCdnBody = document.getElementById('wafCdnBody');
    if (wafCdnBody) {
        wafCdnBody.innerHTML = wafCdnData.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.status}</td>
            </tr>
        `).join('');
    }

    // Populate Headers
    const headersBody = document.getElementById('headersBody');
    if (headersBody) {
        headersBody.innerHTML = headersData.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.description}</td>
            </tr>
        `).join('');
    }

    // Populate Storage
    const storageBody = document.getElementById('storageBody');
    if (storageBody) {
        storageBody.innerHTML = storageData.map(item => `
            <tr>
                <td>${item.type}</td>
                <td><a href="#" class="view-link">${item.action}</a></td>
            </tr>
        `).join('');
    }
}

async function initializeTab1() {
    const urlElement = document.getElementById("url");
    const ipv4Element = document.getElementById("ipv4");
    const ipv6Element = document.getElementById("ipv6");
    const nsElement = document.getElementById("ns");
    const mxElement = document.getElementById("mx");

    if (!urlElement) return; // Not on tab1

    try {
        // Get the active tab's URL
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) throw new Error("Cannot access active tab or URL.");

        const url = new URL(tab.url);
        urlElement.textContent = url.href;

        // Function to resolve DNS using Google's DoH API
        const resolveDNS = async (domain, type) => {
            const response = await fetch(`https://dns.google/resolve?name=${domain}&type=${type}`);
            if (!response.ok) throw new Error(`Error fetching ${type} records.`);
            const data = await response.json();
            return data.Answer ? data.Answer.map(record => record.data) : [];
        };

        // Resolve DNS details
        const ipv4 = await resolveDNS(url.hostname, "A");
        const ipv6 = await resolveDNS(url.hostname, "AAAA");
        const ns = await resolveDNS(url.hostname, "NS");
        const mx = await resolveDNS(url.hostname, "MX");

        // Update the UI
        ipv4Element.textContent = ipv4.join(", ") || "Not Found";
        ipv6Element.textContent = ipv6.join(", ") || "Not Found";
        nsElement.textContent = ns.join(", ") || "Not Found";
        mxElement.textContent = mx.join(", ") || "Not Found";
    } catch (error) {
        console.error(error);
        urlElement.textContent = "Error: Unable to load.";
        ipv4Element.textContent = "Error loading data.";
        ipv6Element.textContent = "Error loading data.";
        nsElement.textContent = "Error loading data.";
        mxElement.textContent = "Error loading data.";
    }
}

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

// Initialize main page on load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize main page if we're on it
    if (document.getElementById('techStackBody')) {
        initializeMainPage();
    }
});

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
                } else if (file === 'tab1.html') {
                    initializeTab1();
                }
            })
            .catch(error => {
                console.error('Error loading tab content:', error);
                tabContent.innerHTML = '<p>Error loading content. Please try again.</p>';
            });
    });
});