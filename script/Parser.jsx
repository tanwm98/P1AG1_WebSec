import React, { useState, useEffect } from 'react';

const EndpointParser = () => {
  const [isAutoParseEnabled, setIsAutoParseEnabled] = useState(false);
  const [urlCount, setUrlCount] = useState(0);
  const [endpoints, setEndpoints] = useState([]);

  useEffect(() => {
    // Load saved state from chrome.storage
    chrome.storage.local.get(['autoParseEnabled', 'endpoints'], (result) => {
      if (result.autoParseEnabled !== undefined) {
        setIsAutoParseEnabled(result.autoParseEnabled);
      }
      if (result.endpoints) {
        setEndpoints(result.endpoints);
        setUrlCount(result.endpoints.length);
      }
    });
  }, []);

  const handleAutoParseToggle = () => {
    const newState = !isAutoParseEnabled;
    setIsAutoParseEnabled(newState);
    chrome.storage.local.set({ autoParseEnabled: newState });
  };

  const handleReparse = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "parseEndpoints" });
    });
  };

  const clearEndpoints = () => {
    setEndpoints([]);
    setUrlCount(0);
    chrome.storage.local.set({ endpoints: [] });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      {/* URL Counter Header */}
      <div className="bg-gray-800 text-white rounded-lg p-4">
        <h2 className="text-xl font-bold text-center">URLs ({urlCount})</h2>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={clearEndpoints}
          className="bg-gray-700 hover:bg-gray-600 text-white p-6 rounded-lg flex flex-col items-center"
        >
          <span className="material-icons mb-2">delete</span>
          <span>Panel</span>
        </button>
        <button
          onClick={handleReparse}
          className="bg-gray-900 hover:bg-gray-800 text-white p-6 rounded-lg flex flex-col items-center"
        >
          <span className="material-icons mb-2">refresh</span>
          <span>REPARSE</span>
        </button>
      </div>

      {/* Auto Parser Section */}
      <div className="bg-gray-800 text-white rounded-lg p-4">
        <h3 className="text-xl font-medium text-center text-orange-400">
          Auto Parser
        </h3>
        <div className="flex flex-col items-center mt-2">
          <p className="text-gray-300 text-sm">
            Auto parses after page load
          </p>
          <div className="flex items-center mt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isAutoParseEnabled}
                onChange={handleAutoParseToggle}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-400"></div>
            </label>
            <span className={`ml-3 ${isAutoParseEnabled ? 'text-orange-400' : 'text-gray-400'}`}>
              {isAutoParseEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndpointParser;