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
    // Common JavaScript libraries with regex patterns
    const libraryPatterns = [
      { name: 'jQuery', regex: /jquery(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Bootstrap', regex: /bootstrap(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'AngularJS', regex: /angular(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'React', regex: /react(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Vue.js', regex: /vue(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Lodash', regex: /lodash(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Moment.js', regex: /moment(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'GSAP', regex: /gsap(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'FontAwesome', regex: /fontawesome/i },
      { name: 'D3.js', regex: /d3(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Three.js', regex: /three(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Axios', regex: /axios(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Chart.js', regex: /chart(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Slick Carousel', regex: /slick(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Swiper', regex: /swiper(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Tailwind CSS', regex: /tailwind(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Ember.js', regex: /ember(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Backbone.js', regex: /backbone(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Matter.js', regex: /matter(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Three.js', regex: /three(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'PixiJS', regex: /pixi(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Popper.js', regex: /popper(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'FullCalendar', regex: /fullcalendar(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'GraphQL', regex: /graphql(?:[-.](\d+\.\d+\.\d+))?/i },
      { name: 'Socket.IO', regex: /socket.io(?:[-.](\d+\.\d+\.\d+))?/i }
    ];

    for (let pattern of libraryPatterns) {
      let match = url.match(pattern.regex);
      if (match) {
        return match[1] ? `${pattern.name} (v${match[1]})` : pattern.name;
      }
    }

    return 'Unknown';
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
