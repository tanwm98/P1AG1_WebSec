// Global list of library patterns
const libraryPatterns = [
  { name: 'jQuery', regex: /jquery(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'Bootstrap', regex: /bootstrap(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'AngularJS', regex: /angular.js(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  // { name: 'React', regex: /react(?:[-./@])?(\d+(?:\.\d+)?(?:\.\d+)?)?/gi },
  { name: 'React-Dom', regex: /react-dom(?:[-./@])?(\d+(?:\.\d+)?(?:\.\d+)?)/gi },
  { name: 'Vue.js', regex: /vue(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'Lodash', regex: /lodash(?:\.js)?\/(\d+\.\d+\.\d+)/gi },
  { name: 'Moment.js', regex: /moment(?:\.js)?\/(\d+\.\d+\.\d+)/gi },
  // { name: 'GSAP', regex: /gsap(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  // { name: 'Axios', regex: /axios(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'Chart.js', regex: /Chart(?:\.js)?\/(\d+\.\d+\.\d+)/gi },
  // { name: 'Tailwind CSS', regex: /tailwind(?:[-./@])?(\d+\.\d+\.\d+)?/gi }
];

// Global list to store detected libraries
let detectedLibraries = [];

function initializeTab2() {
  const analyzeButton = document.getElementById('analyze-btn');
  const resultsTable = document.getElementById('results-table').querySelector('tbody');
  const loadingBarContainer = document.getElementById('loading-bar-container');
  const loadingBar = document.getElementById('loading-bar');

  analyzeButton.addEventListener('click', async () => {
    resultsTable.innerHTML = ''; 

    // Remove any existing loading indicator
    let existingLoadingIndicator = document.getElementById('loading-indicator');
    if (existingLoadingIndicator) {
      existingLoadingIndicator.remove();
    }

    // Create and show new loading text
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.textContent = 'Scanning, please wait...';
    loadingIndicator.style.padding = '10px';
    loadingIndicator.style.fontSize = '16px';
    loadingIndicator.style.color = '#007BFF';
    document.getElementById('analysis-results').appendChild(loadingIndicator);

    // Show loading bar and reset progress
    loadingBarContainer.style.display = 'block';
    loadingBar.style.width = '0%';

    // Get the total number of detected libraries (to adjust speed)
    let totalLibraries = 0;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: analyzePage,
        },
        async (results) => {
          if (results && results[0] && results[0].result) {
            const { scripts, links } = results[0].result;

            totalLibraries = scripts.length + links.length; // Count total libraries

            let progress = 0;
            let progressSpeed = Math.max(500 - totalLibraries * 20, 100);
            const interval = setInterval(() => {
              if (progress < 90) {
                progress += 5;
                loadingBar.style.width = progress + '%';
              }
            }, progressSpeed);

            // Process libraries
            const allResults = [];
            for (const src of scripts) {
              allResults.push(await analyzeDependency(src, 'Script', results[0].result.pageDomain));
            }
            for (const href of links) {
              allResults.push(await analyzeDependency(href, 'Link', results[0].result.pageDomain));
            }

            const sortedResults = allResults.sort((a, b) => {
              if (a.risk !== 'None' && b.risk === 'None') return -1;
              if (a.risk === 'None' && b.risk !== 'None') return 1;
              return 0;
            });

            sortedResults.forEach(addRowToTable);

            clearInterval(interval);
            loadingBar.style.width = '100%';

            setTimeout(() => {
              loadingIndicator.remove();
              loadingBarContainer.style.display = 'none';
            }, 500);
          }
        }
      );
    });
  });

  
  function addRowToTable({ risk, library, version, thirdParty, type, source, cveData }) {
    
    // Skip empty library names
    if (!library || library.trim() === "") {
        return; // Exit function early if library is empty
    }

    const row = document.createElement('tr');

    let cveText = "No CVEs found";
    let severityText = "N/A";
    let scoreText = "N/A";
    let descriptionText = "No description available";

    if (cveData.length > 0) {
        cveText = cveData.map(cve => `${cve.id}`).join("<br>");
        severityText = cveData.map(cve => `${cve.severity}`).join("<br>");
        scoreText = cveData.map(cve => `${cve.score}`).join("<br>");
        descriptionText = cveData.map(cve => `${cve.description}`).join("<br><br>");
    }

    row.innerHTML = `
      <td>${library} ${version !== "Unknown" ? "(v" + version + ")" : ""}</td>  
      <td>${cveText}</td>  
      <td>${severityText}</td>  
      <td>${scoreText}</td>  
      <!-- <td>${descriptionText}</td> -->  
      <td>${thirdParty ? 'Yes' : 'No'}</td>
      <td>${type}</td>
      <td>${source}</td>
    `;

    resultsTable.appendChild(row);
}


async function analyzeDependency(url, type, pageDomain) {
  let detectedLibraries = detectLibrary(url);
  let thirdParty = !url.includes(pageDomain);
  let risk = 'None';
  let cveData = [];
  let fetchError = false;
  let fetchErrorDetails = null;

  // Fetch CVE data for each detected library
  for (const lib of detectedLibraries) {
    try {
      const cveResults = await fetchFilteredCveData(lib.name, lib.version);
      if (cveResults.length > 0) {
        risk = "Known vulnerabilities found";
        cveData.push(...cveResults);
      }
    } catch (error) {
      fetchError = true;
      fetchErrorDetails = error;
    }
  }

  if (fetchError && cveData.length === 0) {
    displayErrorMessage(`Error fetching CVE data: ${fetchErrorDetails.message} (Status: ${fetchErrorDetails.status}). Please see the API urls provided instead.`);
    cveData.push({ id: fetchErrorDetails.apiUrl, severity: "N/A", score: "N/A", description: `Error fetching CVE data: ${fetchErrorDetails.message} (Status: ${fetchErrorDetails.status})` });
  }

  return { risk, library: detectedLibraries.map(lib => lib.name).join(', '), version: detectedLibraries.map(lib => lib.version).join(', '), thirdParty, type, source: url, cveData };
}

function displayErrorMessage(message) {
  const errorMessageDiv = document.getElementById('error-message');
  errorMessageDiv.textContent = message;
  errorMessageDiv.style.display = 'block';

}

  function detectLibrary(url) {
    let detectedLibraries = [];

    for (let pattern of libraryPatterns) {
        let matches = [...url.matchAll(pattern.regex)];

        if (matches.length > 0) {
            let lastValidVersion = "*";

            for (let match of matches) {
                if (match[1]) {
                    lastValidVersion = match[1]; 
                }
            }

            // Ensure no "v*" placeholder in the output
            if (lastValidVersion !== "Unknown") {
                detectedLibraries.push({ name: pattern.name, version: `${lastValidVersion}` });
            } else {
                detectedLibraries.push({ name: pattern.name, version: "*" });
            }
        }
    }

    return detectedLibraries;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFilteredCveData(library, version) {

  const apiKey = "c3b30601-94dc-4d8e-893a-0f22fd64f9b2";

  // Normalize library names for correct CPE format
  const cpeMapping = {
    "jQuery": "jquery:jquery",
    "Bootstrap": "getbootstrap:bootstrap",
    "AngularJS": "angularjs:angular.js",
    // "React": "facebook:react", not much vulnerability
    "React-Dom": "facebook:react",
    "Vue.js": "vuetifyjs:vuetify",
    "Lodash": "lodash:lodash",
    "Moment.js": "momentjs:moment",
    // "GSAP": "greensock:gsap", not much vulnerability
    // "Axios": "axios:axios", not much vulnerability
    "Chart.js": "chartjs:chart.js",
    //"Tailwind CSS": "tailwindcss:tailwind.css", not much vulnerability
  };

  // Ensure React-Dom version is always in x.0.0 format
  if (library === "React-Dom" && /^\d+$/.test(version)) {
    version = `${version}.0.0`;
  }

  let cpeName;
  if (library === "Lodash") {
    cpeName = `cpe:2.3:a:lodash:lodash:${version}:*:*:*:*:node.js:*:*`;
  } else if (library === "Moment.js") {
    cpeName = `cpe:2.3:a:momentjs:moment:${version}:*:*:*:*:node.js:*:*`;
  } else if (library === "Chart.js") {
    cpeName = `cpe:2.3:a:chartjs:chart.js:${version}:*:*:*:*:node.js:*:*`;
  } else {
    const vendorProduct = cpeMapping[library] || library.toLowerCase();
    cpeName = `cpe:2.3:a:${vendorProduct}:${version}:*:*:*:*:*:*:*`;
  }

  const apiUrl = `https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=${encodeURIComponent(cpeName)
    .replace(/%3A/g, ":")
    .replace(/%2A/g, "*")}`;

    console.log(`Fetching CVE data for ${library} v${version}: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apiKey": apiKey,
      },
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();
    if (data && data.vulnerabilities) {
      return data.vulnerabilities.map(vuln => ({
        id: vuln.cve.id,
        severity: vuln.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity ||
          vuln.cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseSeverity ||
          vuln.cve.metrics?.cvssMetricV2?.[0]?.cvssData?.baseSeverity || "Unknown",
        score: vuln.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
          vuln.cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore ||
          vuln.cve.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore || "N/A",
        description: vuln.cve.descriptions?.[0]?.value || "No description available"
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetching CVE data:", error);
    error.apiUrl = apiUrl;
    throw error;
  }  finally {
    console.log("Sleeping for 1 second to avoid rate limits...");
    await sleep(1000);
  }
}
  function analyzePage() {
    const pageDomain = window.location.hostname;

    const scripts = Array.from(document.querySelectorAll('script'))
      .map(script => script.src)
      .filter(src => src);

    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], a'))
      .map(link => link.href)
      .filter(href => href);

    return { scripts, links, pageDomain };
  }
}

export default initializeTab2;
