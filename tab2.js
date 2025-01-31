// Global list of library patterns
const libraryPatterns = [
  { name: 'jQuery', regex: /jquery(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'Bootstrap', regex: /bootstrap(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'AngularJS', regex: /angular.js(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'React', regex: /react(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'Vue.js', regex: /vue(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'Lodash', regex: /lodash(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'Moment.js', regex: /moment(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'GSAP', regex: /gsap(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'Axios', regex: /axios(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'Chart.js', regex: /chart(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
  { name: 'Tailwind CSS', regex: /tailwind(?:[-./@])?(\d+\.\d+\.\d+)?/gi }
];

// Global list to store detected libraries
let detectedLibraries = [];

function initializeStaticAnalysis() {
  const analyzeButton = document.getElementById('analyze-btn');
  const resultsTable = document.getElementById('results-table').querySelector('tbody');

  analyzeButton.addEventListener('click', async () => {
    resultsTable.innerHTML = ''; // Clear previous results

    const allResults = [];

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: analyzePage,
        },
        async (results) => {
          if (results && results[0] && results[0].result) {
            const { scripts, links, pageDomain } = results[0].result;

            // Process all dependencies
            for (const src of scripts) {
              allResults.push(await analyzeDependency(src, 'Script', pageDomain));
            }
            for (const href of links) {
              allResults.push(await analyzeDependency(href, 'Link', pageDomain));
            }

            // Sort: Security issues first
            const sortedResults = allResults.sort((a, b) => {
              if (a.risk !== 'None' && b.risk === 'None') return -1;
              if (a.risk === 'None' && b.risk !== 'None') return 1;
              return 0;
            });

            // Add results to table
            sortedResults.forEach(addRowToTable);
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

    // Highlight rows with security risks
    // if (risk !== 'None') {
    //     row.style.backgroundColor = '#ffcccc';
    // }

    let cveText = "No CVEs found";
    let severityText = "N/A";
    let scoreText = "N/A";

    if (cveData.length > 0) {
        cveText = cveData.map(cve => `${cve.id}`).join("<br>");
        severityText = cveData.map(cve => `${cve.severity}`).join("<br>");
        scoreText = cveData.map(cve => `${cve.score}`).join("<br>");
    }

    row.innerHTML = `
      <td>${library} ${version !== "Unknown" ? "(v" + version + ")" : ""}</td>  
      <td>${cveText}</td>  
      <td>${severityText}</td>  
      <td>${scoreText}</td>  
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

    // Security checks
    // if (url.startsWith('http://')) {
    //   risk = 'Insecure protocol (http)';
    // }
    // if (url.includes('redirect')) {
    //   risk = 'Potential unsafe redirect';
    // }
    // if (url.includes('eval')) {
    //   risk = 'Potential XSS risk (eval detected)';
    // }

    // Fetch CVE data for each detected library
    for (const lib of detectedLibraries) {
      const cveResults = await fetchFilteredCveData(lib.name, lib.version);
      if (cveResults.length > 0) {
        risk = "Known vulnerabilities found";
        cveData.push(...cveResults);
      }
    }

    return { risk, library: detectedLibraries.map(lib => lib.name).join(', '), version: detectedLibraries.map(lib => lib.version).join(', '), thirdParty, type, source: url, cveData };
  }

  function detectLibrary(url) {
    // Clear the list before each detection
    detectedLibraries = [];

    for (let pattern of libraryPatterns) {
        let matches = [...url.matchAll(pattern.regex)];

        if (matches.length > 0) {
            let lastValidVersion = "Unknown";

            for (let match of matches) {
                if (match[1]) {
                    lastValidVersion = match[1];
                    console.log(lastValidVersion)
                }
            }

            detectedLibraries.push({ name: pattern.name, version: lastValidVersion });
        }
    }
    return detectedLibraries;
    
  }

  async function fetchFilteredCveData(library, version) {
    // Normalize library names for correct CPE format
    const cpeMapping = {
        "jQuery": "jquery:jquery",
        "Bootstrap": "getbootstrap:bootstrap",
        "AngularJS": "angularjs:angular.js",
        "React": "facebook:react",
        "Vue.js": "vuejs:vue",
        "Lodash": "lodash:lodash",
        "Moment.js": "momentjs:moment.js",
        "GSAP": "greensock:gsap",
        "Axios": "axios:axios",
        "Chart.js": "chartjs:chart.js",
        "Tailwind CSS": "tailwindcss:tailwind.css"
    };

    // Use the correct CPE format if known
    const vendorProduct = cpeMapping[library] || library.toLowerCase();
    const cpeName = `cpe:2.3:a:${vendorProduct}:${version}:*:*:*:*:*:*:*`;
    
    // Encode only necessary parts
    const apiUrl = `https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=${encodeURIComponent(cpeName)
      .replace(/%3A/g, ":") // Revert encoding of `:`
      .replace(/%2A/g, "*")}`; // Revert encoding of `*`
    
    console.log(apiUrl);
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();

        if (data && data.vulnerabilities) {
          const filteredCves = data.vulnerabilities.map(vuln => ({
              id: vuln.cve.id,
              severity: vuln.cve.metrics?.cvssMetricV3?.[0]?.baseSeverity || 
                        vuln.cve.metrics?.cvssMetricV2?.[0]?.baseSeverity || 
                        "Unknown",
              score: vuln.cve.metrics?.cvssMetricV3?.[0]?.cvssData?.baseScore || 
                     vuln.cve.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore || 
                     "N/A",
              description: vuln.cve.descriptions?.[0]?.value || "No description available"
          }));

          console.log(`Filtered CVEs for ${library} ${version}:`, filteredCves);
          return filteredCves;
      } else {
          console.log(`No vulnerabilities found for ${library} ${version}`);
          return [];
      }
    } catch (error) {
        console.error("Error fetching CVE data:", error);
        return [];
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
