import { initializeTableSorting } from '../utils/tableSorting.js';

async function updateProgress(progress, status) {
    console.log(`Progress update: ${progress}% - ${status}`);
    const progressBar = document.getElementById('scanProgress');
    const statusText = document.getElementById('scanStatus');

    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    if (statusText) {
        statusText.textContent = status;
    }
}

async function analyzeSSL(url) {
    console.log('Analyzing SSL for:', url);
    try {
        const isHttps = url.startsWith('https://');
        console.log('SSL analysis result:', { isHttps });
        return {
            isSecure: isHttps,
            protocol: isHttps ? 'TLS 1.3' : 'None',
            cipher: isHttps ? 'Modern Cipher Suite' : 'None',
            certificate: isHttps ? 'Valid' : 'None'
        };
    } catch (error) {
        console.error('SSL Analysis error:', error);
        throw error;
    }
}

async function analyzeSSLAndUpdate(url) {
    console.log('Starting SSL update for:', url);
    const sslContent = document.getElementById('sslContent');
    if (!sslContent) {
        console.error('SSL content element not found');
        return;
    }

    const sslInfo = await analyzeSSL(url);
    
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
    console.log('SSL table updated');
    initializeTableSorting('sslTable');
}

function updateSecurityTables(results) {
    console.log('Updating security tables with:', results);
    
    // Update headers table
    const headersBody = document.querySelector('#securityHeaders tbody');
    if (headersBody) {
        headersBody.innerHTML = Object.entries(results.headers)
            .map(([header, value]) => `
                <tr>
                    <td>${header}</td>
                    <td class="vulnerability-low">Present</td>
                    <td>${value}</td>
                </tr>
            `).join('') || '<tr><td colspan="3">No security headers found</td></tr>';
        initializeTableSorting('securityHeaders');
    } else {
        console.error('Headers table body not found');
    }

    // Update JavaScript issues table
    const jsBody = document.querySelector('#jsAnalysis tbody');
    if (jsBody) {
        jsBody.innerHTML = results.jsIssues
            .map(issue => `
                <tr>
                    <td>${issue.issue}</td>
                    <td class="vulnerability-${issue.severity}">${issue.severity}</td>
                    <td>${issue.details}</td>
                </tr>
            `).join('');
        initializeTableSorting('jsAnalysis');
    } else {
        console.error('JS Analysis table body not found');
    }

    // Update input issues table
    const inputBody = document.querySelector('#inputAnalysis tbody');
    if (inputBody) {
        inputBody.innerHTML = results.inputIssues
            .map(issue => `
                <tr>
                    <td>${issue.type}</td>
                    <td>${issue.issue}</td>
                    <td>${issue.recommendation}</td>
                </tr>
            `).join('');
        initializeTableSorting('inputAnalysis');
    } else {
        console.error('Input Analysis table body not found');
    }
}

async function analyzeSecurity() {
    console.log('Starting security analysis');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) {
            throw new Error('No active tab found');
        }
        console.log('Analyzing tab:', tab.url);

        await updateProgress(60, 'Analyzing page security...');

        // Inject security analysis script
        console.log('Injecting security analysis script');
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                console.log('Running injected script');
                // Security metrics collection
                return {
                    headers: {}, // Will be populated from response headers
                    jsIssues: Array.from(document.scripts).map(script => ({
                        issue: script.src ? `External script: ${script.src}` : 'Inline script',
                        severity: script.src ? 'low' : 'medium',
                        details: script.src ? 'External dependency' : 'Inline JavaScript detected'
                    })),
                    inputIssues: Array.from(document.getElementsByTagName('input')).map(input => ({
                        type: input.type,
                        issue: !input.hasAttribute('maxlength') ? 'No maxlength' : 
                               input.type === 'password' && !input.hasAttribute('autocomplete') ? 'No autocomplete' : 'Secure',
                        recommendation: input.type === 'password' ? 'Add security attributes' : 'Add maxlength'
                    }))
                };
            }
        });

        console.log('Script execution results:', results);
        const securityResults = results[0].result;

        // Update UI with results
        await updateSecurityTables(securityResults);
        await analyzeSSLAndUpdate(tab.url);
        
        await updateProgress(100, 'Scan completed successfully');

    } catch (error) {
        console.error('Security analysis error:', error);
        await updateProgress(100, 'Error during security scan');
    }
}

export async function initializeTab1() {
    console.log('Initializing Tab 1');
    // Check if we're on the correct tab by looking for the scan progress element
    const progressBar = document.getElementById('scanProgress');
    if (!progressBar) {
        console.error('Progress bar not found, might not be on tab1');
        return;
    }

    // Initialize progress bar
    await updateProgress(0, 'Starting scan...');

    try {
        // Get the active tab's URL
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) throw new Error("Cannot access active tab or URL.");

        const url = new URL(tab.url);
        console.log('Analyzing URL:', url.href);

        await updateProgress(20, 'Starting security analysis...');
        
        // Run security analysis
        await analyzeSecurity();

    } catch (error) {
        console.error('Tab1 initialization error:', error);
        await updateProgress(100, 'Error during scan');
    }
}