class TechnologyDetector {
	constructor() {
		this.technologies = []; // Tech stack detections (e.g. Bootstrap, React, Apache, Nginx, etc.)
		this.cdnWafs = []; // CDN/WAF detections
		this.techPatterns = {
			'React': {
				detect: () => window._REACT_VERSION || document.querySelector('[data-reactroot], [data-reactid]') !== null,
				getVersion: () => window._REACT_VERSION || this.getVersionFromPackage('react')
			},
			'Vue.js': {
				detect: () => window.Vue || document.querySelector('[data-v-]') !== null,
				getVersion: () => window.Vue?.version || this.getVersionFromPackage('vue')
			},
			'Angular': {
				detect: () => window.angular || document.querySelector('[ng-version]') !== null,
				getVersion: () => {
					const ngVersion = document.querySelector('[ng-version]');
					if (ngVersion) return ngVersion.getAttribute('ng-version');
					if (window.angular && window.angular.version && window.angular.version.full) {
						return window.angular.version.full;
					}
					return this.getVersionFromPackage('angular');
				}
			},
			'jQuery': {
				detect: () => window.jQuery || typeof $ !== 'undefined',
				getVersion: () => window.jQuery?.fn?.jquery || this.getVersionFromPackage('jquery')
			},
			'WordPress': {
				detect: () => !!document.querySelector('meta[name="generator"][content*="WordPress"]'),
				getVersion: () => {
					const generator = document.querySelector('meta[name="generator"]');
					if (generator) {
						const content = generator.getAttribute('content');
						const match = content.match(/WordPress\s*(\d+\.\d+)/i);
						return match ? match[1] : "Version detected but unknown";
					}
					return "Version unknown";
				}
			},
			'MySQL': {
				detect: () => {
					// Look for common MySQL-related comments or meta tags
					return document.querySelector('meta[name="generator"][content*="MySQL"]') !== null ||
						document.documentElement.innerHTML.includes('mysql_') ||
						document.documentElement.innerHTML.includes('mysqli_');
				},
				getVersion: () => {
					const mysqlComment = Array.from(document.getElementsByTagName('*'))
						.find(el => el.nodeType === 8 && el.nodeValue.includes('MySQL'));
					if (mysqlComment) {
						const match = mysqlComment.nodeValue.match(/MySQL v?(\d+\.\d+\.\d+)/i);
						return match ? match[1] : 'Version unknown';
					}
					return 'Version unknown';
				}
			},
			'PHP': {
				detect: () => {
					// Look for PHP-specific headers and patterns
					return document.querySelector('meta[name="generator"][content*="PHP"]') !== null ||
						document.documentElement.innerHTML.includes('PHP/') ||
						document.cookie.includes('PHPSESSID');
				},
				getVersion: () => {
					const phpGenerator = document.querySelector('meta[name="generator"][content*="PHP"]');
					if (phpGenerator) {
						const match = phpGenerator.getAttribute('content').match(/PHP v?(\d+\.\d+\.\d+)/i);
						return match ? match[1] : 'Version unknown';
					}
					// Check for X-Powered-By header in your detectFromQuickMeta method
					const poweredBy = document.querySelector('meta[name="x-powered-by"]');
					if (poweredBy && poweredBy.content.includes('PHP')) {
						const match = poweredBy.content.match(/PHP\/(\d+\.\d+\.\d+)/i);
						return match ? match[1] : 'Version unknown';
					}
					return 'Version unknown';
				}
			}
		};
	}

	async detectTechStack() {
		await Promise.all([
			this.detectFromPatterns(),
			this.detectFromDOM(),
			this.detectFromQuickScripts(),
			this.detectFromQuickMeta()
		]);
	}

	async detectFromPatterns() {
		console.log('Detecting tech stack from patterns...');
		for (const [techName, tech] of Object.entries(this.techPatterns)) {
			try {
				if (tech.detect()) {
					console.log(`Detected ${techName}`);
					const version = await tech.getVersion();
					this.addTechnology(techName, version);
				}
			} catch (error) {
				console.error(`Error detecting ${techName}:`, error);
			}
		}
	}

	detectFromDOM() {
		console.log('Detecting tech stack from DOM...');
		const frameworks = {
			'Bootstrap': '[class*="bootstrap"]',
			'Tailwind': '[class*="tw-"]',
			'Material-UI': '[class*="MuiBox"], [class*="MuiButton"]',
			'Foundation': '[class*="foundation"]'
		};

		for (const [framework, selector] of Object.entries(frameworks)) {
			try {
				if (document.querySelector(selector)) {
					console.log(`Detected ${framework} from DOM`);
					this.addTechnology(framework);
				}
			} catch (error) {
				console.error(`Error detecting ${framework}:`, error);
			}
		}
	}

	detectFromQuickScripts() {
		console.log('Detecting tech stack from scripts...');
		const scripts = document.getElementsByTagName('script');
		const scriptPatterns = {
			'Google Analytics': 'google-analytics.com',
			'Google Tag Manager': 'googletagmanager.com',
			'React': 'react.',
			'Vue.js': 'vue.',
			'Angular': 'angular.',
			'jQuery': 'jquery.'
		};

		for (const script of scripts) {
			if (!script.src) continue;
			const src = script.src.toLowerCase();
			for (const [tech, pattern] of Object.entries(scriptPatterns)) {
				try {
					if (src.includes(pattern)) {
						console.log(`Detected ${tech} from script src`);
						this.addTechnology(tech);
					}
				} catch (error) {
					console.error(`Error detecting ${tech} from scripts:`, error);
				}
			}
		}
	}

	detectFromQuickMeta() {
		console.log('Detecting tech stack from meta tags...');
		const generator = document.querySelector('meta[name="generator"]');
		if (generator) {
			const content = generator.getAttribute('content');
			if (content) {
				try {
					if (content.includes('WordPress')) {
						console.log('Detected WordPress from meta');
						this.addTechnology('WordPress');
					}
					if (content.includes('Drupal')) {
						console.log('Detected Drupal from meta');
						this.addTechnology('Drupal');
					}
				} catch (error) {
					console.error('Error detecting from meta tags:', error);
				}
			}
		}
	}

	// --- CDN/WAF DETECTION METHODS ---
	async detectCDNWAF() {
		await Promise.all([
			this.detectCDN(),
			this.detectWAF()
		]);
	}

	async detectCDN() {
		const cdnHeaders = {
			'server': {
				'cloudflare': 'Cloudflare',
				'cloudfront': 'CloudFront',
				'fastly': 'Fastly',
				'akamai': 'Akamai'
			},
			'x-served-by': {
				'fastly': 'Fastly',
				'varnish': 'Varnish'
			},
			'x-cache': {
				'cloudfront': 'CloudFront',
				'varnish': 'Varnish'
			}
		};

		try {
			const response = await fetch(window.location.href, {
				method: 'HEAD'
			});
			for (const [headerName, patterns] of Object.entries(cdnHeaders)) {
				const headerValue = response.headers.get(headerName);
				if (headerValue) {
					for (const [pattern, cdnName] of Object.entries(patterns)) {
						if (headerValue.toLowerCase().includes(pattern)) {
							console.log(`Detected CDN: ${cdnName} via header ${headerName}`);
							this.addCDNWAF(cdnName, 'CDN');
						}
					}
				}
			}
		} catch (error) {
			console.error('Error detecting CDN:', error);
		}
	}

	async detectWAF() {
		// A simplified mapping of header keys to WAF names.
		const wafSignaturesSimple = {
			"cf-ray": "Cloudflare",
			"cf-cache-status": "Cloudflare",
			"__cfduid": "Cloudflare",
			"x-amz-cf-id": "CloudFront",
			"x-amz-cf-pop": "CloudFront",
			"x-akamai-request-id": "Akamai",
			"x-iinfo": "Imperva",
			"x-cdn": "Imperva",
			"x-sucuri-id": "Sucuri",
			"x-f5-request-id": "F5",
			"x-served-by": "Fastly",
			"x-fortiwafsid": "FortiWeb",
			"x-forwarded-for-fwid": "FortiWeb",
			"x-forwarded-server-fwid": "FortiWeb",
			"x-fortiwebid": "FortiWeb",
			"x-forticdn": "FortiWeb",
			"x-fortiweb-site": "FortiWeb",
			"fortiwebcdn": "FortiWeb"
		};

		try {
			const response = await fetch(window.location.href, {
				method: 'HEAD'
			});
			for (const [headerKey, wafName] of Object.entries(wafSignaturesSimple)) {
				const headerValue = response.headers.get(headerKey);
				if (headerValue) {
					// Special check for 'server' header to catch FortiWeb if present.
					if (headerKey === 'server') {
						if (headerValue.toLowerCase().includes('fortiweb')) {
							console.log(`Detected FortiWeb via server header`);
							this.addCDNWAF('FortiWeb', 'WAF');
							continue;
						}
					}
					console.log(`Detected WAF: ${wafName} via header ${headerKey}`);
					this.addCDNWAF(wafName, 'WAF');
				}
			}
		} catch (error) {
			console.error('Error detecting WAF:', error);
		}
	}

	// --- HELPER METHODS ---
	getVersionFromPackage(packageName) {
		const scriptTags = document.getElementsByTagName('script');
		const versionPatterns = [
			new RegExp(`${packageName}[@-](\\d+(?:\\.\\d+){1,3})`, 'i'),
			new RegExp(`${packageName}/?(\\d+(?:\\.\\d+){1,3})`, 'i'),
			new RegExp(`${packageName}\\.(\\d+(?:\\.\\d+){1,3})\\.js`, 'i')
		];

		for (const script of scriptTags) {
			const src = script.src;
			if (src && src.toLowerCase().includes(packageName.toLowerCase())) {
				for (const pattern of versionPatterns) {
					const match = src.match(pattern);
					if (match && match[1]) {
						console.log(`Found version for ${packageName}: ${match[1]} from ${src}`);
						return match[1];
					}
				}
			}
		}

		const globalVersions = {
			'react': () => window.React?.version,
			'vue': () => window.Vue?.version,
			'angular': () => window.angular?.version?.full,
			'jquery': () => window.jQuery?.fn?.jquery
		};

		if (globalVersions[packageName.toLowerCase()]) {
			const version = globalVersions[packageName.toLowerCase()]();
			if (version) return version;
		}
		return 'Version unknown';
	}

	addTechnology(name, version = 'Version unknown') {
		if (!this.technologies.some(tech => tech.name === name)) {
			console.log(`Adding technology: ${name} (${version})`);
			this.technologies.push({
				name,
				version,
				cve: null
			});
		}
	}

	addCDNWAF(name, version = 'Detected') {
		if (!this.cdnWafs.some(item => item.name === name)) {
			console.log(`Adding CDN/WAF: ${name} (${version})`);
			this.cdnWafs.push({
				name,
				version
			});
		}
	}

	// Overall detection that returns both tech stack and CDN/WAF results.
	async detect() {
		try {
			console.log('Starting tech stack detection...');
			const timeout = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Detection timed out')), 3000);
			});
			const techPromise = this.detectTechStack();
			await Promise.race([timeout, techPromise]);
			console.log('Tech stack detection complete. Found:', this.technologies);

			console.log('Starting CDN/WAF detection...');
			const cdnWafPromise = this.detectCDNWAF();
			await Promise.race([timeout, cdnWafPromise]);
			console.log('CDN/WAF detection complete. Found:', this.cdnWafs);

			return {
				technologies: this.technologies,
				cdnWafs: this.cdnWafs
			};
		} catch (error) {
			console.log('Detection stopped:', error.message);
			return {
				technologies: this.technologies,
				cdnWafs: this.cdnWafs
			};
		}
	}
}

const detector = new TechnologyDetector();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log('Message received in techStack.js:', request);
	if (request.action === "detectTechnologies") {
		detector.detect().then(result => {
			console.log('Detection result:', result);
			// Send back both tech stack and CDN/WAF detections.
			sendResponse(result);
		}).catch(error => {
			console.error('Detection error:', error);
			sendResponse({
				technologies: [],
				cdnWafs: [],
				error: error.message
			});
		});
		return true;
	} else if (request.action === "detectWAFCDN") {
		// This branch can be kept for legacy or specific use if needed.
		Promise.all([
			// Get headers
			fetch(window.location.href, {
				credentials: 'include',
				mode: 'no-cors'
			})
			.then(async response => {
				const headers = [];
				response.headers.forEach((value, name) => {
					headers.push({
						name: name.toLowerCase(),
						value
					});
					console.log(`Header found: ${name} = ${value}`);
				});
				return headers;
			}),
			// Get cookies
			new Promise(resolve => {
				const cookies = document.cookie.split(';').map(cookie => {
					const [name, value] = cookie.split('=').map(s => s.trim());
					return {
						name,
						value
					};
				});
				console.log("Cookies found:", cookies);
				resolve(cookies);
			}),
			// Get body text
			fetch(window.location.href, {
				credentials: 'include',
				mode: 'no-cors'
			})
			.then(response => response.text())
		]).then(([headers, cookies, body]) => {
			console.log("Sending legacy response with:", {
				headerCount: headers.length,
				cookieCount: cookies.length,
				bodyLength: body.length
			});
			sendResponse({
				headers,
				cookies,
				body
			});
		}).catch(error => {
			console.error("Detection error:", error);
			sendResponse({
				headers: [],
				cookies: [],
				body: ""
			});
		});
		return true;
	}
});

// Run initial detection for debugging.
detector.detect().then(result => {
	console.log("Initial detection complete:", result);
});