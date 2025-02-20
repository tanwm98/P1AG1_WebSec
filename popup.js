// popup.js
const tabs = document.querySelectorAll('.tab-link');
const tabContent = document.getElementById('tab-content');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup DOMContentLoaded fired');
    import('./script/tabs/mainTab.js').then(module => {
        console.log('mainTab.js loaded successfully');
        module.initializeMainPage();
    }).catch(error => {
        console.error('Error loading mainTab.js:', error);
    });
});

// Tab switching event listeners
tabs.forEach(tab => {
    tab.addEventListener('click', async (e) => {
        e.preventDefault();
        const file = tab.getAttribute('data-file');
        console.log('Loading tab:', file);
        
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');
        
        try {
            // Get the full URL for the HTML file
            const tabUrl = chrome.runtime.getURL(file);
            console.log('Tab URL:', tabUrl);
            // Fetch the HTML content
            const response = await fetch(tabUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.text();
           
            // Update the content
            tabContent.innerHTML = data;
            
            // Initialize tab functionality
            if (file === 'tab1.html') {
                try {
                    console.log('Importing tab1.js module...');
                    const tab1Module = await import('./script/tabs/tab1.js');
                    console.log('Import successful, initializing tab1...');
                    await tab1Module.initializeTab1();
                } catch (importError) {
                    console.error('Error importing tab1 module:', importError);
                    throw importError;
                }
            } else if (file === 'tab3.html') {
                try {
                    console.log('Importing tab3.js module...');
                    const tab3Module = await import('./script/tabs/tab3.js');
                    console.log('Import successful, initializing tab3...');
                    if (tab3Module.initializeTab3) {
                        await tab3Module.initializeTab3();
                    } else {
                        console.error('initializeTab3 function not found in module');
                    }
                } catch (importError) {
                    console.error('Error importing tab3 module:', importError);
                    throw importError;
                }
            
            } else if (file === 'tab4.html') {
                try {
                    console.log('Importing tab4.js module...');
                    const tab4Module = await import('./script/tabs/tab4.js');
                    console.log('Import successful, initializing tab4...');
                    if (tab4Module.initializeTab4) {
                        await tab4Module.initializeTab4();
                    } else {
                        console.error('initializeTab4 function not found in module');
                    }
                } catch (importError) {
                    console.error('Error importing tab4 module:', importError);
                    throw importError;
                }
            
            }
             else if (file === 'tab5.html') {
                try {
                    const tab5Module = await import('./script/tabs/tab5.js');
                    await tab5Module.initializeTab5();
                } catch (importError) {
                    console.error('Error importing tab5 module:', importError);
                    throw importError;
                }
            }
        } catch (error) {
            console.error('Error loading tab content:', error);
            tabContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
        }
    });
});

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('view-link')) {
        const row = event.target.closest('tr');
        if (row && row.cells[0] && row.cells[0].innerText.trim() === 'Cookie') {
            event.preventDefault();
            import('./script/tabs/mainTab.js').then(module => {
                const type = event.target.dataset.type;
                if (type) {
                    module.showStorageDetails(type);
                }
            });
        }
    }
});