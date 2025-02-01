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

  beautifyCode(code) {
    return js_beautify(code, this.beautifyOptions);
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
                        <button class="action-btn response-btn">[Response]</button>
                    </span>
                </div>
                <div class="code-modal" style="display: none;">
                    <div class="modal-content">
                        <h2 class="modal-title"></h2>
                        <p class="hits-info"></p>
                        <pre class="code-snippet"></pre>
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
      // Get the URL from the endpoint display (trim extra spaces)
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
      const url = e.target.closest('.endpoint-line').querySelector('.endpoint-url').textContent;
      // Implement response viewing logic here
    }

    if (e.target.classList.contains('close-modal-btn')) {
      const modal = e.target.closest('.code-modal');
      modal.style.display = 'none';
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