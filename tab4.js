console.log('Tab4.js is loading...');

function initializeTab4() {
  console.log('Initializing Tab4...');
  const subdomainResults = document.getElementById("subdomain-results");
  
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

      if (!data.subdomains) {
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
    subdomainResults.innerHTML = '';
    if (data.subdomains?.length > 0) {
      const header = document.createElement("li");
      header.textContent = `Found ${data.subdomains.length} subdomains:`;
      header.style.fontWeight = "bold";
      subdomainResults.appendChild(header);
      
      data.subdomains.forEach(subdomain => {
        const li = document.createElement("li");
        li.textContent = subdomain;
        li.classList.add("subdomain");
        subdomainResults.appendChild(li);
      });
    } else {
      subdomainResults.innerHTML = "<li class='error'>No subdomains found.</li>";
    }
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
