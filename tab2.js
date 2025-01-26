document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('analyze-btn')) {
      initializeStaticAnalysis();
  }
});

function initializeStaticAnalysis() {
const analyzeButton = document.getElementById('analyze-btn');
const resultsTable = document.getElementById('results-table').querySelector('tbody');

analyzeButton.addEventListener('click', () => {
  // Clear previous results
  resultsTable.innerHTML = '';

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

          // Populate table with results
          scripts.forEach((src) => {
            addRowToTable('Script', src);
          });
          links.forEach((href) => {
            addRowToTable('Link', href);
          });
        }
      }
    );
  });
});

function addRowToTable(type, source) {
  const row = document.createElement('tr');
  const typeCell = document.createElement('td');
  const sourceCell = document.createElement('td');

  typeCell.textContent = type;
  sourceCell.textContent = source;

  row.appendChild(typeCell);
  row.appendChild(sourceCell);
  resultsTable.appendChild(row);
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
