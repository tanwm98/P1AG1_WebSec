// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "parseEndpoints") {
    parsePageEndpoints();
  }
});

// Function to parse endpoints from the page
function parsePageEndpoints() {
  const endpoints = new Set();

  // Parse from anchor tags
  document.querySelectorAll('a').forEach(link => {
    if (link.href) {
      endpoints.add(link.href);
    }
  });

  // Parse from scripts
  document.querySelectorAll('script').forEach(script => {
    if (script.src) {
      endpoints.add(script.src);
    }
  });

  // Parse from forms
  document.querySelectorAll('form').forEach(form => {
    if (form.action) {
      endpoints.add(form.action);
    }
  });

  // Parse from fetch/XHR requests by injecting a script
  const script = document.createElement('script');
  script.textContent = `
    // Override fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string') {
        window.postMessage({ type: 'ENDPOINT_FOUND', endpoint: url }, '*');
      }
      return originalFetch.apply(this, args);
    };

    // Override XMLHttpRequest
    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(...args) {
      const url = args[1];
      window.postMessage({ type: 'ENDPOINT_FOUND', endpoint: url }, '*');
      return originalXHR.apply(this, args);
    };
  `;
  document.documentElement.appendChild(script);

  // Listen for messages from the injected script
  window.addEventListener('message', (event) => {
    if (event.data.type === 'ENDPOINT_FOUND') {
      endpoints.add(event.data.endpoint);
      updateStorage(Array.from(endpoints));
    }
  });

  // Update storage with found endpoints
  updateStorage(Array.from(endpoints));
}

// Function to update chrome storage with found endpoints
function updateStorage(endpoints) {
  chrome.storage.local.set({ endpoints: endpoints }, () => {
    chrome.runtime.sendMessage({
      action: 'endpointsUpdated',
      count: endpoints.length
    });
  });
}

// Auto-parse if enabled
chrome.storage.local.get(['autoParseEnabled'], (result) => {
  if (result.autoParseEnabled) {
    parsePageEndpoints();
  }
});