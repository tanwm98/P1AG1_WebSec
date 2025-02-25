// Function to initialize tab5 functionality
export function initializeTab5() {
	const urlCountElement = document.getElementById('urlCount');
	const panelBtn = document.getElementById('panelBtn');
	const downloadBtn = document.getElementById('downloadBtn');
	const urlFilter = document.getElementById('urlFilter');
	const urlDisplay = document.getElementById('urlDisplay');
	const currentWebsiteElement = document.getElementById('currentWebsite');

	if (!urlCountElement) return; // Not on tab5

	function updateCurrentWebsite() {
		chrome.tabs.query({
			active: true,
			currentWindow: true
		}, (tabs) => {
			const activeTab = tabs[0];
			if (activeTab && activeTab.url) {
				try {
					const url = new URL(activeTab.url);
					currentWebsiteElement.textContent = url.hostname;
				} catch (e) {
					currentWebsiteElement.textContent = '-';
				}
			}
		});
	}

	function displayUrls(endpoints) {
		if (!endpoints || !endpoints.length) {
			urlDisplay.innerHTML = '<p class="info-text">No URLs captured</p>';
			return;
		}

		const html = endpoints.map(endpoint => `
            <div class="url-item">
                ${endpoint.url}
                <span style="color: #a0aec0; font-size: 0.8em;">[${endpoint.source || 'link'}]</span>
            </div>
        `).join('');

		urlDisplay.innerHTML = html;
	}

	function filterURLs(searchTerm) {
		chrome.storage.local.get(['endpoints'], (result) => {
			if (!result.endpoints) return;

			const filtered = searchTerm ?
				result.endpoints.filter(endpoint =>
					endpoint.url.toLowerCase().includes(searchTerm.toLowerCase())) :
				result.endpoints;

			displayUrls(filtered);
		});
	}

	function downloadURLsAsTxt() {
		chrome.storage.local.get(['endpoints'], (result) => {
			const urls = result.endpoints?.map(endpoint => endpoint.url) || [];
			const blob = new Blob([urls.join('\n')], {
				type: 'text/plain'
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'urls-unmodified.txt';
			a.click();
			URL.revokeObjectURL(url);
		});
	}

	// Function to handle reparse
	function handleReparse() {
		chrome.tabs.query({
			active: true,
			currentWindow: true
		}, (tabs) => {
			const activeTab = tabs[0];
			if (activeTab && activeTab.id !== undefined) {
				chrome.tabs.sendMessage(activeTab.id, {
					action: "parseEndpoints"
				}, response => {
					if (chrome.runtime.lastError) {
						console.error("Error:", chrome.runtime.lastError);
						return;
					}
				});
			}
		});
	}
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') {
			handleReparse();
			updateCurrentWebsite();
		}
	});

	// Add listener for tab changes
	chrome.tabs.onActivated.addListener(() => {
		updateCurrentWebsite();
	});

	// Add listener for URL changes in the current tab
	chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		if (changeInfo.url) {
			updateCurrentWebsite();
		}
	});

	// Get initial auto parse state
	chrome.storage.local.get(['endpoints'], (result) => {
		if (result.endpoints) {
			urlCountElement.textContent = result.endpoints.length;
			displayUrls(result.endpoints);
		}
	});

	panelBtn.addEventListener('click', function() {
		// Open panel.html in a new window
		chrome.tabs.create({
			url: chrome.runtime.getURL('panel.html')
		});
	});

	downloadBtn.addEventListener('click', downloadURLsAsTxt);

	let filterTimeout;
	urlFilter.addEventListener('input', (e) => {
		clearTimeout(filterTimeout);
		filterTimeout = setTimeout(() => {
			filterURLs(e.target.value);
		}, 300);
	});

	// Listen for updates from content script
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (request.action === 'endpointsUpdated') {
			urlCountElement.textContent = request.count;
			chrome.storage.local.get(['endpoints'], (result) => {
				displayUrls(result.endpoints);
			});
		}
	});

	// Initial parse when tab5 is loaded
	handleReparse();

	// Call updateCurrentWebsite when the tab is initialized
	updateCurrentWebsite();
}