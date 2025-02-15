// script/tabs/mainTab.js

function populateTable(tableId, data, rowTemplate) {
    const tableBody = document.getElementById(tableId);
    if (!tableBody) {
        console.error(`Table body with id ${tableId} not found`);
        return;
    }

    try {
        tableBody.innerHTML = data.map(rowTemplate).join('');
    } catch (error) {
        console.error(`Error populating table ${tableId}:`, error);
        tableBody.innerHTML = '<tr><td colspan="3">Error loading data</td></tr>';
    }
}

export function initializeMainPage() {
    // Technology Stack Detection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log('Active tabs:', tabs); // Debug log
        const activeTab = tabs[0];
        if (!activeTab?.id) {
            console.error('No active tab found');
            populateTable('techStackBody', [{
                name: 'Error',
                version: 'No active tab found',
                cve: null
            }]);
            return;
        }

        console.log('Sending detectTechnologies message to tab:', activeTab.id);
        chrome.tabs.sendMessage(activeTab.id, { action: "detectTechnologies" }, (response) => {
            console.log('Raw response:', response); // Debug log

            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                populateTable('techStackBody', [{
                    name: 'Error',
                    version: 'Failed to detect technologies',
                    cve: null
                }]);
                return;
            }

            if (!response || !response.technologies) {
                console.error('Invalid response format:', response);
                populateTable('techStackBody', [{
                    name: 'Error',
                    version: 'No technologies detected',
                    cve: null
                }]);
                return;
            }

            console.log('Technologies to display:', response.technologies);
            const technologies = response.technologies;

            if (technologies.length === 0) {
                populateTable('techStackBody', [{
                    name: 'No technologies detected',
                    version: 'N/A',
                    cve: null
                }]);
                return;
            }

            populateTable('techStackBody', technologies, row => `
                <tr>
                    <td>${row.name || 'Unknown'}</td>
                    <td>${row.version || 'N/A'}</td>
                    <td>${row.cve ? `<a href="#" class="view-link" data-cve="${row.cve}">View</a>` : 'N/A'}</td>
                </tr>
            `);
        });
    });

    // WAF/CDN Detection
    const wafCdnData = [
        { name: 'WAF Detection', status: 'Scanning...' },
        { name: 'CDN Detection', status: 'Scanning...' }
    ];

    // OWASP Headers Check
    const headersData = [
        { name: 'Security Headers', description: 'Scanning...' }
    ];

    // Storage/Auth Analysis
    const storageData = [
        { type: 'Cookie Storage', action: 'Analyze' },
        { type: 'Local Storage', action: 'Analyze' },
        { type: 'Session Storage', action: 'Analyze' }
    ];

    // Populate initial data
    populateTable('wafCdnBody', wafCdnData, row => `
        <tr>
            <td>${row.name}</td>
            <td class="status-cell">${row.status}</td>
        </tr>
    `);

    populateTable('headersBody', headersData, row => `
        <tr>
            <td>${row.name}</td>
            <td class="description-cell">${row.description}</td>
        </tr>
    `);

    populateTable('storageBody', storageData, row => `
        <tr>
            <td>${row.type}</td>
            <td><a href="#" class="view-link" data-type="${row.type.toLowerCase()}">${row.action}</a></td>
        </tr>
    `);

    // Add event listeners for view links
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('view-link')) {
            event.preventDefault();
            const type = event.target.dataset.type;
            const cve = event.target.dataset.cve;

            if (cve) {
                showCVEDetails(cve);
            } else if (type) {
                showStorageDetails(type);
            }
        }
    });
}

function showCVEDetails(cve) {
    // Implement CVE details modal
    console.log('Showing CVE details for:', cve);
}

function showStorageDetails(type) {
    // Implement storage details modal
    console.log('Showing storage details for:', type);
}