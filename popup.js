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
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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
    autoParseToggle.addEventListener('change', function () {
        const isEnabled = this.checked;
        chrome.storage.local.set({ autoParseEnabled: isEnabled });
        toggleStatus.textContent = isEnabled ? 'ON' : 'OFF';
        toggleStatus.style.color = isEnabled ? '#ed8936' : '#a0aec0';

        if (isEnabled) {
            handleReparse();
        }
    });

    panelBtn.addEventListener('click', function () {
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
document.addEventListener('DOMContentLoaded', function () {
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

// DAST functionality
async function updateProgress(progress, status) {
    const progressBar = document.getElementById('scanProgress');
    const statusText = document.getElementById('scanStatus');

    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    if (statusText) {
        statusText.textContent = status;
    }
}

async function analyzeSecurity() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
        await updateProgress(100, 'Error: No active tab found');
        return;
    }

    await updateProgress(10, 'Initializing security scan...');

    // Inject security analysis script
    async function injectSecurityCheck() {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                // Collect security metrics
                const metrics = {
                    headers: {},
                    jsIssues: [],
                    inputIssues: []
                };

                // Check security headers
                const headerElements = document.getElementsByTagName('meta');
                for (const element of headerElements) {
                    const httpEquiv = element.getAttribute('http-equiv');
                    if (httpEquiv) {
                        metrics.headers[httpEquiv] = element.getAttribute('content');
                    }
                }

                // Analyze JavaScript security
                const scripts = document.getElementsByTagName('script');
                for (const script of scripts) {
                    if (!script.src) {
                        if (script.innerText.includes('eval(')) {
                            metrics.jsIssues.push({
                                issue: 'Unsafe eval() usage detected',
                                severity: 'high',
                                details: 'eval() can execute arbitrary JavaScript'
                            });
                        }
                        if (script.innerText.includes('innerHTML')) {
                            metrics.jsIssues.push({
                                issue: 'innerHTML usage found',
                                severity: 'medium',
                                details: 'Potential XSS vulnerability'
                            });
                        }
                    } else {
                        metrics.jsIssues.push({
                            issue: `External script: ${script.src}`,
                            severity: 'low',
                            details: 'External script dependency'
                        });
                    }
                }

                // Analyze input security
                const inputs = document.getElementsByTagName('input');
                for (const input of inputs) {
                    if (input.type === 'password') {
                        if (!input.hasAttribute('autocomplete')) {
                            metrics.inputIssues.push({
                                type: 'password',
                                issue: 'Missing autocomplete attribute',
                                recommendation: 'Add autocomplete="new-password"'
                            });
                        }
                    }
                    if (!input.hasAttribute('maxlength')) {
                        metrics.inputIssues.push({
                            type: input.type,
                            issue: 'No maxlength attribute',
                            recommendation: 'Add maxlength to prevent overflow'
                        });
                    }
                }

                return metrics;
            }
        });

        return results[0].result;
    }

    try {
        const securityResults = await injectSecurityCheck();

        await updateProgress(50, 'Analyzing security headers...');

        // Update headers table
        const headersBody = document.getElementById('securityHeaders')?.querySelector('tbody');
        if (headersBody) {
            headersBody.innerHTML = Object.entries(securityResults.headers)
                .map(([header, value]) => `
                    <tr>
                        <td>${header}</td>
                        <td class="vulnerability-low">Present</td>
                        <td>${value}</td>
                    </tr>
                `).join('') || '<tr><td colspan="3">No security headers found</td></tr>';
        }

        await updateProgress(70, 'Analyzing JavaScript security...');

        // Update JavaScript issues table
        const jsBody = document.getElementById('jsAnalysis')?.querySelector('tbody');
        if (jsBody) {
            jsBody.innerHTML = securityResults.jsIssues
                .map(issue => `
                    <tr>
                        <td>${issue.issue}</td>
                        <td class="vulnerability-${issue.severity}">${issue.severity}</td>
                        <td>${issue.details}</td>
                    </tr>
                `).join('') || '<tr><td colspan="3">No JavaScript issues found</td></tr>';
        }

        await updateProgress(90, 'Analyzing input fields...');



        // Update input issues table
        const inputBody = document.getElementById('inputAnalysis')?.querySelector('tbody');
        if (inputBody) {
            inputBody.innerHTML = securityResults.inputIssues
                .map(issue => `
                    <tr>
                        <td>${issue.type}</td>
                        <td>${issue.issue}</td>
                        <td>${issue.recommendation}</td>
                    </tr>
                `).join('') || '<tr><td colspan="3">No input field issues found</td></tr>';
        }

        const sslContent = document.getElementById('sslContent');
        if (sslContent) {
            await updateProgress(95, 'Analyzing SSL/TLS configuration...');
            const sslInfo = await analyzeSSL(tab.url);
            await updateSSLContent(sslContent, sslInfo);
        }

        await updateProgress(100, `Scan completed at ${new Date().toLocaleTimeString()}`);

    } catch (error) {
        console.error('Security analysis error:', error);
        await updateProgress(100, 'Error during security scan');
    }
    initializeTableSorting('securityHeaders');
    initializeTableSorting('jsAnalysis');
    initializeTableSorting('inputAnalysis');
}

// Add DAST initialization to the existing tab1 initialization
const originalInitializeTab1 = initializeTab1;
initializeTab1 = async function () {
    await originalInitializeTab1();
    if (document.querySelector('.scan-progress')) {
        try {
            await analyzeSecurity();
        } catch (error) {
            console.error('Error during security analysis:', error);
            const statusElement = document.getElementById('scanStatus');
            if (statusElement) {
                statusElement.textContent = 'Error during scan: ' + error.message;
            }
        }
    }
};

// Add this function for table sorting
function initializeTableSorting(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const thead = table.querySelector('thead');
    if (!thead) return;

    const headers = thead.querySelectorAll('th');
    headers.forEach((header, index) => {
        if (index === 0) {
            const tbody = table.querySelector('tbody');
            if (tbody) {
                table.dataset.originalContent = tbody.innerHTML;
            }
        }

        header.style.cursor = 'pointer';
        // Create a span for the sort indicator with no initial content
        const sortIndicator = document.createElement('span');
        sortIndicator.className = 'sort-indicator';
        header.appendChild(sortIndicator);
        header.dataset.sortState = 'null';

        header.addEventListener('click', () => {
            const tbody = table.querySelector('tbody');
            if (!tbody) return;

            headers.forEach(h => {
                if (h !== header) {
                    h.dataset.sortState = 'null';
                    h.querySelector('.sort-indicator').innerHTML = '';
                }
            });

            const currentState = header.dataset.sortState;
            let newState = currentState === 'null' ? 'asc' : 
                          currentState === 'asc' ? 'desc' : 'null';
            
            header.dataset.sortState = newState;
            const indicator = header.querySelector('.sort-indicator');
            
            // Use HTML entities for arrows
            if (newState === 'null') {
                indicator.style.display = 'none';
                indicator.innerHTML = '';
            } else {
                indicator.style.display = 'inline-block';
                indicator.innerHTML = newState === 'asc' ? '&#x25B2;' : '&#x25BC;';  // Up and down triangles
            }

            if (newState === 'null') {
                tbody.innerHTML = table.dataset.originalContent;
            } else {
                const rows = Array.from(tbody.querySelectorAll('tr'));
                rows.sort((rowA, rowB) => {
                    const cellA = rowA.cells[index].textContent.trim();
                    const cellB = rowB.cells[index].textContent.trim();
                    
                    if (cellA.match(/high|medium|low/i)) {
                        const severityOrder = { high: 1, medium: 2, low: 3 };
                        const valueA = severityOrder[cellA.toLowerCase()] || 0;
                        const valueB = severityOrder[cellB.toLowerCase()] || 0;
                        return newState === 'asc' ? valueA - valueB : valueB - valueA;
                    }
                    
                    return newState === 'asc' ? 
                           cellA.localeCompare(cellB) : 
                           cellB.localeCompare(cellA);
                });
                
                tbody.innerHTML = '';
                rows.forEach(row => tbody.appendChild(row));
            }
        });
    });
}

// Add SSL/TLS analysis functions
async function analyzeSSL(url) {
    try {
        const isHttps = url.startsWith('https://');
        const securityInfo = await fetch(url, { method: 'HEAD' })
            .then(response => ({
                protocol: isHttps ? 'TLS 1.3' : 'None',
                cipher: isHttps ? 'Modern Cipher Suite' : 'None',
                certificate: isHttps ? 'Valid' : 'None'
            }))
            .catch(() => ({
                protocol: 'Unknown',
                cipher: 'Unknown',
                certificate: 'Unknown'
            }));

        return {
            isSecure: isHttps,
            ...securityInfo
        };
    } catch (error) {
        console.error('SSL Analysis error:', error);
        return {
            isSecure: false,
            protocol: 'Error',
            cipher: 'Error',
            certificate: 'Error'
        };
    }
}

async function updateSSLContent(sslContent, sslInfo) {
    if (!sslContent) return;

    const severityClass = sslInfo.isSecure ? 'vulnerability-low' : 'vulnerability-high';
    const status = sslInfo.isSecure ? 'Secure' : 'Insecure';

    sslContent.innerHTML = `
        <table class="security-table" id="sslTable">
            <thead>
                <tr>
                    <th>Property</th>
                    <th>Status</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Connection</td>
                    <td class="${severityClass}">${status}</td>
                    <td>${sslInfo.protocol}</td>
                </tr>
                <tr>
                    <td>Protocol</td>
                    <td class="${severityClass}">${sslInfo.protocol}</td>
                    <td>${sslInfo.cipher}</td>
                </tr>
                <tr>
                    <td>Certificate</td>
                    <td class="${severityClass}">${sslInfo.certificate}</td>
                    <td>${sslInfo.isSecure ? 'Valid SSL Certificate' : 'No SSL Certificate'}</td>
                </tr>
            </tbody>
        </table>
    `;

    initializeTableSorting('sslTable');
}