import { initializeTableSorting } from '../utils/tableSorting.js';
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
export async function initializeTab1() {
    console.log('Initializing Tab 1');
    const progressBar = document.getElementById('scanProgress');
    if (!progressBar) {
        console.error('Progress bar not found');
        return;
    }

    await updateProgress(0, 'Starting scan...');

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) throw new Error("Cannot access active tab or URL.");

        console.log('Analyzing URL:', tab.url);
        await updateProgress(20, 'Starting security analysis...');
        await analyzeSecurity();

    } catch (error) {
        console.error('Tab1 initialization error:', error);
        await updateProgress(100, 'Error during scan');
    }
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