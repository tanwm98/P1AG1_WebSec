console.log('Input Validator content script loading...');

// Announce that we're loaded
chrome.runtime.sendMessage({ 
    type: 'contentScriptReady',
    url: window.location.href
});

const testCases = {
    xss: {
        name: 'Cross-Site Scripting (XSS)',
        tests: [
            { payload: '<script>alert(1)</script>', description: 'Basic XSS' },
            { payload: '"><script>alert(1)</script>', description: 'Attribute XSS' },
            { payload: 'javascript:alert(1)', description: 'Protocol XSS' }
        ]
    },
    sqli: {
        name: 'SQL Injection',
        tests: [
            { payload: "' OR '1'='1", description: 'Basic SQLi' },
            { payload: '" OR "1"="1', description: 'Double Quote SQLi' },
            { payload: '1; DROP TABLE users--', description: 'Command SQLi' }
        ]
    },
    special: {
        name: 'Special Characters',
        tests: [
            { payload: '@#$%^&*()', description: 'Basic Special Chars' },
            { payload: '§±!@£$%^&*()', description: 'Extended Special Chars' }
        ]
    }
};

async function testInputField(input, test) {
    try {
        console.log(`Testing field: ${input.name || input.id || 'unnamed'} with payload: ${test.payload}`);
        const originalValue = input.value;
        input.value = test.payload;
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const accepted = input.value === test.payload;
        input.value = originalValue;
        
        console.log(`Test result for ${input.name || input.id}: ${accepted ? 'Vulnerable' : 'Safe'}`);
        return accepted;
    } catch (error) {
        console.error('Error testing input field:', error);
        return false;
    }
}

async function runTests() {
    try {
        console.log('Starting test run');
        const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
        console.log(`Found ${inputs.length} input fields to test`);
        
        const results = [];
        let testsCompleted = 0;
        const totalTests = inputs.length * Object.entries(testCases).reduce(
            (acc, [_, category]) => acc + category.tests.length, 0
        );
        
        for (const input of inputs) {
            const fieldResult = {
                fieldName: input.name || input.id || 'unnamed',
                fieldType: input.type || 'text',
                vulnerabilities: []
            };
            
            for (const [category, testSet] of Object.entries(testCases)) {
                for (const test of testSet.tests) {
                    const isVulnerable = await testInputField(input, test);
                    
                    if (isVulnerable) {
                        fieldResult.vulnerabilities.push({
                            type: testSet.name,
                            description: test.description,
                            payload: test.payload
                        });
                    }
                    
                    testsCompleted++;
                    chrome.runtime.sendMessage({
                        type: 'progress',
                        progress: (testsCompleted / totalTests) * 100,
                        currentField: fieldResult.fieldName
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            results.push(fieldResult);
        }
        
        chrome.runtime.sendMessage({
            type: 'results',
            results: results
        });
        
    } catch (error) {
        console.error('Error in runTests:', error);
        chrome.runtime.sendMessage({
            type: 'error',
            error: error.message
        });
    }
}

// Listen for messages with improved error handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    if (message.action === "startTesting") {
        console.log('Starting input field testing process');
        try {
            // Send immediate acknowledgment
            sendResponse({ status: 'received' });
            
            // Start testing process
            const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
            console.log(`Found ${inputs.length} input fields to test`);
            
            // Send initial progress
            chrome.runtime.sendMessage({
                type: 'progress',
                progress: 0,
                currentField: 'Starting test...'
            });
            
            // Begin testing
            runTests(inputs);
            
            return true; // Keep the message channel open
        } catch (error) {
            console.error('Error in message handler:', error);
            chrome.runtime.sendMessage({
                type: 'error',
                error: error.message
            });
        }
    }
});

// Announce that content script is loaded
chrome.runtime.sendMessage({
    type: 'contentScriptLoaded',
    url: window.location.href
});

console.log('Input Validator content script loaded completely');