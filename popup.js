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

// Initialize main page on load
document.addEventListener('DOMContentLoaded', function() {
    // Trigger endpoint parsing immediately when popup opens
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.id !== undefined && activeTab.url?.startsWith('http')) {
            chrome.tabs.sendMessage(activeTab.id, { action: "parseEndpoints" });
        }
    });
    
    // Initialize main page if we're on it
    if (document.getElementById('techStackBody')) {
        initializeMainPage();
    }
});

// Handle tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', async (e) => {
        e.preventDefault();
        const file = tab.getAttribute('data-file');
        console.log('Loading tab:', file);

        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));

        // Add active class to clicked tab
        tab.classList.add('active');

        try {
            // Get the full URL for the HTML file
            const tabUrl = chrome.runtime.getURL(file);
            console.log('Tab URL:', tabUrl);

            // Fetch the HTML content
            const response = await fetch(tabUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.text();
            
            // Update the content
            tabContent.innerHTML = data;

            // Initialize tab functionality
            if (file === 'tab1.html') {
                try {
                    console.log('Importing tab1.js module...');
                    const tab1Module = await import('./script/tabs/tab1.js');
                    console.log('Import successful, initializing tab1...');
                    await tab1Module.initializeTab1();
                } catch (importError) {
                    console.error('Error importing tab1 module:', importError);
                    throw importError;
                }
            } else if (file === 'tab3.html') {
                try {
                    console.log('Importing tab3.js module...');
                    const tab3Module = await import('./script/tabs/tab3.js');
                    console.log('Import successful, initializing tab3...');
                    if (tab3Module.initializeTab3) {
                        await tab3Module.initializeTab3();
                    } else {
                        console.error('initializeTab3 function not found in module');
                    }
                } catch (importError) {
                    console.error('Error importing tab3 module:', importError);
                    throw importError;
                }
            } else if (file === 'tab5.html') {
                try {
                    const tab5Module = await import('./script/tabs/tab5.js');
                    await tab5Module.initializeTab5();
                } catch (importError) {
                    console.error('Error importing tab5 module:', importError);
                    throw importError;
                }
            }
        } catch (error) {
            console.error('Error loading tab content:', error);
            tabContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
        }
    });
});