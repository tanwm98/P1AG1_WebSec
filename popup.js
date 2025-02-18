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
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    try {
      const tabUrl = chrome.runtime.getURL(file);
      console.log('Tab URL:', tabUrl);
      const response = await fetch(tabUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.text();
      tabContent.innerHTML = data;

      if (file === 'tab1.html') {
        const tab1Module = await import('./script/tabs/tab1.js');
        await tab1Module.initializeTab1();
      } else if (file === 'tab5.html') {
        const tab5Module = await import('./script/tabs/tab5.js');
        await tab5Module.initializeTab5();
      } else if (file === 'tab2.html') {
        const tab2Module = await import('./script/tabs/tab2.js');
        if (tab2Module.default) {
          await tab2Module.default();
        } else {
          console.error('tab2Module.default is not defined. Ensure tab2.js uses `export default function` for initializeTab2.');
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