function initializeStaticAnalysis() {
  const analyzeButton = document.getElementById('analyze-btn');
  const resultsTable = document.getElementById('results-table').querySelector('tbody');

  analyzeButton.addEventListener('click', () => {
    // Clear previous results
    resultsTable.innerHTML = '';

    const allResults = []; // Array to store all results for sorting

    // Perform static analysis on the current page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: analyzePage,
        },
        (results) => {
          if (results && results[0] && results[0].result) {
            const { scripts, links } = results[0].result;

            // Process and collect results
            scripts.forEach((src) => {
              allResults.push(analyzeDependency(src, 'Script'));
            });
            links.forEach((href) => {
              allResults.push(analyzeDependency(href, 'Link'));
            });

            // Sort: Rows with security implications first
            const sortedResults = allResults.sort((a, b) => {
              if (a.risk !== 'None' && b.risk === 'None') return -1;
              if (a.risk === 'None' && b.risk !== 'None') return 1;
              return 0;
            });

            // Add rows to the table
            sortedResults.forEach(addRowToTable);
          }
        }
      );
    });
  });

  function addRowToTable({ risk, library, thirdParty, type, source }) {
    const row = document.createElement('tr');

    // Highlight rows with security implications
    if (risk !== 'None') {
      row.style.backgroundColor = '#ffcccc'; // Light red background
    }

    const riskCell = document.createElement('td');
    riskCell.textContent = risk;

    const libraryCell = document.createElement('td');
    libraryCell.textContent = library;

    const thirdPartyCell = document.createElement('td');
    thirdPartyCell.textContent = thirdParty ? 'Yes' : 'No';

    const typeCell = document.createElement('td');
    typeCell.textContent = type;

    const sourceCell = document.createElement('td');
    sourceCell.textContent = source;

    row.appendChild(riskCell);
    row.appendChild(libraryCell);
    row.appendChild(thirdPartyCell);
    row.appendChild(typeCell);
    row.appendChild(sourceCell);

    resultsTable.appendChild(row);
  }

  function analyzeDependency(url, type) {
    let library = 'Unknown';
    let thirdParty = true;
    let risk = 'None';

    // Identify libraries/frameworks
    if (url.includes('jquery')) {
      library = 'jQuery';
      if (url.includes('2.2.4')) {
        risk = 'Outdated version (2.2.4)';
      }
    } else if (url.includes('cookieconsent')) {
      library = 'Cookie Consent';
    } else if (url.includes('runtime') || url.includes('vendor') || url.includes('main')) {
      library = 'Juice Shop (App Scripts)';
      thirdParty = false;
    }

    // Check for third-party sources
    if (!url.includes('juice-shop.herokuapp.com')) {
      thirdParty = true;
    }

    // Additional security checks
    if (url.startsWith('http://')) {
      risk = 'Insecure protocol (http)';
    }
    if (url.includes('redirect')) {
      risk = 'Potential unsafe redirect';
    }

    return { risk, library, thirdParty, type, source: url };
  }

  function analyzePage() {
    // Extract all script sources
    const scripts = Array.from(document.querySelectorAll('script'))
      .map((script) => script.src)
      .filter((src) => src);

    // Extract all external links
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], a'))
      .map((link) => link.href)
      .filter((href) => href);

    return { scripts, links };
  }
}
