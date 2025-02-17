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
        // 1. Save initial state
        const originalValue = input.value;
        const form = input.form;
        let isInForm = !!form;
        
        // 2. Analyze field context
        const fieldContext = {
            name: input.name?.toLowerCase() || '',
            type: input.type,
            isTextArea: input.tagName === 'TEXTAREA',
            isRichText: input.getAttribute('contenteditable') === 'true',
            maxLength: input.maxLength,
            pattern: input.pattern,
            acceptsHTML: ['html', 'richtext', 'editor'].some(term => 
                fieldContext.name.includes(term)
            )
        };

        // 3. Set test value
        input.value = test.payload;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));

        // 4. Wait for validation
        await new Promise(resolve => setTimeout(resolve, 100));

        // 5. Gather validation results
        const finalValue = input.value;
        const wasValueSanitized = finalValue !== test.payload;
        const isInvalid = !input.validity.valid;
        
        // 6. Type-specific vulnerability checks
        let isVulnerable = false;
        let additionalInfo = '';
        
        switch(test.type) {
            case 'xss':
                if (fieldContext.acceptsHTML || fieldContext.isRichText) {
                    // Field is meant to accept HTML, not vulnerable
                    isVulnerable = false;
                    additionalInfo = 'Field is designed to accept HTML content';
                } else {
                    const containsScriptTag = finalValue.includes('<script>');
                    const containsEscapedScript = finalValue.includes('&lt;script&gt;');
                    const hasJavaScriptProtocol = finalValue.toLowerCase().includes('javascript:');
                    
                    isVulnerable = !isInvalid && !wasValueSanitized && 
                                 ((containsScriptTag && !containsEscapedScript) || 
                                  hasJavaScriptProtocol);
                    
                    additionalInfo = isVulnerable ? 
                        'Unsanitized script content accepted' : 
                        'Content properly sanitized or rejected';
                }
                break;

            case 'sqli':
                // Only test fields that might interact with a database
                const isDatabaseField = /^(username|password|email|search|query|id|name)$/i
                    .test(fieldContext.name);
                
                if (!isDatabaseField) {
                    isVulnerable = false;
                    additionalInfo = 'Field unlikely to interact with database';
                } else {
                    const hasSQLKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|WHERE)\b/i
                        .test(finalValue);
                    const hasQuotes = finalValue.includes("'") || finalValue.includes('"');
                    const hasEqualSign = finalValue.includes('=');
                    
                    isVulnerable = !isInvalid && !wasValueSanitized && 
                                 (hasSQLKeywords || (hasQuotes && hasEqualSign));
                                 
                    additionalInfo = isVulnerable ?
                        'SQL control characters accepted without sanitization' :
                        'SQL patterns properly handled';
                }
                break;

            case 'special':
                if (fieldContext.isTextArea || fieldContext.isRichText) {
                    // These fields are expected to accept special characters
                    isVulnerable = false;
                    additionalInfo = 'Field type allows special characters';
                } else {
                    const hasSpecialChars = /[<>'"&;()\\]/.test(finalValue);
                    isVulnerable = hasSpecialChars && !wasValueSanitized && 
                                 !isInvalid && !fieldContext.pattern;
                                 
                    additionalInfo = isVulnerable ?
                        'Special characters accepted without validation' :
                        'Special characters properly handled';
                }
                break;
        }

        // 7. Reset field state
        input.value = originalValue;
        
        return {
            isVulnerable,
            additionalInfo,
            validationInfo: {
                inputType: fieldContext.type,
                hasPattern: !!fieldContext.pattern,
                hasLengthLimit: fieldContext.maxLength > 0,
                wasValueSanitized,
                triggeredValidation: isInvalid,
                isInForm: isInForm,
                fieldName: fieldContext.name
            }
        };

    } catch (error) {
        console.error('Error testing input field:', error);
        return {
            isVulnerable: false,
            additionalInfo: 'Error during testing: ' + error.message,
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
                    const testResult = await testInputField(input, test);
                    
                    if (testResult.isVulnerable) {
                        fieldResult.vulnerabilities.push({
                            type: testSet.name,
                            description: test.description,
                            payload: test.payload,
                            additionalInfo: testResult.additionalInfo,
                            validationInfo: testResult.validationInfo
                        });
                    }
                    
                    testsCompleted++;
                    chrome.runtime.sendMessage({
                        type: 'progress',
                        progress: (testsCompleted / totalTests) * 100,
                        currentField: fieldResult.fieldName
                    });
                    
                    // Reduced delay to speed up testing while still allowing for UI updates
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            
            // Only add fields to results if they have vulnerabilities or are specifically marked safe
            if (fieldResult.vulnerabilities.length > 0) {
                results.push(fieldResult);
            } else {
                results.push({
                    ...fieldResult,
                    isSafe: true
                });
            }
        }
        
        console.log('Tests completed, sending results:', results);
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