// popup.js

const tabs = document.querySelectorAll('.tab-link');
const tabContent = document.getElementById('tab-content');

// On DOMContentLoaded, trigger endpoint parsing
document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup DOMContentLoaded fired');
    // Initialize the tech stack detection
    import('./script/tabs/mainTab.js').then(module => {
        console.log('mainTab.js loaded successfully');
        module.initializeMainPage();
    }).catch(error => {
        console.error('Error loading mainTab.js:', error);
    });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab && activeTab.id !== undefined && activeTab.url?.startsWith('http')) {
      chrome.tabs.sendMessage(activeTab.id, { action: "parseEndpoints" });
    }
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
      const tabUrl = chrome.runtime.getURL(file);
      console.log('Tab URL:', tabUrl);
      const response = await fetch(tabUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.text();
      tabContent.innerHTML = data;
      if (file === 'tab1.html') {
        console.log('Importing tab1.js module...');
        const tab1Module = await import('./script/tabs/tab1.js');
        console.log('Import successful, initializing tab1...');
        await tab1Module.initializeTab1();
      } else if (file === 'tab5.html') {
        const tab5Module = await import('./script/tabs/tab5.js');
        await tab5Module.initializeTab5();
      }
    } catch (error) {
      console.error('Error loading tab content:', error);
      tabContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
    }
  });
});

// Listen for clicks on any "view-link"
document.addEventListener('click', (event) => {
  if (event.target.classList.contains('view-link')) {
    const row = event.target.closest('tr');
    if (row && row.cells[0] && row.cells[0].innerText.trim() === 'Cookie') {
      event.preventDefault();
      // Use the showStorageDetails function from mainTab.js which shows all columns
      import('./script/tabs/mainTab.js').then(module => {
        const type = event.target.dataset.type;
        if (type) {
          module.showStorageDetails(type);
        }
      });
    }
  }
});
