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
      showCookieModal();
    }
    // Additional view-link handling (e.g., for CVE details) can be added here.
  }
});

// Function to show a modal with cookie details
function showCookieModal() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab && activeTab.url) {
      chrome.cookies.getAll({ url: activeTab.url }, (cookies) => {
        let cookieHTML = `<h2>Cookies for ${activeTab.url}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th>Name</th>
                <th>Value</th>
                <th>HTTPOnly</th>
              </tr>
            </thead>
            <tbody>`;
        cookies.forEach(cookie => {
          cookieHTML += `<tr>
            <td>${cookie.name}</td>
            <td>${cookie.value}</td>
            <td>${cookie.httpOnly ? 'True' : 'False'}</td>
          </tr>`;
        });
        cookieHTML += `</tbody></table>
          <button id="closeCookieModal" style="margin-top: 10px;">Close</button>`;
        
        // Create the modal if it doesn't exist
        let modal = document.getElementById('cookieModal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'cookieModal';
          modal.style.position = 'fixed';
          modal.style.top = '0';
          modal.style.left = '0';
          modal.style.width = '100%';
          modal.style.height = '100%';
          modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          modal.style.zIndex = '1000';
          modal.innerHTML = `<div id="cookieModalContent" style="background: white; color: black; margin: 10% auto; padding: 20px; width: 80%; max-width: 600px; border-radius: 4px;"></div>`;
          document.body.appendChild(modal);
        }
        const modalContent = document.getElementById('cookieModalContent');
        modalContent.innerHTML = cookieHTML;
        modal.style.display = 'block';
        document.getElementById('closeCookieModal').addEventListener('click', () => {
          modal.style.display = 'none';
        });
      });
    }
  });
}
