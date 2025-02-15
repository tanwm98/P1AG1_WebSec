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
            { payload: '<script>alert(1)</script>', description: 'Basic XSS', type: 'xss' },
            { payload: '"><script>alert(1)</script>', description: 'Attribute XSS', type: 'xss' },
            { payload: 'javascript:alert(1)', description: 'Protocol XSS', type: 'xss' }
        ]
    },
    sqli: {
        name: 'SQL Injection',
        tests: [
            { payload: "' OR '1'='1", description: 'Basic SQLi', type: 'sqli' },
            { payload: '" OR "1"="1', description: 'Double Quote SQLi', type: 'sqli' },
            { payload: '1; DROP TABLE users--', description: 'Command SQLi', type: 'sqli' }
        ]
    },
    special: {
        name: 'Special Characters',
        tests: [
            { payload: '@#$%^&*()', description: 'Basic Special Chars', type: 'special' },
            { payload: '§±!@£$%^&*()', description: 'Extended Special Chars', type: 'special' }
        ]
    }
};

async function testInputField(input, test) {
    try {
        console.log(`Testing field: ${input.name || input.id || 'unnamed'}`);
        const originalValue = input.value;

        // Save initial state
        const initialProperties = {
            type: input.type,
            maxLength: input.maxLength,
            pattern: input.pattern,
            required: input.required
        };

        input.value = test.payload;

        // Trigger validation events
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 100));

        // Get the final value after any client-side sanitization
        const finalValue = input.value;
        
        // Check if the value was changed by any client-side validation/sanitization
        const wasValueSanitized = finalValue !== test.payload;
        
        // Check HTML5 validation state
        const isInvalid = !input.validity.valid;
        
        // Check for input restrictions
        const hasRestrictions = input.pattern || 
                               input.maxLength > 0 || 
                               ['email', 'number', 'url'].includes(input.type);

        let isVulnerable = false;
        let additionalInfo = '';

        switch(test.type) {
            case 'xss':
                // For XSS, check if script tags survive and aren't escaped
                isVulnerable = finalValue.includes('<script>') && 
                              !finalValue.includes('&lt;script&gt;') &&
                              !wasValueSanitized &&
                              !isInvalid;
                additionalInfo = isVulnerable ? 
                    'Field accepts and preserves unescaped script tags' : 
                    'Script tags are either escaped or rejected';
                break;

            case 'sqli':
                // For SQL injection, check if SQL special chars are preserved
                isVulnerable = finalValue.includes("'") && 
                              finalValue.includes("=") &&
                              !wasValueSanitized &&
                              !isInvalid;
                additionalInfo = isVulnerable ? 
                    'Field accepts SQL control characters without sanitization' : 
                    'SQL special characters are properly handled';
                break;

            case 'special':
                // For special chars, check if they're accepted without validation
                isVulnerable = !wasValueSanitized && 
                              !isInvalid && 
                              !hasRestrictions;
                additionalInfo = isVulnerable ? 
                    'Field accepts special characters without validation' : 
                    'Special characters are properly validated';
                break;
        }

        // Restore original value
        input.value = originalValue;

        console.log(`Test result for ${input.name || input.id}: ${isVulnerable ? 'Vulnerable' : 'Safe'}`);
        
        return {
            isVulnerable,
            additionalInfo,
            validationInfo: {
                inputType: input.type,
                hasPattern: !!input.pattern,
                hasLengthLimit: input.maxLength > 0,
                wasValueSanitized,
                triggeredValidation: isInvalid
            }
        };

    } catch (error) {
        console.error('Error testing input field:', error);
        return {
            isVulnerable: false,
            additionalInfo: 'Error during testing',
            error: error.message
        };
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
        
        console.log('Tests completed, sending results:', results);
        // Send results message
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