document.addEventListener('DOMContentLoaded', function() {
    // Get stored endpoints from extension storage
    chrome.storage.local.get(['endpoints'], function(result) {
        if (result.endpoints) {
            displayEndpoints(result.endpoints);
        }
    });

    // Setup filter functionality
    const filterInput = document.getElementById('endpointFilter');
    filterInput.addEventListener('input', function(e) {
        filterEndpoints(e.target.value);
    });

    // Setup export functionality
    document.getElementById('exportBtn').addEventListener('click', exportEndpoints);
});

function displayEndpoints(endpoints) {
    const container = document.getElementById('endpointsContainer');
    container.innerHTML = ''; // Clear existing content

    endpoints.forEach(endpoint => {
        const card = document.createElement('div');
        card.className = 'endpoint-card';

        // URL Section
        const urlSection = document.createElement('div');
        urlSection.className = 'endpoint-detail';
        urlSection.innerHTML = `
            <h4>URL</h4>
            <span class="method-tag ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
            <span>${endpoint.url}</span>
        `;

        // Parameters Section
        const paramsSection = document.createElement('div');
        paramsSection.className = 'endpoint-detail';
        paramsSection.innerHTML = `
            <h4>Parameters</h4>
            <ul class="params-list">
                ${endpoint.parameters.map(param => `<li>${param}</li>`).join('')}
            </ul>
        `;

        // Source Section
        const sourceSection = document.createElement('div');
        sourceSection.className = 'endpoint-detail';
        sourceSection.innerHTML = `
            <h4>Source</h4>
            <span>${endpoint.source}</span>
        `;

        card.appendChild(urlSection);
        card.appendChild(paramsSection);
        card.appendChild(sourceSection);
        container.appendChild(card);
    });
}

function filterEndpoints(query) {
    const cards = document.querySelectorAll('.endpoint-card');
    query = query.toLowerCase();

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? 'grid' : 'none';
    });
}

function exportEndpoints() {
    chrome.storage.local.get(['endpoints'], function(result) {
        if (result.endpoints) {
            const dataStr = JSON.stringify(result.endpoints, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

            const exportName = 'endpoints_' + new Date().toISOString().slice(0,10) + '.json';

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportName);
            linkElement.click();
        }
    });
}