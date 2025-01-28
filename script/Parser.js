// Function to extract URLs from text content using regex
function extractURLs(text) {
  const urlRegex = /(https?:\/\/[^\s<>"']+|\/[^\s<>"']+)/g;
  return text.match(urlRegex) || [];
}

// Parse JavaScript files for additional endpoints
async function parseJavaScriptFile(url) {
  try {
    const response = await fetch(url);
    const jsContent = await response.text();
    return extractURLs(jsContent);
  } catch (error) {
    console.error(`Error parsing JS file ${url}:`, error);
    return [];
  }
}

// Main parsing function
window.parseEndpoints = async function() {
  const endpoints = new Set();
  
  // Parse DOM elements
  const elements = {
    links: document.querySelectorAll('a[href]'),
    scripts: document.querySelectorAll('script[src]'),
    images: document.querySelectorAll('img[src]'),
    forms: document.querySelectorAll('form[action]'),
    iframes: document.querySelectorAll('iframe[src]'),
    sources: document.querySelectorAll('source[src]'),
    linkTag: document.querySelectorAll('link[href]')
  };

  // Extract URLs from elements
  for (const [type, nodeList] of Object.entries(elements)) {
    nodeList.forEach(element => {
      const url = type === 'links' ? element.href : element.src;
      if (url) endpoints.add(url);
    });
  }

  // Parse inline scripts
  document.querySelectorAll('script:not([src])').forEach(script => {
    const foundUrls = extractURLs(script.textContent);
    foundUrls.forEach(url => endpoints.add(url));
  });

  // Parse external JavaScript files
  const jsFiles = Array.from(document.querySelectorAll('script[src]'))
    .map(script => script.src)
    .filter(src => src.endsWith('.js'));

  for (const jsFile of jsFiles) {
    const jsEndpoints = await parseJavaScriptFile(jsFile);
    jsEndpoints.forEach(endpoint => endpoints.add(endpoint));
  }

  // Monitor network requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    endpoints.add(url);
    return originalFetch.apply(this, args);
  };

  // Monitor XHR requests
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(...args) {
    endpoints.add(args[1]); // args[1] is the URL
    return originalOpen.apply(this, args);
  };

  // Filter and classify endpoints
  const processedEndpoints = Array.from(endpoints).map(url => ({
    url: url,
    type: classifyEndpoint(url),
    source: determineSource(url)
  }));

  return processedEndpoints;
}

// Classify endpoint types
function classifyEndpoint(url) {
  const extension = url.split('.').pop().toLowerCase();
  const path = new URL(url).pathname;
  
  if (extension.match(/^(jpg|jpeg|png|gif|svg|webp)$/)) return 'Image';
  if (extension.match(/^(js)$/)) return 'JavaScript';
  if (extension.match(/^(css)$/)) return 'Stylesheet';
  if (extension.match(/^(json)$/)) return 'API';
  if (path.includes('/api/')) return 'API';
  return 'Other';
}

// Determine source of endpoint
function determineSource(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.host === window.location.host) return 'Internal';
    return 'External';
  } catch {
    return 'Invalid URL';
  }
}