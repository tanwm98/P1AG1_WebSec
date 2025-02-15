// At the start of initializeTab3
export async function initializeTab3() {
    console.log("Initializing tab3...");
    
    // First, define the toggle function in the window scope
    window.toggleVulnerabilities = function(index) {
        console.log("Toggling vulnerability details for index:", index);
        const list = document.getElementById(`vuln-list-${index}`);
        const arrow = list.previousElementSibling.querySelector('.arrow');
        
        if (list && arrow) {
            if (list.style.display === 'none') {
                list.style.display = 'block';
                arrow.textContent = '▼';
                arrow.style.transform = 'rotate(0deg)';
            } else {
                list.style.display = 'none';
                arrow.textContent = '▶';
                arrow.style.transform = 'rotate(-90deg)';
            }
        } else {
            console.error("Could not find list or arrow element");
        }
    };

    // Add some CSS for smooth transitions
    const style = document.createElement('style');
    style.textContent = `
        .arrow {
            display: inline-block;
            transition: transform 0.2s ease;
            margin-right: 8px;
            font-size: 12px;
        }
        
        .field-header {
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            padding: 10px;
        }
        
        .field-header:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        
        .vulnerabilities-list {
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);


    const testButton = document.getElementById('startInputTest');
    const urlDisplay = document.querySelector('.url-display');
    const statusMessage = document.querySelector('.status-message');
    let currentUrl = '';

    async function injectContentScript(tabId) {
        try {
            console.log("Injecting content script...");
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['script/utils/inputValidator.js']
            });
            console.log("Content script injection successful");
            return true;
        } catch (error) {
            console.error("Content script injection failed:", error);
            return false;
        }
    }

    async function updateWebsiteInfo() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log("Retrieved active tab:", tab);

            if (tab) {
                currentUrl = tab.url;
                urlDisplay.textContent = currentUrl;

                if (currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://')) {
                    statusMessage.textContent = 'Status: Cannot test Chrome system pages';
                    testButton.disabled = true;
                    urlDisplay.parentElement.classList.add('error-state');
                } else {
                    // Inject content script when valid page is detected
                    const injected = await injectContentScript(tab.id);
                    if (injected) {
                        statusMessage.textContent = 'Status: Ready to test';
                        testButton.disabled = false;
                        urlDisplay.parentElement.classList.add('ready-state');
                    } else {
                        statusMessage.textContent = 'Status: Error loading test script';
                        testButton.disabled = true;
                        urlDisplay.parentElement.classList.add('error-state');
                    }
                }
            } else {
                urlDisplay.textContent = 'No active webpage detected';
                statusMessage.textContent = 'Status: Please open a webpage to test';
                testButton.disabled = true;
                urlDisplay.parentElement.classList.add('error-state');
            }
        } catch (error) {
            console.error("Error updating website info:", error);
            statusMessage.textContent = 'Status: Error getting website info';
        }
    }

    // Initial website info update
    await updateWebsiteInfo();

    testButton.addEventListener('click', async () => {
        console.log("Test button clicked for URL:", currentUrl);
        statusMessage.textContent = 'Status: Testing in progress...';
        testButton.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error("No active tab found");
            }

            // Ensure content script is injected before starting test
            const injected = await injectContentScript(tab.id);
            if (!injected) {
                throw new Error("Failed to inject test script");
            }

            // Small delay to ensure script is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Start the testing process
            chrome.tabs.sendMessage(tab.id, {
                action: "startTesting",
                url: currentUrl
            }, function (response) {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError);
                    statusMessage.textContent = 'Status: Error - Could not connect to page. Try refreshing.';
                    testButton.disabled = false;
                    return;
                }
                console.log("Message sent to content script, response:", response);
            });

        } catch (error) {
            console.error("Error during testing:", error);
            statusMessage.textContent = `Status: Error - ${error.message}`;
            testButton.disabled = false;
        }
    });

    // Listen for messages from content script
    // In your chrome.runtime.onMessage.addListener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("Received message in tab3:", message);

        switch (message.type) {
            case 'contentScriptReady':
                console.log("Content script is ready");
                statusMessage.textContent = 'Status: Ready to test';
                break;

            case 'progress':
                const progressBar = document.querySelector('.progress-fill');
                const progressValue = document.getElementById('progress-value');
                const currentField = document.getElementById('current-field');

                if (progressBar && progressValue && currentField) {
                    progressBar.style.width = `${message.progress}%`;
                    progressValue.textContent = `${Math.round(message.progress)}%`;
                    currentField.textContent = message.currentField;
                    document.getElementById('status-container').style.display = 'block';
                }
                break;

            case 'results':
                console.log("Received results:", message.results);
                displayResults(message.results);
                statusMessage.textContent = 'Status: Testing completed';
                testButton.disabled = false;
                const statusContainer = document.getElementById('status-container');
                if (statusContainer) {
                    statusContainer.style.display = 'block';
                }
                break;

            case 'error':
                console.error("Error received:", message.error);
                statusMessage.textContent = `Status: Error - ${message.error}`;
                testButton.disabled = false;
                break;
        }
    });


    // Add this function to create and show results
    function displayResults(results) {
        const resultsContainer = document.getElementById('results-container');
        const vulnerableFields = results.filter(r => r.vulnerabilities.length > 0);
        const safeFields = results.filter(r => r.vulnerabilities.length === 0);
    
        let html = `
            <div class="results-summary">
                <h3>Scan Results</h3>
                <p>Total Fields Tested: ${results.length}</p>
                <p>Vulnerable Fields: ${vulnerableFields.length}</p>
                <p>Safe Fields: ${safeFields.length}</p>
            </div>
    
            <div class="vulnerable-fields">
                <h3>Vulnerable Fields Found</h3>
                ${vulnerableFields.length === 0 ? '<p>No vulnerable fields found.</p>' : ''}
                ${vulnerableFields.map((field, index) => `
                    <div class="field-result vulnerable">
                        <div class="field-header" data-index="${index}">
                            <span class="arrow">▶</span>
                            <span class="field-name">${field.fieldName || 'Unnamed Field'} (${field.fieldType})</span>
                            <span class="vuln-count">${field.vulnerabilities.length} vulnerabilities</span>
                        </div>
                        <div class="vulnerabilities-list" id="vuln-list-${index}" style="display: none;">
                            ${field.vulnerabilities.map(vuln => `
                                <div class="vulnerability-item">
                                    <div class="vuln-type">${vuln.type}</div>
                                    <div class="vuln-description">${vuln.description}</div>
                                    <div class="vuln-details">
                                        <div class="vuln-info">
                                            ${vuln.additionalInfo ? `<div class="additional-info">${vuln.additionalInfo}</div>` : ''}
                                        </div>
                                        <div class="vuln-payload">
                                            <code>${escapeHtml(vuln.payload)}</code>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
    
            <div class="safe-fields">
                <h3>Safe Fields</h3>
                ${safeFields.map(field => `
                    <div class="field-result safe">
                        <div class="field-name">${field.fieldName || 'Unnamed Field'} (${field.fieldType})</div>
                    </div>
                `).join('')}
            </div>
        `;
    
        resultsContainer.innerHTML = html;
    
        // Add click handlers for all field headers
        const fieldHeaders = resultsContainer.querySelectorAll('.field-header');
        fieldHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                const list = document.getElementById(`vuln-list-${index}`);
                const arrow = this.querySelector('.arrow');
                
                if (list && arrow) {
                    if (list.style.display === 'none') {
                        list.style.display = 'block';
                        arrow.textContent = '▼';
                    } else {
                        list.style.display = 'none';
                        arrow.textContent = '▶';
                    }
                }
            });
        });
    
        // Add download button
        const downloadButton = document.createElement('button');
        downloadButton.className = 'download-button';
        downloadButton.textContent = 'Download Full Report';
        downloadButton.onclick = () => generateAndDownloadReport(results);
        resultsContainer.appendChild(downloadButton);
    }

    // Helper function to escape HTML for safe display
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Function to toggle vulnerability details
    window.toggleVulnerabilities = function (index) {
        const list = document.getElementById(`vuln-list-${index}`);
        const arrow = list.previousElementSibling.querySelector('.arrow');
        if (list.style.display === 'none') {
            list.style.display = 'block';
            arrow.textContent = '▼';
        } else {
            list.style.display = 'none';
            arrow.textContent = '▶';
        }
    }

    // Function to generate and download report
    function generateAndDownloadReport(results) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const vulnerableFields = results.filter(r => r.vulnerabilities.length > 0);
        const safeFields = results.filter(r => r.vulnerabilities.length === 0);

        const reportText = `
    SECURITY TEST REPORT
    ===================
    Generated: ${new Date().toLocaleString()}
    URL Tested: ${currentUrl}
    
    SUMMARY
    -------
    Total Fields Tested: ${results.length}
    Vulnerable Fields: ${vulnerableFields.length}
    Safe Fields: ${safeFields.length}
    
    VULNERABLE FIELDS
    ----------------
    ${vulnerableFields.map(field => `
    Field: ${field.fieldName || 'Unnamed Field'} (${field.fieldType})
    Vulnerabilities Found: ${field.vulnerabilities.length}
    ${field.vulnerabilities.map(vuln => `
      • Type: ${vuln.type}
        Description: ${vuln.description}
        Additional Info: ${vuln.additionalInfo || 'Not provided'}
        Validation:
        - Input Type: ${vuln.validationInfo?.inputType || field.fieldType}
        - Has Pattern Restriction: ${vuln.validationInfo?.hasPattern ? 'Yes' : 'No'}
        - Has Length Limit: ${vuln.validationInfo?.hasLengthLimit ? 'Yes' : 'No'}
        Test Payload: ${vuln.payload}
    `).join('')}
    ----------------------------------------`).join('\n')}
    
    SAFE FIELDS
    ----------
    ${safeFields.map(field => `
    Field: ${field.fieldName || 'Unnamed Field'} (${field.fieldType})`).join('\n')}
    
    RECOMMENDATIONS
    --------------
    1. Implement proper input validation for all vulnerable fields
    2. Use content security policy (CSP) to prevent XSS attacks
    3. Use parameterized queries to prevent SQL injection
    4. Sanitize all user input before processing
    5. Consider using input validation libraries or frameworks
    `;

        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-test-report-${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    console.log("Tab3 initialization complete");


}

