class CDNWAFDetector {
  constructor() {
    this.cdnWafs = [];     // CDN/WAF detections
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
      const response = await fetch(window.location.href, { method: 'HEAD' });
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
      "cf-request-id": "Cloudflare",
      "x-amz-cf-id": "Cloudflare",
      "x-akamai-request-id": "Akamai",
      "x-iinfo": "Imperva",
      "x-cdn": "Imperva",
      "x-sucuri-id": "Sucuri",
      "x-f5-request-id": "F5",
      "x-served-by": "Fastly"
    };

    try {
      const response = await fetch(window.location.href, { method: 'HEAD' });
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

  addCDNWAF(name, version = 'Detected') {
    if (!this.cdnWafs.some(item => item.name === name)) {
      console.log(`Adding CDN/WAF: ${name} (${version})`);
      this.cdnWafs.push({ name, version });
    }
  }

  // Overall detection that returns CDN/WAF results.
  async detect() {
    try {
      console.log('Starting CDN/WAF detection...');
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Detection timed out')), 3000);
      });

      const cdnWafPromise = this.detectCDNWAF();
      await Promise.race([timeout, cdnWafPromise]);
      console.log('CDN/WAF detection complete. Found:', this.cdnWafs);

      return { cdnWafs: this.cdnWafs };
    } catch (error) {
      console.log('Detection stopped:', error.message);
      return { cdnWafs: this.cdnWafs };
    }
  }
}

const detector = new CDNWAFDetector();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in detector.js:', request);
  if (request.action === "detectWAFCDN") {
    Promise.all([
      // Get headers
      fetch(window.location.href, { credentials: 'include', mode: 'no-cors' })
        .then(async response => {
          const headers = [];
          response.headers.forEach((value, name) => {
            headers.push({ name: name.toLowerCase(), value });
            console.log(`Header found: ${name} = ${value}`);
          });
          return headers;
        }),
      // Get cookies
      new Promise(resolve => {
        const cookies = document.cookie.split(';').map(cookie => {
          const [name, value] = cookie.split('=').map(s => s.trim());
          return { name, value };
        });
        console.log("Cookies found:", cookies);
        resolve(cookies);
      }),
      // Get body text
      fetch(window.location.href, { credentials: 'include', mode: 'no-cors' })
        .then(response => response.text())
    ]).then(([headers, cookies, body]) => {
      console.log("Sending response with:", {
        headerCount: headers.length,
        cookieCount: cookies.length,
        bodyLength: body.length
      });
      sendResponse({ headers, cookies, body });
    }).catch(error => {
      console.error("Detection error:", error);
      sendResponse({ headers: [], cookies: [], body: "" });
    });
    return true;
  }
});

// Run initial detection for debugging.
detector.detect().then(result => {
  console.log("Initial detection complete:", result);
});