const tabs = document.querySelectorAll('.tab-link');
const tabContent = document.getElementById('tab-content'); // Main container for tab content

tabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    e.preventDefault();
    const file = tab.getAttribute('data-file'); // Get the HTML file to load

    // Remove active class from all tabs
    tabs.forEach(t => t.classList.remove('active'));

    // Add active class to the clicked tab
    tab.classList.add('active');

    // Fetch and display the content for the selected tab
    fetch(file)
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
      })
      .then(data => {
        tabContent.innerHTML = data; // Load the new tab content
        // Execute any scripts in the loaded content
        const scripts = tabContent.getElementsByTagName('script');
        Array.from(scripts).forEach(script => {
          const newScript = document.createElement('script');
          if (script.src) {
            newScript.src = script.src;
          } else {
            newScript.textContent = script.textContent;
          }
          script.parentNode.replaceChild(newScript, script);
        });
      })
      .catch(error => {
        console.error('Error loading tab content:', error);
        tabContent.innerHTML = '<p>Error loading content. Please try again.</p>';
      });
  });
});
