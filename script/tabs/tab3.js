export async function initializeTab3() {
    console.log("Initializing tab3...");
    
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
            }, function(response) {
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
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("Received message in tab3:", message);
        
        switch(message.type) {
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
                
            case 'complete':
                statusMessage.textContent = 'Status: Testing completed';
                testButton.disabled = false;
                break;
                
            case 'error':
                statusMessage.textContent = `Status: Error - ${message.error}`;
                testButton.disabled = false;
                break;
        }
    });

    console.log("Tab3 initialization complete");
}