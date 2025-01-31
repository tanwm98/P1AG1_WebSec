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

    populateTable('techStackBody', techStackData, row => `
        <tr>
            <td>${row.name}</td>
            <td>${row.version}</td>
            <td>${row.cve ? '<a href="#" class="view-link">View</a>' : ''}</td>
        </tr>
    `);

    populateTable('wafCdnBody', wafCdnData, row => `
        <tr>
            <td>${row.name}</td>
            <td>${row.status}</td>
        </tr>
    `);

    populateTable('headersBody', headersData, row => `
        <tr>
            <td>${row.name}</td>
            <td>${row.description}</td>
        </tr>
    `);

    populateTable('storageBody', storageData, row => `
        <tr>
            <td>${row.type}</td>
            <td><a href="#" class="view-link">${row.action}</a></td>
        </tr>
    `);
}

function populateTable(tableId, data, rowTemplate) {
    const tableBody = document.getElementById(tableId);
    if (tableBody) {
        tableBody.innerHTML = data.map(rowTemplate).join('');
    }
}