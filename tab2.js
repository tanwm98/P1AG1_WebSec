function initializeStaticAnalysis() {
  const analyzeButton = document.getElementById('analyze-btn');
  const resultsTable = document.getElementById('results-table').querySelector('tbody');

  analyzeButton.addEventListener('click', () => {
    resultsTable.innerHTML = ''; // Clear previous results

    const allResults = [];

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: analyzePage,
        },
        (results) => {
          if (results && results[0] && results[0].result) {
            const { scripts, links, pageDomain } = results[0].result;

            scripts.forEach((src) => {
              allResults.push(analyzeDependency(src, 'Script', pageDomain));
            });

            links.forEach((href) => {
              allResults.push(analyzeDependency(href, 'Link', pageDomain));
            });

            // Sort: Security issues first
            const sortedResults = allResults.sort((a, b) => {
              if (a.risk !== 'None' && b.risk === 'None') return -1;
              if (a.risk === 'None' && b.risk !== 'None') return 1;
              return 0;
            });

            sortedResults.forEach(addRowToTable);
          }
        }
      );
    });
  });

  function addRowToTable({ risk, library, thirdParty, type, source }) {
    const row = document.createElement('tr');

    if (risk !== 'None') {
      row.style.backgroundColor = '#ffcccc'; // Highlight security risks
    }

    row.innerHTML = `
      <td>${risk}</td>
      <td>${library}</td>
      <td>${thirdParty ? 'Yes' : 'No'}</td>
      <td>${type}</td>
      <td>${source}</td>
    `;

    resultsTable.appendChild(row);
  }

  function analyzeDependency(url, type, pageDomain) {
    let library = detectLibrary(url);
    let thirdParty = !url.includes(pageDomain);
    let risk = 'None';

    // Security checks
    if (url.startsWith('http://')) {
      risk = 'Insecure protocol (http)';
    }
    if (url.includes('redirect')) {
      risk = 'Potential unsafe redirect';
    }
    if (url.includes('eval')) {
      risk = 'Potential XSS risk (eval detected)';
    }

    return { risk, library, thirdParty, type, source: url };
  }

  function detectLibrary(url) {
    const libraryPatterns = [
        { name: 'jQuery', regex: /jquery(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Bootstrap', regex: /bootstrap(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'AngularJS', regex: /angular(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'React', regex: /react(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Vue.js', regex: /vue(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Lodash', regex: /lodash(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Moment.js', regex: /moment(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'GSAP', regex: /gsap(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'FontAwesome', regex: /fontawesome/gi },
        { name: 'D3.js', regex: /d3(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Three.js', regex: /three(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Axios', regex: /axios(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Chart.js', regex: /chart(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Slick Carousel', regex: /slick(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Swiper', regex: /swiper(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Tailwind CSS', regex: /tailwind(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Ember.js', regex: /ember(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Backbone.js', regex: /backbone(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Matter.js', regex: /matter(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'PixiJS', regex: /pixi(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Popper.js', regex: /popper(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'FullCalendar', regex: /fullcalendar(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'GraphQL', regex: /graphql(?:[-./@])?(\d+\.\d+\.\d+)?/gi },
        { name: 'Socket.IO', regex: /socket.io(?:[-./@])?(\d+\.\d+\.\d+)?/gi }
    ];

    let detectedLibraries = [];

    for (let pattern of libraryPatterns) {
        let matches = [...url.matchAll(pattern.regex)];

        if (matches.length > 0) {
            let lastValidVersion = null;

            // Loop through all matches and find the last valid version
            for (let match of matches) {
                if (match[1]) {
                    lastValidVersion = match[1];
                }
            }

            // If a version was found, use it; otherwise, just the library name
            detectedLibraries.push(lastValidVersion ? `${pattern.name} (v${lastValidVersion})` : pattern.name);
        }
    }

    return detectedLibraries.length > 0 ? detectedLibraries.join(', ') : 'Unknown';
}



  function analyzePage() {
    const pageDomain = window.location.hostname;

    const scripts = Array.from(document.querySelectorAll('script'))
      .map((script) => script.src)
      .filter((src) => src);

    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], a'))
      .map((link) => link.href)
      .filter((href) => href);

    return { scripts, links, pageDomain };
  }
}
