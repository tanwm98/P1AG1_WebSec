class TechnologyDetector {
    constructor() {
        this.technologies = [];
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
                // First try to read from the DOM
                const ngVersion = document.querySelector('[ng-version]');
                if (ngVersion) {
                  return ngVersion.getAttribute('ng-version');
                }
                // Then try the global variable (AngularJS)
                if (window.angular && window.angular.version && window.angular.version.full) {
                  return window.angular.version.full;
                }
                // Fallback to checking the script URL
                return this.getVersionFromPackage('angular');
              }
            },
            'jQuery': {
                detect: () => window.jQuery || typeof $ !== 'undefined',
                getVersion: () => window.jQuery?.fn?.jquery || this.getVersionFromPackage('jquery')
            }
        };
    }
    // Add this method to TechnologyDetector class
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
            const response = await fetch(window.location.href, { method: 'HEAD' });

            for (const [headerName, patterns] of Object.entries(cdnHeaders)) {
                const headerValue = response.headers.get(headerName);
                if (headerValue) {
                    for (const [pattern, cdnName] of Object.entries(patterns)) {
                        if (headerValue.toLowerCase().includes(pattern)) {
                            this.addTechnology(cdnName, 'CDN');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error detecting CDN:', error);
        }
    }

    async detectWAF() {
      const wafSignatures = {
        'x-firewall-block': 'Generic WAF',
        'x-cdn-geo': 'Generic WAF',
        'x-xss-protection': 'XSS Protection',
        'x-content-security-policy': 'CSP WAF',
        'x-fw-block': 'Generic WAF',
        'x-sucuri-block': 'Sucuri WAF',
        'x-sucuri-id': 'Sucuri WAF'
      };

      try {
        const response = await fetch(window.location.href, { method: 'HEAD' });

        for (const [header, wafName] of Object.entries(wafSignatures)) {
          if (response.headers.get(header)) {
            this.addTechnology(wafName, 'WAF');
          }
        }
        // Additional check for FortiWeb in the Server header
        const serverHeader = response.headers.get('server');
        if (serverHeader && serverHeader.toLowerCase().includes('fortiweb')) {
          this.addTechnology('FortiWeb', 'WAF');
        }
      } catch (error) {
        console.error('Error detecting WAF:', error);
      }
    }

    async detect() {
        try {
            console.log('Starting detection...');

            const timeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Detection timed out')), 2000);
            });

            const detectionPromise = Promise.all([
                this.detectFromPatterns(),
                this.detectFromDOM(),
                this.detectFromQuickScripts(),
                this.detectFromQuickMeta(),
                this.detectSecurityHeaders(),  // New
                this.detectCDN(),             // New
                this.detectWAF()              // New
            ]);

            await Promise.race([timeout, detectionPromise]);

            console.log('Detection complete. Found:', this.technologies);
            return this.technologies;
        } catch (error) {
            console.log('Detection stopped:', error.message);
            return this.technologies;
        }
    }

    async detectFromPatterns() {
        console.log('Detecting from patterns...');
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
        console.log('Detecting from DOM...');
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
        console.log('Detecting from scripts...');
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
        console.log('Detecting from meta tags...');
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

    getVersionFromPackage(packageName) {
        const scriptTags = document.getElementsByTagName('script');
        const versionPatterns = [
            new RegExp(`${packageName}[@-](\\d+(?:\\.\\d+){1,3})`, 'i'),  // matches @1.2.3 or -1.2.3
            new RegExp(`${packageName}/?(\\d+(?:\\.\\d+){1,3})`, 'i'),    // matches /1.2.3
            new RegExp(`${packageName}\\.(\\d+(?:\\.\\d+){1,3})\\.js`, 'i') // matches .1.2.3.js
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

        // Try to detect from global variables
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
}


const detector = new TechnologyDetector();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in techStack.js:', request);
  if (request.action === "detectTechnologies") {
    detector.detect().then(technologies => {
      console.log('Technologies detected:', technologies);
      sendResponse({ technologies });
    })
    .catch(error => {
      console.error('Detection error:', error);
      sendResponse({ technologies: [], error: error.message });
    });
    return true;
  } else if (request.action === "detectWAFCDN") {
    const headers = {};
        performance.getEntriesByType("resource").forEach(entry => {
          if (entry.name === window.location.href) {
            entry.serverTiming?.forEach(timing => {
              headers[timing.name.toLowerCase()] = timing.description;
            });
          }
        });

        // Get cookies
        const cookies = document.cookie.split(';').map(cookie => {
          const [name, value] = cookie.split('=').map(s => s.trim());
          return { name, value };
        });

        // Get page body
        const body = document.body.innerHTML;

        const detectedWAFs = detectWAFBySignature(headers, cookies, body);

        sendResponse({
          technologies: detectedWAFs.map(waf => ({
            name: `${waf.name} WAF`,
            version: 'WAF',
            confidence: waf.confidence
          }))
        });
      }
    });


// Run initial detection
detector.detect().then(technologies => {
	console.log('Initial detection complete:', technologies);
});