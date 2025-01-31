import { initializeMainPage } from "./script/tabs/mainTab.js";
import { initializeTab1 } from "./script/tabs/tab1.js";
import { initializeTab5 } from "./script/tabs/tab5.js";

const tabs = document.querySelectorAll('.tab-link');
const tabContent = document.getElementById('tab-content');

// Initialize main page on load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize main page if we're on it
    if (document.getElementById('techStackBody')) {
        initializeMainPage();
    }
});

tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        const file = tab.getAttribute('data-file');

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
                tabContent.innerHTML = data;
                if (file === 'tab5.html') {
                    initializeTab5();
                } else if (file === 'tab1.html') {
                    initializeTab1();
                }
            })
            .catch(error => {
                console.error('Error loading tab content:', error);
                tabContent.innerHTML = '<p>Error loading content. Please try again.</p>';
            });
    });
});