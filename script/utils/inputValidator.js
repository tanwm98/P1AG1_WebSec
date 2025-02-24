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
            { payload: 'javascript:alert(1)', description: 'Protocol XSS', type: 'xss' },
            { payload: '`${alert(1)}`', description: 'Template Literal XSS', type: 'xss' }  // Added test
        ]
    },
    sqli: {
        name: 'SQL Injection',
        tests: [
            { payload: "' OR '1'='1", description: 'Basic SQLi', type: 'sqli' },
            { payload: '" OR "1"="1', description: 'Double Quote SQLi', type: 'sqli' },
            { payload: '1; DROP TABLE users--', description: 'Command SQLi', type: 'sqli' },
            { payload: 'UNION SELECT * FROM users', description: 'UNION SQLi', type: 'sqli' }  // Added test
        ]
    },
    special: {
        name: 'Special Characters',
        tests: [
            { payload: '@#$%^&*()', description: 'Basic Special Chars', type: 'special' },
            { payload: '§±!@£$%^&*()', description: 'Extended Special Chars', type: 'special' },
            { payload: '`~<>%\\', description: 'Additional Special Chars', type: 'special' }  // Added test
        ]
    }
};

async function testInputField(input, test) {
    try {
        // 1. Save initial state
        const originalValue = input.value;
        const form = input.form;
        let isInForm = !!form;
        
        // 2. Analyze field context - Fixed circular reference
        const fieldContext = {
            name: input.name?.toLowerCase() || '',
            type: input.type,
            isTextArea: input.tagName === 'TEXTAREA',
            isRichText: input.getAttribute('contenteditable') === 'true',
            maxLength: input.maxLength,
            pattern: input.pattern
        };

        // Add acceptsHTML property after object creation
        fieldContext.acceptsHTML = ['html', 'richtext', 'editor', 'content'].some(term => 
            fieldContext.name.includes(term)
        );

        // 3. Set test value
        input.value = test.payload;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));

        // 4. Wait for validation - Increased timeout
        await new Promise(resolve => setTimeout(resolve, 500));

        // 5. Gather validation results - Enhanced validation checks
        const finalValue = input.value;
        const wasValueSanitized = finalValue !== test.payload;
        const isInvalid = !input.validity.valid || 
                         input.getAttribute('aria-invalid') === 'true' ||
                         input.classList.contains('invalid') ||
                         input.classList.contains('error');

        // Store original field state before further tests
        const originalFieldState = {
            value: input.value,
            validity: input.validity.valid,
            classList: [...input.classList],
            attributes: {}
        };
        
        // 6. Type-specific vulnerability checks
        let isVulnerable = false;
        let additionalInfo = '';
        
        switch(test.type) {
            case 'xss':
                if (fieldContext.acceptsHTML || fieldContext.isRichText) {
                    isVulnerable = false;
                    additionalInfo = 'Field is designed to accept HTML content';
                } else {
                    // Enhanced XSS detection
                    const containsScriptTag = finalValue.toLowerCase().includes('<script');
                    const containsEscapedScript = finalValue.includes('&lt;script') || 
                                                finalValue.includes('&#');
                    const hasJavaScriptProtocol = finalValue.toLowerCase().includes('javascript:');
                    const hasEventHandler = /\bon\w+\s*=/i.test(finalValue);
                    const hasTemplateExpression = /\${\s*.*\s*}/g.test(finalValue);
                    
                    isVulnerable = !isInvalid && !wasValueSanitized && 
                                 (containsScriptTag && !containsEscapedScript) || 
                                 hasJavaScriptProtocol ||
                                 hasEventHandler ||
                                 hasTemplateExpression;
                    
                    additionalInfo = isVulnerable ? 
                        'Potentially dangerous script content accepted' : 
                        'Content properly sanitized or rejected';
                }
                break;

            case 'sqli':
                const isDatabaseField = /^(username|password|email|search|query|id|name|filter|sort|order)$/i
                    .test(fieldContext.name);
                
                if (!isDatabaseField) {
                    isVulnerable = false;
                    additionalInfo = 'Field unlikely to interact with database';
                } else {
                    // Enhanced SQL injection detection
                    const hasSQLKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|WHERE|FROM|JOIN)\b/i
                        .test(finalValue);
                    const hasQuotes = /'|"|`/.test(finalValue);
                    const hasEqualSign = /\s*=\s*/.test(finalValue);
                    const hasComments = /--|#/.test(finalValue);
                    
                    isVulnerable = !isInvalid && !wasValueSanitized && 
                                 ((hasSQLKeywords && (hasQuotes || hasComments)) || 
                                  (hasQuotes && hasEqualSign));
                                 
                    additionalInfo = isVulnerable ?
                        'Potential SQL injection patterns accepted' :
                        'SQL patterns properly handled';
                }
                break;

            case 'special':
                if (fieldContext.isTextArea || fieldContext.isRichText) {
                    isVulnerable = false;
                    additionalInfo = 'Field type allows special characters';
                } else {
                    // Enhanced special character detection
                    const hasSpecialChars = /[<>'"&;()\\`~!@#$%^*]/.test(finalValue);
                    const hasControlChars = /[\x00-\x1F\x7F]/.test(finalValue);
                    
                    isVulnerable = (hasSpecialChars || hasControlChars) && 
                                 !wasValueSanitized && 
                                 !isInvalid && 
                                 !fieldContext.pattern;
                                 
                    additionalInfo = isVulnerable ?
                        'Potentially dangerous characters accepted without validation' :
                        'Special characters properly handled';
                }
                break;
        }

        // 7. Reset field state - Now includes complete reset
        input.value = originalValue;
        if (originalFieldState.classList) {
            input.className = originalFieldState.classList.join(' ');
        }
        
        // 8. Additional validation checks
        const validationAttributes = ['required', 'minlength', 'maxlength', 'pattern', 'min', 'max'];
        const hasValidation = validationAttributes.some(attr => input.hasAttribute(attr));
        
        return {
            isVulnerable,
            additionalInfo,
            validationInfo: {
                inputType: fieldContext.type,
                hasPattern: !!fieldContext.pattern,
                hasLengthLimit: fieldContext.maxLength > 0,
                wasValueSanitized,
                triggeredValidation: isInvalid,
                isInForm,
                fieldName: fieldContext.name,
                hasValidationRules: hasValidation
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

// Rest of the code remains the same - runTests function and message listeners
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
                    
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            
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

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    if (message.action === "startTesting") {
        console.log('Starting input field testing process');
        try {
            sendResponse({ status: 'received' });
            
            const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
            console.log(`Found ${inputs.length} input fields to test`);
            
            chrome.runtime.sendMessage({
                type: 'progress',
                progress: 0,
                currentField: 'Starting test...'
            });
            
            runTests(inputs);
            
            return true;
        } catch (error) {
            console.error('Error in message handler:', error);
            chrome.runtime.sendMessage({
                type: 'error',
                error: error.message
            });
        }
    }
});

chrome.runtime.sendMessage({
    type: 'contentScriptLoaded',
    url: window.location.href
});

console.log('Input Validator content script loaded completely');