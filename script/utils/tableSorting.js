export function initializeTableSorting(tableId) {
    console.log('Initializing sorting for table:', tableId);
    const table = document.getElementById(tableId);
    if (!table) {
        console.error(`Table with id ${tableId} not found`);
        return;
    }

    const thead = table.querySelector('thead');
    if (!thead) {
        console.error(`Table ${tableId} has no thead element`);
        return;
    }

    console.log(`Found table ${tableId}, setting up sort handlers`);

    const headers = thead.querySelectorAll('th');
    headers.forEach((header, index) => {
        if (index === 0) {
            const tbody = table.querySelector('tbody');
            if (tbody) {
                table.dataset.originalContent = tbody.innerHTML;
            }
        }

        header.style.cursor = 'pointer';
        const sortIndicator = document.createElement('span');
        sortIndicator.className = 'sort-indicator';
        header.appendChild(sortIndicator);
        header.dataset.sortState = 'null';

        header.addEventListener('click', () => {
            console.log(`Sort clicked on ${tableId}, column ${index}`);
            const tbody = table.querySelector('tbody');
            if (!tbody) return;

            headers.forEach(h => {
                if (h !== header) {
                    h.dataset.sortState = 'null';
                    h.querySelector('.sort-indicator').innerHTML = '';
                }
            });

            const currentState = header.dataset.sortState;
            let newState = currentState === 'null' ? 'asc' : 
                          currentState === 'asc' ? 'desc' : 'null';
            
            header.dataset.sortState = newState;
            const indicator = header.querySelector('.sort-indicator');
            
            if (newState === 'null') {
                indicator.style.display = 'none';
                indicator.innerHTML = '';
            } else {
                indicator.style.display = 'inline-block';
                indicator.innerHTML = newState === 'asc' ? '&#x25B2;' : '&#x25BC;';
            }

            if (newState === 'null') {
                tbody.innerHTML = table.dataset.originalContent;
            } else {
                const rows = Array.from(tbody.querySelectorAll('tr'));
                rows.sort((rowA, rowB) => {
                    const cellA = rowA.cells[index].textContent.trim();
                    const cellB = rowB.cells[index].textContent.trim();
                    
                    if (cellA.match(/high|medium|low/i)) {
                        const severityOrder = { high: 1, medium: 2, low: 3 };
                        const valueA = severityOrder[cellA.toLowerCase()] || 0;
                        const valueB = severityOrder[cellB.toLowerCase()] || 0;
                        return newState === 'asc' ? valueA - valueB : valueB - valueA;
                    }
                    
                    return newState === 'asc' ? 
                           cellA.localeCompare(cellB) : 
                           cellB.localeCompare(cellA);
                });
                
                tbody.innerHTML = '';
                rows.forEach(row => tbody.appendChild(row));
            }
        });
    });
}