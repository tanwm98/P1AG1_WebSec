// Test cases for different vulnerability types
const testCases = {
    xss: {
      name: 'Cross-Site Scripting (XSS)',
      tests: [
        '<script>alert(1)</script>',
        '"><script>alert(1)</script>',
        'javascript:alert(1)'
      ]
    },
    sqli: {
      name: 'SQL Injection',
      tests: [
        "' OR '1'='1",
        '" OR "1"="1',
        '1; DROP TABLE users--'
      ]
    },
    special: {
      name: 'Special Characters',
      tests: [
        '@#$%^&*()',
        '§±!@£$%^&*()',
        "¹²³¤€¼½¾''¥×"
      ]
    }
  };
  
  // Function to test input field
  function testInputField(input, testString) {
    const originalValue = input.value;
    input.value = testString;
    
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    const modifiedValue = input.value;
    input.value = originalValue;
    
    return modifiedValue === testString;
  }
  
  // Create UI container
  function createUIContainer() {
    const container = document.createElement('div');
    container.className = 'security-tester-container';
    container.innerHTML = `
      <div class="security-tester-header">
        <h3 style="margin: 0;">Input Security Tester</h3>
        <button class="close-button">&times;</button>
      </div>
      <div class="security-tester-content">
        <button class="security-test-button">Test Input Fields</button>
        <div id="security-test-results"></div>
      </div>
    `;
    return container;
  }
  
  // Create vulnerability summary
  function createVulnerabilitySummary(results) {
    const summary = {
      xss: [],
      sqli: [],
      special: []
    };
    
    results.forEach(result => {
      Object.entries(result.vulnerabilities).forEach(([type, details]) => {
        summary[type].push({
          fieldName: result.name,
          fieldType: result.type,
          failedTests: details.failedTests
        });
      });
    });
    
    let summaryHTML = '<div class="vulnerability-summary">';
    summaryHTML += '<h3>🎯 Vulnerability Summary</h3>';
    
    Object.entries(summary).forEach(([type, fields]) => {
      if (fields.length > 0) {
        summaryHTML += `
          <div class="vuln-category">
            <h4>⚠️ ${testCases[type].name} (${fields.length} fields)</h4>
            <ul>
              ${fields.map(field => `
                <li>
                  <strong>${field.fieldName}</strong> (${field.fieldType})
                  <ul class="test-details">
                    ${field.failedTests.map(test => `
                      <li>Accepts: <code>${test}</code></li>
                    `).join('')}
                  </ul>
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }
    });
    
    summaryHTML += '</div>';
    return summaryHTML;
  }
  
  // Display test results
  function displayResults(results, resultsContainer) {
    const totalFields = results.length;
    const vulnerableFields = results.filter(r => Object.keys(r.vulnerabilities).length > 0).length;
    
    resultsContainer.innerHTML = `
      <div class="stats-summary">
        <h3>📊 Test Results</h3>
        <p>Total fields tested: ${totalFields}</p>
        <p>Vulnerable fields found: ${vulnerableFields}</p>
        <p>Safe fields: ${totalFields - vulnerableFields}</p>
      </div>
    `;
    
    if (vulnerableFields > 0) {
      resultsContainer.innerHTML += createVulnerabilitySummary(results);
    }
    
    resultsContainer.innerHTML += '<h3>🔍 Detailed Field Analysis</h3>';
    
    results.forEach(result => {
      const hasVulnerabilities = Object.keys(result.vulnerabilities).length > 0;
      resultsContainer.innerHTML += `
        <div class="field-result ${hasVulnerabilities ? 'vulnerable' : 'safe'}">
          <div class="field-name">
            ${result.name} (${result.type})
          </div>
          ${hasVulnerabilities ? 
            Object.entries(result.vulnerabilities)
              .map(([category, { name, failedTests }]) => `
                <div class="vulnerability-list">
                  ⚠️ ${name} vulnerability detected:
                  <ul>
                    ${failedTests.map(test => `<li>Accepts: <code>${test}</code></li>`).join('')}
                  </ul>
                </div>
              `).join('') :
            '<div class="safe-message">✓ Input appears to be properly validated</div>'
          }
        </div>
      `;
    });
  }
  
  // Initialize the security tester
  function initSecurityTester() {
    const container = createUIContainer();
    document.body.appendChild(container);
    
    const testButton = container.querySelector('.security-test-button');
    const resultsContainer = container.querySelector('#security-test-results');
    const closeButton = container.querySelector('.close-button');
    
    testButton.addEventListener('click', () => {
      testButton.disabled = true;
      testButton.textContent = 'Testing...';
      resultsContainer.innerHTML = '<div class="progress">Analyzing input fields...</div>';
      
      const inputs = document.querySelectorAll('input[type="text"], input[type="password"], textarea');
      const results = Array.from(inputs).map(input => {
        const inputInfo = {
          type: input.type,
          name: input.name || input.id || 'unnamed',
          vulnerabilities: {}
        };
        
        // Test each category
        Object.entries(testCases).forEach(([category, { name, tests }]) => {
          const failedTests = tests.filter(test => testInputField(input, test));
          if (failedTests.length > 0) {
            inputInfo.vulnerabilities[category] = {
              name,
              failedTests
            };
          }
        });
        
        return inputInfo;
      });
      
      displayResults(results, resultsContainer);
      testButton.disabled = false;
      testButton.textContent = 'Test Input Fields';
    });
    
    closeButton.addEventListener('click', () => {
      container.remove();
    });
  }
  
  // Initialize when the page loads
  initSecurityTester();