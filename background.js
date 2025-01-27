chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "open_validation_tab") {
        chrome.tabs.create({ url: chrome.runtime.getURL("tabs/tab3-validation.html") });
    }
});
