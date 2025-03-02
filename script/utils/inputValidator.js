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
            { payload: "' OR 1=1--", description: 'Basic SQLi', type: 'sqli' },
            { payload: '" OR 1=1--', description: 'Double Quote SQLi', type: 'sqli' },
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

// Updated helper to detect common SQL escaping patterns
function isSQLPayloadEscaped(original, final) {
    // Check if single quotes are escaped by doubling them
    const fixedSingleQuotes = final.replace(/''/g, "'");
    if (fixedSingleQuotes === original) return true;
    
    // Check if single quotes are escaped with a backslash
    const fixedSingleQuotesBackslash = final.replace(/\\'/g, "'");
    if (fixedSingleQuotesBackslash === original) return true;
    
    // Check if double quotes are escaped with a backslash
    const fixedDoubleQuotes = final.replace(/\\"/g, '"');
    if (fixedDoubleQuotes === original) return true;
    
    return false;
}

async function testInputField(input, test) {
    try {
        // 1. Save initial state
        const originalValue = input.value;
        const form = input.form;
        let isInForm = !!form;
        
        // 2. Analyze field context
        const fieldContext = {
            name: input.name?.toLowerCase() || '',
            id: input.id?.toLowerCase() || '',
            type: input.type,
            isTextArea: input.tagName === 'TEXTAREA',
            isRichText: input.getAttribute('contenteditable') === 'true',
            maxLength: input.maxLength,
            pattern: input.pattern
        };

        fieldContext.acceptsHTML = ['html', 'richtext', 'editor', 'content', 'message', 'description'].some(term => 
            fieldContext.name.includes(term) || fieldContext.id.includes(term)
        ) || fieldContext.isRichText;

        const dbRelatedTerms = ['username', 'user', 'password', 'pass', 'pwd', 'email', 'mail', 
                                'search', 'query', 'q', 'id', 'name', 'login', 'account', 
                                'filter', 'sort', 'order', 'number', 'code', 'key', 'param', 'value'];
        fieldContext.isDatabaseField = dbRelatedTerms.some(term => 
            fieldContext.name.includes(term) || fieldContext.id.includes(term)
        );
        
        // 3. Prepare for testing
        const originalPayload = test.payload;
        
        // 4. Set test value and dispatch events
        input.value = test.payload;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        
        // If input is in a form, simulate form submission to trigger form-level validation
        if (isInForm && form) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            const submitListener = function(e) {
                e.preventDefault();
            };
            form.addEventListener('submit', submitListener);
            form.dispatchEvent(submitEvent);
            form.removeEventListener('submit', submitListener);
        }

        // 5. Wait for validations to complete
        await new Promise(resolve => setTimeout(resolve, 700));

        // 6. Gather validation results
        const finalValue = input.value;
        let wasURLEncoded = false;
        try {
            if (finalValue !== originalPayload) {
                const decodedValue = decodeURIComponent(finalValue);
                wasURLEncoded = decodedValue === originalPayload;
            }
        } catch (e) {
            wasURLEncoded = false;
        }
        const wasValueSanitized = finalValue !== originalPayload && !wasURLEncoded;
        const isInvalid = !input.validity.valid || 
                          input.getAttribute('aria-invalid') === 'true' ||
                          input.classList.contains('invalid') ||
                          input.classList.contains('error');

        const originalFieldState = {
            value: input.value,
            validity: input.validity.valid,
            classList: [...input.classList],
            attributes: {}
        };
        
        // 7. Type-specific vulnerability checks
        let isVulnerable = false;
        let additionalInfo = '';
        let detectedPattern = '';
        
        switch(test.type) {
            case 'xss':
                if (fieldContext.acceptsHTML) {
                    isVulnerable = false;
                    additionalInfo = 'Field is designed to accept HTML content';
                } else {
                    const wasHTMLEscaped = finalValue.includes('&lt;') || 
                                            finalValue.includes('&gt;') || 
                                            finalValue.includes('&amp;');
                    const hasUnescapedScriptTag = finalValue.toLowerCase().includes('<script') && 
                                                  !finalValue.toLowerCase().includes('&lt;script');
                    const hasJavaScriptProtocol = finalValue.toLowerCase().includes('javascript:');
                    const hasEventHandler = /\bon\w+\s*=/i.test(finalValue);
                    
                    isVulnerable = !isInvalid && 
                                   !wasValueSanitized && 
                                   !wasHTMLEscaped &&
                                   (hasUnescapedScriptTag || hasJavaScriptProtocol || hasEventHandler);
                    
                    if (isVulnerable) {
                        if (hasUnescapedScriptTag) detectedPattern = 'script tag';
                        else if (hasJavaScriptProtocol) detectedPattern = 'javascript protocol';
                        else if (hasEventHandler) detectedPattern = 'event handler';
                    }
                    
                    additionalInfo = isVulnerable ? 
                        `Unsanitized ${detectedPattern} accepted` : 
                        'Content properly sanitized or rejected';
                }
                break;

            case 'sqli':
                if (!fieldContext.isDatabaseField) {
                    isVulnerable = false;
                    additionalInfo = 'Field unlikely to interact with database';
                } else {
                    const payload = originalPayload.toLowerCase();
                    const finalValueLower = finalValue.toLowerCase();
                    let sqlInjectionType = '';
                    
                    const checkPatterns = [
                        {
                            name: 'authentication bypass',
                            check: () => {
                                if (payload.includes("' or ") && finalValueLower.includes("' or ")) {
                                    return true;
                                }
                                if (payload.includes('" or ') && finalValueLower.includes('" or ')) {
                                    return true;
                                }
                                return false;
                            }
                        },
                        {
                            name: 'command injection',
                            check: () => {
                                if (payload.includes(';') && 
                                    /\b(select|insert|update|delete|drop|alter|create)\b/i.test(payload) &&
                                    finalValueLower.includes(';') && 
                                    /\b(select|insert|update|delete|drop|alter|create)\b/i.test(finalValueLower)) {
                                    return true;
                                }
                                return false;
                            }
                        },
                        {
                            name: 'UNION-based extraction',
                            check: () => {
                                if (/\bunion\s+select\b/i.test(payload) && 
                                    /\bunion\s+select\b/i.test(finalValueLower)) {
                                    return true;
                                }
                                return false;
                            }
                        },
                        {
                            name: 'comment-based termination',
                            check: () => {
                                const hasComment = payload.includes('--') || payload.includes('#');
                                const hasCommentInFinal = finalValueLower.includes('--') || 
                                                          finalValueLower.includes('#');
                                if ((payload.includes("'") || payload.includes('"')) && 
                                    hasComment && 
                                    (finalValueLower.includes("'") || finalValueLower.includes('"')) && 
                                    hasCommentInFinal) {
                                    return true;
                                }
                                return false;
                            }
                        }
                    ];
                    
                    for (const pattern of checkPatterns) {
                        if (pattern.check()) {
                            isVulnerable = true;
                            sqlInjectionType = pattern.name;
                            break;
                        }
                    }
                    
                    // Check for common escaping mechanisms. If the payload appears escaped, treat it as sanitized.
                    if (isSQLPayloadEscaped(originalPayload, finalValue)) {
                        isVulnerable = false;
                        additionalInfo = 'SQL injection patterns escaped';
                    } else {
                        isVulnerable = isVulnerable && !isInvalid && !wasValueSanitized;
                        additionalInfo = isVulnerable ?
                            `SQL injection vulnerability (${sqlInjectionType})` :
                            'SQL injection patterns properly handled';
                    }
                }
                break;

            case 'special':
                if (fieldContext.isTextArea || fieldContext.isRichText) {
                    isVulnerable = false;
                    additionalInfo = 'Field type allows special characters';
                } else {
                    let decodedFinalValue = finalValue;
                    try {
                        if (wasURLEncoded) {
                            decodedFinalValue = decodeURIComponent(finalValue);
                        }
                    } catch (e) {
                        decodedFinalValue = finalValue;
                    }
                    const hasSpecialChars = /[<>'"&;()\\`~!@#$%^*]/.test(decodedFinalValue);
                    const hasControlChars = /[\x00-\x1F\x7F]/.test(decodedFinalValue);
                    
                    isVulnerable = (hasSpecialChars || hasControlChars) && 
                                   !wasValueSanitized && 
                                   !isInvalid && 
                                   !fieldContext.pattern;
                    
                    additionalInfo = isVulnerable ?
                        'Special characters accepted without proper validation' :
                        'Special characters properly handled';
                }
                break;
        }

        // 8. Reset field state
        input.value = originalValue;
        if (originalFieldState.classList) {
            input.className = originalFieldState.classList.join(' ');
        }
        
        // 9. Additional validation checks
        const validationAttributes = ['required', 'minlength', 'maxlength', 'pattern', 'min', 'max'];
        const hasValidation = validationAttributes.some(attr => input.hasAttribute(attr));
        
        // 10. Return test results with detailed context
        return {
            isVulnerable,
            additionalInfo,
            validationInfo: {
                inputType: fieldContext.type,
                hasPattern: !!fieldContext.pattern,
                hasLengthLimit: fieldContext.maxLength > 0,
                wasValueSanitized,
                wasURLEncoded,
                originalValue: originalPayload,
                finalValue: finalValue,
                triggeredValidation: isInvalid,
                isInForm,
                fieldName: fieldContext.name,
                fieldId: fieldContext.id,
                hasValidationRules: hasValidation,
                isDatabaseField: fieldContext.isDatabaseField,
                acceptsHTML: fieldContext.acceptsHTML,
                detectedPattern
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

// Run tests on all input fields
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
            
            chrome.runtime.sendMessage({
                type: 'progress',
                progress: 0,
                currentField: 'Starting test...'
            });
            
            runTests();
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
