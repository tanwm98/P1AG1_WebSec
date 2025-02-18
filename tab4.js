console.log('Tab4.js is loading...');

function initializeTab4() {
  console.log('Initializing Tab4...');
  const subdomainResults = document.getElementById("subdomain-results");
  const statusDiv = document.getElementById("status");
  
  if (!subdomainResults) {
    console.error('Could not find subdomain-results element');
    return;
  }

  async function runScan(retryCount = 0) {
    console.log('Starting scan...');
    subdomainResults.innerHTML = "<li>Scanning, please wait...</li>";

    try {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        throw new Error("Chrome API not available");
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (!tab?.url) {
        throw new Error("No active tab URL found");
      }

      const url = new URL(tab.url);
      const domain = url.hostname.replace(/^www\./, '');
      console.log('Scanning domain:', domain);

      const response = await fetch(`http://localhost:5000/scan?domain=${domain}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Scan results:', data);

      if (!data.results) {
        throw new Error("Invalid response format");
      }

      displayResults(data);
    } catch (error) {
      console.error('Scan error:', error);
      if (retryCount < 3) {
        console.log(`Retrying scan (${retryCount + 1}/3)...`);
        setTimeout(() => runScan(retryCount + 1), 2000);
      } else {
        subdomainResults.innerHTML = `<li class='error'>Error: ${error.message}</li>`;
      }
    }
  }

  function displayResults(data) {
    const resultsBody = document.getElementById("subdomain-results");
    const statusDiv = document.getElementById("status");
    
    if (!data.results?.length) {
        resultsBody.innerHTML = '<tr><td colspan="3" class="error">No subdomains found.</td></tr>';
        return;
    }

    // Filter inactive subdomains
    const inactiveSubdomains = data.results.filter(item => !item.status.active);
    
    if (inactiveSubdomains.length === 0) {
        resultsBody.innerHTML = '<tr><td colspan="3">All subdomains are active!</td></tr>';
        return;
    }

    // Update status
    statusDiv.textContent = `Found ${inactiveSubdomains.length} inactive subdomains out of ${data.total} total`;

    // Display results
    resultsBody.innerHTML = inactiveSubdomains
        .map(item => `
            <tr class="inactive">
                <td>${item.subdomain}</td>
                <td>${item.status.ip || 'N/A'}</td>
                <td class="error">${item.status.error || 'Unknown error'}</td>
            </tr>
        `)
        .join('');
  }

  // Start scan immediately
  runScan();
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTab4);
} else {
  initializeTab4();
}
