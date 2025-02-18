class CodeViewer {
  constructor() {
    this.beautifyOptions = {
      indent_size: 2,
      preserve_newlines: true
    };
  }

  // Fetch the full code snippet from the provided URL
  async fetchCodeSnippet(url) {
    try {
      console.log('Fetching:', url);
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_URL',
        url: url  // Ensure this is a string URL
      });
      console.log('Response:', response);

      if (!response || !response.ok) {
        throw new Error(response?.error || 'Failed to fetch');
      }

      // Beautify the entire fetched code
      const beautifiedCode = js_beautify(response.text, this.beautifyOptions);
      return { snippet: beautifiedCode };
    } catch (error) {
      console.error('Fetch error details:', error);
      return { snippet: `Failed to fetch: ${error.message}` };
    }
  }
      async fetchResponse(url, method) {
          try {
              const response = await chrome.runtime.sendMessage({
                  action: 'sendRequest',
                  endpoint: { url },
                  method: method,
                  customRequest: {
                      headers: {
                          'Content-Type': 'application/json',
                          // Request headers that might affect response size
                          'Accept-Encoding': 'gzip, deflate, br'
                      },
                    body: method === 'POST' ? JSON.stringify({}) : undefined
                  }
              });
              // Calculate content length if not provided in headers
              const contentLength = response.headers['content-length'] || response.body.length.toString();
              return {
                  response: {
                      status: response.status,
                      statusText: response.statusText,
                      headers: response.headers,
                      body: response.body
                  }
              };
          } catch (error) {
              console.error('Response fetch error:', error);
              throw error;
          }
      }
  }

document.addEventListener('DOMContentLoaded', function() {
    const endpointFilter = document.getElementById('endpointFilter');
    const exportBtn = document.getElementById('exportBtn');
    const endpointList = document.getElementById('endpointList');
    const codeViewer = new CodeViewer();

function updateDisplay(endpoints) {
    const endpointsList = endpoints.map(endpoint => `
        <div class="endpoint-group">
            <div class="endpoint-line">
                <span class="endpoint-url">${endpoint.url || ''}</span>
                <span class="endpoint-actions">
                    <button class="view-code-btn">View Code</button>
                    <button class="response-btn">View Response</button>
                </span>
            </div>
            <!-- Code Modal -->
            <div class="code-modal" style="display: none;">
                <div class="modal-content">
                    <h2 class="modal-title"></h2>
                    <p class="hits-info"></p>
                    <pre class="code-snippet"></pre>
                    <button class="close-modal-btn">Close</button>
                </div>
            </div>
            <!-- Response Modal -->
            <div class="response-modal" style="display: none;">
                <div class="modal-content">
                    <div class="method-tabs">
                        <button class="tab-btn tab-get active">GET</button>
                        <button class="tab-btn tab-post">POST</button>
                    </div>
                    <div class="response-view">
                        <h4>Response URL:</h4>
                        <pre class="url-display"></pre>
                        <h4>Response Headers:</h4>
                        <div class="headers-display"></div>
                        <h4>Response Body:</h4>
                        <pre class="body-display"></pre>
                    </div>
                    <button class="close-modal-btn">Close</button>
                </div>
            </div>
        </div>
    `).join('');

    endpointList.innerHTML = endpointsList;
}

    // Event listeners for code and response buttons
  endpointList.addEventListener('click', async (e) => {
    // When the "View Code" button is clicked
    if (e.target.classList.contains('view-code-btn')) {
      const endpointGroup = e.target.closest('.endpoint-group');
      const modal = endpointGroup.querySelector('.code-modal');
      const modalTitle = modal.querySelector('.modal-title');
      const codeSnippet = modal.querySelector('.code-snippet');
      const url = endpointGroup.querySelector('.endpoint-url').textContent.trim();

      modal.style.display = 'block';
      codeSnippet.textContent = 'Loading...';

      try {
        const result = await codeViewer.fetchCodeSnippet(url);
        modalTitle.textContent = `Code Snippet for ${url}`;
        // Display the entire beautified code
        codeSnippet.textContent = result.snippet || 'No code snippet found';
      } catch (error) {
        codeSnippet.textContent = 'Failed to fetch code snippet';
      }
    }

 if (e.target.classList.contains('response-btn')) {
        console.log('Response button clicked');
        const endpointGroup = e.target.closest('.endpoint-group');
        const modal = endpointGroup.querySelector('.response-modal');
        const url = endpointGroup.querySelector('.endpoint-url').textContent.trim();

        // Show modal
        modal.style.display = 'block';

        async function loadResponse(method) {
            const urlDisplay = modal.querySelector('.url-display');
            const headersDisplay = modal.querySelector('.headers-display');
            const bodyDisplay = modal.querySelector('.body-display');

            urlDisplay.textContent = 'Loading...';
            headersDisplay.textContent = 'Loading...';
            bodyDisplay.textContent = 'Loading...';

            try {
                const response = await codeViewer.fetchResponse(url, method);
                console.log('Response received:', response);

                urlDisplay.textContent = url;
                headersDisplay.innerHTML = Object.entries(response.response.headers)
                    .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
                    .join('');

                try {
                    const jsonBody = JSON.parse(response.response.body);
                    bodyDisplay.textContent = JSON.stringify(jsonBody, null, 2);
                } catch {
                    bodyDisplay.textContent = response.response.body;
                }
            } catch (error) {
                urlDisplay.textContent = url;
                headersDisplay.textContent = 'Error loading headers';
                bodyDisplay.textContent = `Error: ${error.message}`;
            }
        }

        // Set up tab handlers
        const getTab = modal.querySelector('.tab-get');
        const postTab = modal.querySelector('.tab-post');

        getTab.onclick = () => {
            getTab.classList.add('active');
            postTab.classList.remove('active');
            loadResponse('GET');
        };

        postTab.onclick = () => {
            postTab.classList.add('active');
            getTab.classList.remove('active');
            loadResponse('POST');
        };

        // Load GET response by default
        loadResponse('GET');
    }

    // Close button handler
    if (e.target.classList.contains('close-modal-btn')) {
        const modal = e.target.closest('.code-modal, .response-modal');
        if (modal) modal.style.display = 'none';
    }
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('code-modal') || e.target.classList.contains('response-modal')) {
        e.target.style.display = 'none';
    }
});
    // Get endpoints from storage and display
    chrome.storage.local.get(['endpoints'], function(result) {
      if (result.endpoints) {
        updateDisplay(result.endpoints); // Make sure updateDisplay is defined
      }
    });

  // Filter functionality
  endpointFilter.addEventListener('input', function(e) {
    chrome.storage.local.get(['endpoints'], function(result) {
      if (result.endpoints) {
        const filtered = result.endpoints.filter(endpoint =>
          endpoint.url.toLowerCase().includes(e.target.value.toLowerCase())
        );
        updateDisplay(filtered); // Again, ensure updateDisplay is defined
      }
    });
  });

  // Export functionality
  exportBtn.addEventListener('click', function() {
    chrome.storage.local.get(['endpoints'], function(result) {
      if (result.endpoints) {
        const blob = new Blob([JSON.stringify(result.endpoints, null, 2)],
          { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'endpoints.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  });
});

document.addEventListener('click', (e) => {
  const modals = document.querySelectorAll('.code-modal');
  modals.forEach(modal => {
    if (modal.style.display === 'block') {
      // Check if click is outside modal-content
      const modalContent = modal.querySelector('.modal-content');
      if (!modalContent.contains(e.target) && !e.target.classList.contains('view-code-btn')) {
        modal.style.display = 'none';
      }
    }
  });
});