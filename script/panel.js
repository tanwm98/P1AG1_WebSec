document.addEventListener('DOMContentLoaded', function() {
    const endpointFilter = document.getElementById('endpointFilter');
    const exportBtn = document.getElementById('exportBtn');
    const endpointList = document.getElementById('endpointList');
    const countElements = document.querySelectorAll('.count');

    function updateDisplay(endpoints) {
        // Update count displays

        // Generate endpoints list with plain text buttons
        const endpointsList = endpoints.map(endpoint => `
            <div class="endpoint-group">
                <div class="endpoint-line">
                    <span class="endpoint-url">${endpoint.url}</span>
                    <div class="endpoint-metadata">
                        <span class="endpoint-actions">
                            <button class="action-btn code-btn">[Code]</button>
                            <button class="action-btn response-btn">[Response]</button>
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        endpointList.innerHTML = endpointsList;

        // Add event listeners for buttons
        document.querySelectorAll('.code-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const url = this.closest('.endpoint-line').querySelector('.endpoint-url').textContent;
                viewCode(url);
            });
        });

        document.querySelectorAll('.response-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const url = this.closest('.endpoint-line').querySelector('.endpoint-url').textContent;
                viewResponse(url);
            });
        });
    }


    // Get endpoints from storage and display
    chrome.storage.local.get(['endpoints'], function(result) {
        if (result.endpoints) {
            updateDisplay(result.endpoints);
        }
    });

    // Filter functionality
    endpointFilter.addEventListener('input', function(e) {
        chrome.storage.local.get(['endpoints'], function(result) {
            if (result.endpoints) {
                const filtered = result.endpoints.filter(endpoint =>
                    endpoint.url.toLowerCase().includes(e.target.value.toLowerCase())
                );
                updateDisplay(filtered);
            }
        });
    });

    // Export functionality
    exportBtn.addEventListener('click', function() {
        chrome.storage.local.get(['endpoints'], function(result) {
            if (result.endpoints) {
                const blob = new Blob([JSON.stringify(result.endpoints, null, 2)],
                    {type: 'application/json'});
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