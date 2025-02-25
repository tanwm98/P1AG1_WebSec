class EndpointParser {
	constructor() {
		this.urlMap = new Map(); // Use Map instead of Set for better duplicate handling
		this.processedEndpoints = [];
		this.currentDomain = window.location.hostname;
		this.inProgress = false;
		this.setupNetworkMonitors();
	}

	setupNetworkMonitors() {
		const originalFetch = window.fetch;
		window.fetch = (...args) => {
			const url = typeof args[0] === 'string' ? args[0] : args[0].url;
			this.addEndpoint(url, 'Network Request', 'fetch');
			return originalFetch.apply(window, args);
		};

		const originalOpen = XMLHttpRequest.prototype.open;
		XMLHttpRequest.prototype.open = function(...args) {
			this.addEndpoint(args[1], 'Network Request', 'xhr');
			return originalOpen.apply(this, args);
		};
	}

	async parseAll() {
		if (this.inProgress) return;
		this.inProgress = true;

		try {
			await this.parseDOMElements();
			await this.parseJavaScriptFiles();
			this.processEndpoints();
			await this.storeResults();
			return this.processedEndpoints;
		} catch (error) {
			console.error('Parsing error:', error);
			throw error;
		} finally {
			this.inProgress = false;
		}
	}

	async parseDOMElements() {
		const elementSelectors = {
			'link': 'a[href]',
			'script': 'script[src]',
			'image': 'img[src]',
			'form': 'form[action]',
			'iframe': 'iframe[src]',
			'media': 'source[src]',
			'stylesheet': 'link[href]'
		};

		for (const [type, selector] of Object.entries(elementSelectors)) {
			document.querySelectorAll(selector).forEach(element => {
				const url = element.href || element.src || element.action;
				if (url) {
					this.addEndpoint(url, 'DOM Element', type);
				}
			});
		}

		// Parse inline scripts
		document.querySelectorAll('script:not([src])').forEach(script => {
			if (script.textContent.trim()) { // Only parse non-empty scripts
				this.extractURLsFromText(script.textContent, 'Inline Script');
			}
		});
	}

	async parseJavaScriptFiles() {
		const jsFiles = Array.from(new Set( // Remove duplicate JS files
			Array.from(document.querySelectorAll('script[src]'))
			.map(script => script.src)
			.filter(src => src.endsWith('.js'))
		));

		const batchSize = 5;
		for (let i = 0; i < jsFiles.length; i += batchSize) {
			const batch = jsFiles.slice(i, i + batchSize);
			await Promise.all(batch.map(file => this.parseJavaScriptFile(file)));
		}
	}

	async parseJavaScriptFile(url) {
		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			const text = await response.text();
			this.extractURLsFromText(text, 'JavaScript File', url);
		} catch (error) {
			console.error(`Error parsing JS file ${url}:`, error);
		}
	}

	extractURLsFromText(text, source, sourceUrl = '') {
		// Improved regex pattern to avoid common false positives
		const absRegex = /(https?:\/\/[^\s'"){}(]+)/g;
		const relRegex = /["']((\/|(\w+\/))[\w./\-_?=&]*)["']/g;


		const absMatches = (text.match(absRegex) || [])
			.map(url => url.replace(/["']/g, '')) // Remove quotes
			.filter(url => {
				// Filter out obvious code patterns
				const isCodePattern = url.includes('=>') ||
					url.includes('function(') ||
					url.includes('regex') ||
					/^\/\^/.test(url) || // Starts with /^
					/\$\/$/.test(url) || // Ends with $/
					/^\(\?:/.test(url); // Starts with (?:
				return !isCodePattern;
			});

		const relMatches = Array.from(text.matchAll(relRegex), match => match[1])
			.filter(url => {
				// Additional validation for relative URLs
				return !url.includes('=>') &&
					!url.includes('function') &&
					!/^\/\^/.test(url) &&
					!/\$\/$/.test(url);
			});
		[...absMatches, ...relMatches].forEach(url => {
			this.addEndpoint(url, source, sourceUrl);
		});
	}

	addEndpoint(url, source, sourceDetail) {
		try {
			// Properly handle relative URLs
			let absoluteUrl;
			try {
				absoluteUrl = new URL(url, window.location.origin).href;
			} catch {
				// If URL constructor fails, try decoding first
				absoluteUrl = new URL(decodeURIComponent(url), window.location.origin).href;
			}

			// Normalize the URL while preserving encoded characters
			const normalizedUrl = this.normalizeUrl(absoluteUrl);

			if (this.urlMap.has(normalizedUrl)) {
				const existing = this.urlMap.get(normalizedUrl);
				// Merge sources if this is a new source
				if (!existing.sources.some(s => s.source === source && s.detail === sourceDetail)) {
					existing.sources.push({
						source,
						detail: sourceDetail
					});
				}
			} else {
				// Add new URL entry
				this.urlMap.set(normalizedUrl, {
					url: normalizedUrl,
					originalUrl: url, // Keep the original URL for reference
					sources: [{
						source,
						detail: sourceDetail
					}],
					timestamp: new Date().toISOString()
				});
			}
		} catch (e) {
			console.debug(`Skipping invalid URL: ${url}, Error: ${e.message}`);
		}
	}

	normalizeUrl(url) {
		try {
			const urlObj = new URL(url);

			// Preserve encoded characters in pathname
			const pathname = urlObj.pathname;

			// Sort query parameters while preserving encoding
			const searchParams = new URLSearchParams([...urlObj.searchParams.entries()].sort());
			const search = searchParams.toString() ? `?${searchParams.toString()}` : '';

			// Remove hash
			const baseUrl = `${urlObj.protocol}//${urlObj.host}${pathname}${search}`;

			return baseUrl;
		} catch (e) {
			return url;
		}
	}

	processEndpoints() {
		this.processedEndpoints = Array.from(this.urlMap.values())
			.map(endpoint => ({
				...endpoint,
				type: this.classifyEndpoint(endpoint.url),
				scope: this.determineScope(endpoint.url)
			}))
			.sort((a, b) => a.url.localeCompare(b.url));
	}

	classifyEndpoint(url) {
		try {
			const urlObj = new URL(url);
			const path = urlObj.pathname.toLowerCase();
			const extension = path.split('.').pop();

			// More specific matches first
			if (path.match(/\/(api|graphql|rest)\//)) return 'API Endpoint';
			if (path.match(/\/v\d+\//)) return 'Versioned API';
			if (path.match(/\.(json|xml)$/)) return 'Data Resource';
			if (path.match(/\.(js)$/)) return 'JavaScript';
			if (path.match(/\.(css)$/)) return 'Stylesheet';
			if (path.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) return 'Image';
			if (path.match(/\.(pdf|doc|docx|xls|xlsx)$/)) return 'Document';
			if (path.match(/\.(mp4|webm|ogg|mp3|wav)$/)) return 'Media';
			if (path.match(/\/[a-z]+\/\d+$/i)) return 'REST Resource';

			return 'Other';
		} catch {
			return 'Invalid URL';
		}
	}

	determineScope(url) {
		try {
			const urlObj = new URL(url);
			if (urlObj.hostname === this.currentDomain) return 'Internal';
			if (urlObj.hostname.endsWith(`.${this.currentDomain}`)) return 'Subdomain';
			return 'External';
		} catch {
			return 'Invalid';
		}
	}

	async storeResults() {
		return new Promise((resolve) => {
			chrome.storage.local.set({
				endpoints: this.processedEndpoints,
				lastUpdate: new Date().toISOString(),
				domain: this.currentDomain
			}, resolve);
		});
	}

	exportToJSON() {
		const exportData = {
			domain: this.currentDomain,
			timestamp: new Date().toISOString(),
			endpoints: this.processedEndpoints
		};

		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = `endpoints-${this.currentDomain}-${new Date().toISOString()}.json`;
		a.click();

		URL.revokeObjectURL(url);
	}
}

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "parseEndpoints") {
		const parser = new EndpointParser();
		parser.parseAll()
			.then(() => {
				sendResponse({
					success: true,
					count: parser.processedEndpoints.length
				});
			})
			.catch(error => {
				sendResponse({
					success: false,
					error: error.message
				});
			});
		return true;
	}
});