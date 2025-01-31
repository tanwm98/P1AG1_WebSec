// Initialize main page data
export function initializeMainPage() {
    const techStackData = [
        { name: 'Google Font API', version: '', cve: true },
        { name: 'MooTools', version: '1.6.0', cve: true },
        { name: 'XenForo', version: '', cve: true },
        { name: 'MySQL', version: '', cve: true }
    ];

    const wafCdnData = [
        { name: 'FortiWeb (Fortinet)', status: 'Detected' },
        { name: 'Cloudfront (Amazon)', status: 'Detected' }
    ];

    const headersData = [
        { name: 'X-XSS-Protection', description: 'X-XSS-Protection header is deprecated' }
    ];

    const storageData = [
        { type: 'Cookie', action: 'View' },
        { type: 'localStorage', action: 'View' },
        { type: 'sessionStorage', action: 'View' }
    ];

    // Populate Tech Stack
    const techStackBody = document.getElementById('techStackBody');
    if (techStackBody) {
        techStackBody.innerHTML = techStackData.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.version}</td>
                <td>${item.cve ? '<a href="#" class="view-link">View</a>' : ''}</td>
            </tr>
        `).join('');
    }

    // Populate WAF/CDN
    const wafCdnBody = document.getElementById('wafCdnBody');
    if (wafCdnBody) {
        wafCdnBody.innerHTML = wafCdnData.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.status}</td>
            </tr>
        `).join('');
    }

    // Populate Headers
    const headersBody = document.getElementById('headersBody');
    if (headersBody) {
        headersBody.innerHTML = headersData.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.description}</td>
            </tr>
        `).join('');
    }

    // Populate Storage
    const storageBody = document.getElementById('storageBody');
    if (storageBody) {
        storageBody.innerHTML = storageData.map(item => `
            <tr>
                <td>${item.type}</td>
                <td><a href="#" class="view-link">${item.action}</a></td>
            </tr>
        `).join('');
    }
}