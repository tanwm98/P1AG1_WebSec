document.addEventListener('DOMContentLoaded', function () {
    const testButton = document.getElementById('testButton');
    const resultDiv = document.getElementById('results');

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

        const vulnTypes = {
            xss: 'Cross-Site Scripting (XSS)',
            sqli: 'SQL Injection',
            special: 'Special Characters'
        };

        Object.entries(summary).forEach(([type, fields]) => {
            if (fields.length > 0) {
                summaryHTML += `
            <div class="vuln-category">
              <h4>⚠️ ${vulnTypes[type]} Vulnerabilities (${fields.length} fields)</h4>
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

    function displayResults(results) {
        resultDiv.innerHTML = '';

        // Add summary statistics
        const totalFields = results.length;
        const vulnerableFields = results.filter(r => Object.keys(r.vulnerabilities).length > 0).length;

        resultDiv.innerHTML = `
        <div class="stats-summary">
          <h3>📊 Test Results</h3>
          <p>Total fields tested: ${totalFields}</p>
          <p>Vulnerable fields found: ${vulnerableFields}</p>
          <p>Safe fields: ${totalFields - vulnerableFields}</p>
        </div>
      `;

        // Add vulnerability summary if any vulnerabilities found
        if (vulnerableFields > 0) {
            resultDiv.innerHTML += createVulnerabilitySummary(results);
        }

        // Detailed results for each field
        resultDiv.innerHTML += '<h3>🔍 Detailed Field Analysis</h3>';

        results.forEach(result => {
            const hasVulnerabilities = Object.keys(result.vulnerabilities).length > 0;
            const div = document.createElement('div');
            div.className = `field-result ${hasVulnerabilities ? 'vulnerable' : 'safe'}`;

            div.innerHTML = `
          <div class="field-name">
            ${result.name} (${result.type})
          </div>
          <div class="field-location">
            Location: ${result.location}
          </div>
        `;

            if (hasVulnerabilities) {
                const vulnList = Object.entries(result.vulnerabilities)
                    .map(([category, { name, failedTests }]) => `
              <div class="vulnerability-list">
                ⚠️ ${name} vulnerability detected:
                <ul>
                  ${failedTests.map(test => `<li>Accepts: <code>${test}</code></li>`).join('')}
                </ul>
              </div>
            `).join('');

                div.innerHTML += vulnList;
            } else {
                div.innerHTML += `<div class="safe-message">✓ Input appears to be properly validated</div>`;
            }

            resultDiv.appendChild(div);
        });

        testButton.disabled = false;
        testButton.textContent = 'Test Input Field Security';
    }

    testButton.addEventListener('click', function () {
        testButton.disabled = true;
        testButton.textContent = 'Testing...';
        resultDiv.innerHTML = '<div class="progress">Analyzing input fields...</div>';

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "testInputs"
            }, displayResults);
        });
    });
});