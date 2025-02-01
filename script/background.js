// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'endpointsUpdated') {
    try {
      chrome.runtime.sendMessage(request);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error forwarding message:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  else if (request.type === 'FETCH_URL') {
    console.log('Background script fetching:', request.url);
    fetch(request.url)
      .then(async response => {
        const text = await response.text();
        console.log('Fetch succeeded, text length:', text.length);
        sendResponse({ ok: true, text });
      })
      .catch(error => {
        console.error('Background fetch error:', error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;  // Indicate we will send response asynchronously
  }

  else if (request.action === 'sendRequest') {
    console.log('Sending request:', request);

    const options = {
      method: request.method || 'GET',
      headers: request.customRequest?.headers || {}
    };

    if (request.method === 'POST' && request.customRequest?.body) {
      options.body = request.customRequest.body;
    }

    fetch(request.endpoint.url, options)
      .then(async response => {
        const text = await response.text();
        sendResponse({
          success: true,
          url: request.endpoint.url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: text
        });
      })
      .catch(error => {
        console.error('Request error:', error);
        sendResponse({
          success: false,
          url: request.endpoint.url,
          status: 0,
          statusText: 'Error',
          headers: { 'Error': error.toString() },
          body: 'Failed to fetch'
        });
      });
    return true;
  }
});
// Add icon click handler
chrome.action.onClicked.addListener((tab) => {
    if (tab.url?.startsWith('http')) {
        chrome.tabs.sendMessage(tab.id, { action: "parseEndpoints" });
    }
});