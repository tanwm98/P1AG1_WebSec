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
                    const ngVersion = document.querySelector('[ng-version]');
                    return ngVersion ? ngVersion.getAttribute('ng-version') : this.getVersionFromPackage('angular');
                }
            },
            'jQuery': {
                detect: () => window.jQuery || typeof $ !== 'undefined',
                getVersion: () => window.jQuery?.fn?.jquery || this.getVersionFromPackage('jquery')
            }
        };
    }

    async detect() {
        try {
            console.log('Starting detection...');

            // Add timeout
            const timeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Detection timed out')), 2000);
            });

            // Run detections in parallel
            const detectionPromise = Promise.all([
                this.detectFromPatterns(),
                this.detectFromDOM(),
                this.detectFromQuickScripts(),
                this.detectFromQuickMeta()
            ]);

            // Race between detection and timeout
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
        for (const script of scriptTags) {
            const src = script.src;
            if (src && src.includes(packageName)) {
                const version = src.match(new RegExp(`${packageName}@(\\d+\\.\\d+\\.\\d+)`));
                if (version) return version[1];
            }
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

// Listen for messages for technology detection
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in techStack.js:', request);
    if (request.action === "detectTechnologies") {
        console.log('Starting technology detection');
        detector.detect().then(technologies => {
            console.log('Technologies detected:', technologies);
            sendResponse({ technologies });
        })
        .catch(error => {
            console.error('Detection error:', error);
            sendResponse({ technologies: detector.technologies, error: error.message });
        });
        return true;
    }
});