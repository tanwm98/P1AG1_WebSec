const wafSignatures = {
	cloudflare: {
		headers: [
			'cf-ray',
			'cf-cache-status',
			'__cfduid',
			'cf-request-id',
			'x-amz-cf-id'
		],
		cookiePatterns: [/__cfduid/, /^__cf/, /^_cf/],
		bodyPatterns: [/Ray ID:/, /Error 1020/, /CLOUDFLARE_ERROR_500S_BOX/]
	},
	akamai: {
		headers: [
			'x-akamai-transformed',
			'akamai-origin-hop',
			'x-akamai-request-id'
		],
		cookiePatterns: [/^ak_bmsc/, /^bm_sz/, /^akavpau_/],
		bodyPatterns: [/Access Denied/, /Reference #\d+\.\d+/]
	},
	imperva: {
		headers: [
			'x-iinfo',
			'x-cdn',
			'x-checking-false',
			'x-checking-true'
		],
		cookiePatterns: [/^visid_incap/, /^incap_ses/, /^nlbi_/],
		bodyPatterns: [/Powered by Imperva/, /Incapsula incident ID/]
	},
	sucuri: {
		headers: ['x-sucuri-id', 'x-sucuri-cache'],
		cookiePatterns: [/^sucuri_cloudproxy_/],
		bodyPatterns: [/Sucuri WebSite Firewall/, /Protected by Sucuri/]
	},
	f5: {
		headers: ['x-f5-request-id', 'server'],
		cookiePatterns: [/^TS[a-zA-Z0-9]{3,8}/, /^BIGipServer/],
		bodyPatterns: [/The requested URL was rejected/, /Security by F5/]
	}, // Add these to your wafSignatures object
	fastly: {
		headers: ['x-served-by', 'x-cache', 'x-timer'],
		cookiePatterns: [/^fastly/],
		bodyPatterns: [/Fastly error/, /Behind Fastly/]
	},
	aws: {
		headers: ['x-amz-cf-id', 'x-amz-cf-pop', 'x-amz-request-id'],
		cookiePatterns: [/^aws/, /^x-amz/],
		bodyPatterns: [/AWS Application Load Balancer/, /AWS WAF/]
	},
	varnish: {
		headers: ['x-varnish', 'x-cache', 'via'],
		cookiePatterns: [],
		bodyPatterns: [/varnish cache server/, /X-Varnish/]
	},
	nginx: {
		headers: ['server', 'x-nginx-cache'],
		cookiePatterns: [],
		bodyPatterns: [/nginx\/[\d.]+/, /openresty/]
	},
      fortiweb: {
        headers: ['server', 'x-fortiweb'],
        cookiePatterns: [/^FORTIWAFSID=/],
        bodyPatterns: [/fgd_icon/i, /web\.page\.blocked/i, /attack\.id/i, /message\.id/i, /client\.ip/i]
      },
	fortiguard: {
		headers: ['server', 'x-fortiguard'],
		cookiePatterns: [],
		bodyPatterns: [/fortiguard/i]
	}
};

function detectWAFBySignature(headers, cookies, body) {
	const detectedWAFs = [];
	const results = [];

	for (const [wafName, signature] of Object.entries(wafSignatures)) {
		let matches = 0;
		let totalChecks = 0;
		let confidence = 0;

		// Check headers
		if (signature.headers) {
			totalChecks++;
			const headerMatches = signature.headers.some(header => {
				const headerKey = header.toLowerCase();
				return headers.some(h =>
					h.name.toLowerCase() === headerKey ||
					h.value.toLowerCase().includes(headerKey)
				);
			});
			if (headerMatches) matches++;
		}

		// Check cookies
		if (signature.cookiePatterns) {
			totalChecks++;
			const cookieMatches = signature.cookiePatterns.some(pattern =>
				cookies.some(cookie =>
					pattern.test(cookie.name) ||
					pattern.test(cookie.value)
				)
			);
			if (cookieMatches) matches++;
		}

		// Check body patterns
		if (signature.bodyPatterns && body) {
			totalChecks++;
			const bodyMatches = signature.bodyPatterns.some(pattern =>
				pattern.test(body)
			);
			if (bodyMatches) matches++;
		}

		// Calculate confidence
		if (matches > 0) {
			confidence = (matches / totalChecks) * 100;
			if (confidence >= 30) { // Lower threshold for better detection
				results.push({
					name: wafName.toUpperCase(),
					confidence: confidence,
					matches: matches,
					totalChecks: totalChecks
				});
			}
		}
	}

	// Sort by confidence and select the best matches
	results.sort((a, b) => b.confidence - a.confidence);

	// Return detected WAFs with high enough confidence
	return results.filter(result => result.confidence >= 30);
}



function populateTable(tableId, data, rowTemplate) {
	const tableBody = document.getElementById(tableId);
	if (!tableBody) {
		console.error(`Table body with id ${tableId} not found`);
		return;
	}

	try {
		if (!Array.isArray(data) || data.length === 0) {
			tableBody.innerHTML = `<tr><td colspan="3">No data detected</td></tr>`;
			return;
		}
		const html = data.map(rowTemplate).join('');
		if (!html.trim()) {
			tableBody.innerHTML = `<tr><td colspan="3">No data detected</td></tr>`;
			return;
		}
		tableBody.innerHTML = html;
	} catch (error) {
		console.error(`Error populating table ${tableId}:`, error);
		tableBody.innerHTML = `<tr><td colspan="3">No technologies detected</td></tr>`;
	}
}

export function initializeMainPage() {
	// Query the active tab once.
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, (tabs) => {
		console.log("Active tabs:", tabs);
		const activeTab = tabs[0];
		if (!activeTab?.id) {
			console.error("No active tab found");
			populateTable("techStackBody", [{
				name: "Error",
				version: "No active tab found",
				cve: null
			}]);
			return;
		}

		// Send one message that returns both tech stack and CDN/WAF detections.
		console.log("Sending detectTechnologies message to tab:", activeTab.id);
		chrome.tabs.sendMessage(activeTab.id, {
			action: "detectTechnologies"
		}, (response) => {
			console.log("Raw response:", response);

			if (chrome.runtime.lastError) {
				console.error("Chrome runtime error:", chrome.runtime.lastError);
				populateTable("techStackBody", [{
					name: "Error",
					version: "Failed to detect technologies",
					cve: null
				}]);
				return;
			}

			if (!response || (!response.technologies && !response.cdnWafs)) {
				console.error("Invalid response format:", response);
				populateTable("techStackBody", [{
					name: "Error",
					version: "No technologies detected",
					cve: null
				}]);
				return;
			}

			const {
				technologies,
				cdnWafs
			} = response;

			// Populate the Tech Stack table.
			if (technologies.length === 0) {
				populateTable("techStackBody", [{
					name: "No technologies detected",
					version: "N/A",
					cve: null
				}]);
			} else {
				populateTable("techStackBody", technologies, row => `
          <tr>
            <td>${row.name || "Unknown"}</td>
            <td>${row.version || "N/A"}</td>
            <td>
              <a href="#" class="view-link" data-tech="${row.name}" data-version="${row.version || ""}">View</a>
            </td>
          </tr>
        `);
			}

			// Populate the CDN/WAF table.
			if (cdnWafs.length === 0) {
				populateTable("wafCdnBody", [{
					name: "WAF/CDN",
					status: "Not Detected"
				}], row => `
          <tr>
            <td>${row.name}</td>
            <td class="status-cell">
              <span class="status-indicator status-false">
                ✗ ${row.status}
              </span>
            </td>
          </tr>
        `);
			} else {
				populateTable("wafCdnBody", cdnWafs, row => `
          <tr>
            <td>${row.name}</td>
            <td class="status-cell">
              <span class="status-indicator status-true">
                ✓ Detected
              </span>
            </td>
          </tr>
        `);
			}
		});
	});

	// Storage/Authentication Analysis remains unchanged.
	const storageData = [{
			type: "Cookie Storage",
			action: "Analyze"
		},
		{
			type: "Local Storage",
			action: "Analyze"
		},
		{
			type: "Session Storage",
			action: "Analyze"
		}
	];

	populateTable("storageBody", storageData, row => `
    <tr>
      <td>${row.type}</td>
      <td>
        <a href="#" class="view-link" data-type="${row.type.toLowerCase()}">${row.action}</a>
      </td>
    </tr>
  `);

	// Event listener for view links (CVE and Storage).
	document.addEventListener("click", (event) => {
		if (event.target.classList.contains("view-link")) {
			event.preventDefault();
			const tech = event.target.dataset.tech;
			const version = event.target.dataset.version;
			const type = event.target.dataset.type;

			if (tech) {
				showCVEDetails(tech, version);
			} else if (type) {
				showStorageDetails(type);
			}
		}
	});
}

// Helper function to build the NVD CVE search URL using technology name and version.
function buildCveSearchUrl(techName, version) {
	if (!version || version === "Version unknown" || version === "N/A" ||
		version === "WAF" || version === "CDN") {
		const query = encodeURIComponent(techName.toLowerCase().replace(/\.js$/, ""));
		return `https://nvd.nist.gov/vuln/search/results?form_type=Basic&results_type=overview&query=${query}&search_type=all`;
	}
	const query = encodeURIComponent(`${techName.toLowerCase().replace(/\.js$/, "")} ${version}`);
	return `https://nvd.nist.gov/vuln/search/results?form_type=Basic&results_type=overview&query=${query}&search_type=all`;
}

// Opens the CVE details page in a new window/tab.
function showCVEDetails(techName, version) {
	const url = buildCveSearchUrl(techName, version);
	window.open(url, "_blank");
}

// Displays storage details in a mini modal window.
function showStorageDetails(type) {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, (tabs) => {
		const activeTab = tabs[0];
		if (!activeTab?.id) return;
		const normalizedType = type.toLowerCase();
		if (normalizedType === "cookie storage") {
			chrome.cookies.getAll({
				url: activeTab.url
			}, (cookies) => {
				const data = cookies.map(cookie => ({
					key: cookie.name,
					value: cookie.value,
					type: "Cookie",
					httpOnly: cookie.httpOnly,
					secure: cookie.secure
				}));
				showCookieModal(data, normalizedType);
			});
		} else {
			chrome.scripting.executeScript({
				target: {
					tabId: activeTab.id
				},
				function: (storageType) => {
					let data = [];
					try {
						switch (storageType) {
							case "local storage":
								for (let i = 0; i < localStorage.length; i++) {
									const key = localStorage.key(i);
									data.push({
										key: key,
										value: localStorage.getItem(key),
										type: "Local Storage"
									});
								}
								break;
							case "session storage":
								for (let i = 0; i < sessionStorage.length; i++) {
									const key = sessionStorage.key(i);
									data.push({
										key: key,
										value: sessionStorage.getItem(key),
										type: "Session Storage"
									});
								}
								break;
						}
					} catch (e) {
						console.error("Storage access error:", e);
					}
					return data;
				},
				args: [normalizedType]
			}).then(([{
				result: data
			}]) => {
				showCookieModal(data, normalizedType);
			}).catch(error => {
				console.error("Script execution error:", error);
				showErrorModal(normalizedType, error);
			});
		}
	});
}

function showCookieModal(data, type) {
	const modalOverlay = document.createElement("div");
	modalOverlay.className = "cookie-modal-overlay";

	const modal = document.createElement("div");
	modal.className = "cookie-modal";
	const isCookieStorage = type.toLowerCase() === "cookie storage";
	let html = `
        <h2>${type.charAt(0).toUpperCase() + type.slice(1)} Details</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th>Type</th>
                ${isCookieStorage ? `
                <th>HTTPOnly</th>
                <th>Secure</th>
                ` : ""}
              </tr>
            </thead>
            <tbody>
      `;

	if (!data || data.length === 0) {
		html += `<tr><td colspan="${isCookieStorage ? "5" : "3"}">No data found</td></tr>`;
	} else {
		data.forEach(item => {
			html += `
        <tr>
          <td>${item.key}</td>
          <td class="cookie-value">${item.value}</td>
          <td>${item.type}</td>
          ${isCookieStorage ? `
          <td class="cookie-security">
            <span class="cookie-security-icon ${item.httpOnly ? "cookie-security-true" : "cookie-security-false"}">
              ${item.httpOnly ? "✓" : "✗"}
            </span>
          </td>
          <td class="cookie-security">
            <span class="cookie-security-icon ${item.secure ? "cookie-security-true" : "cookie-security-false"}">
              ${item.secure ? "✓" : "✗"}
            </span>
          </td>
          ` : ""}
        </tr>
      `;
		});
	}

	html += `
      </tbody>
    </table>
  </div>
  <button class="close-cookie-modal">Close</button>
  `;

	modal.innerHTML = html;
	modalOverlay.appendChild(modal);
	document.body.appendChild(modalOverlay);

	const closeModal = () => modalOverlay.remove();
	modalOverlay.querySelector(".close-cookie-modal").addEventListener("click", closeModal);
	modalOverlay.addEventListener("click", (e) => {
		if (e.target === modalOverlay) closeModal();
	});
}

function showErrorModal(type, error) {
	const modalOverlay = document.createElement("div");
	modalOverlay.className = "cookie-modal-overlay";
	const modal = document.createElement("div");
	modal.className = "cookie-modal";
	modal.innerHTML = `
    <h2>Error</h2>
    <p>Failed to access ${type}: ${error.message}</p>
    <button class="close-cookie-modal">Close</button>
  `;
	modalOverlay.appendChild(modal);
	document.body.appendChild(modalOverlay);
	modalOverlay.querySelector(".close-cookie-modal").addEventListener("click", () => modalOverlay.remove());
}