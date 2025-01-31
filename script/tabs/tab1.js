export async function initializeTab1() {
    const urlElement = document.getElementById("url");
    const ipv4Element = document.getElementById("ipv4");
    const ipv6Element = document.getElementById("ipv6");
    const nsElement = document.getElementById("ns");
    const mxElement = document.getElementById("mx");

    if (!urlElement) return; // Not on tab1

    try {
        // Get the active tab's URL
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) throw new Error("Cannot access active tab or URL.");

        const url = new URL(tab.url);
        urlElement.textContent = url.href;

        // Function to resolve DNS using Google's DoH API
        const resolveDNS = async (domain, type) => {
            const response = await fetch(`https://dns.google/resolve?name=${domain}&type=${type}`);
            if (!response.ok) throw new Error(`Error fetching ${type} records.`);
            const data = await response.json();
            return data.Answer ? data.Answer.map(record => record.data) : [];
        };

        // Resolve DNS details
        const ipv4 = await resolveDNS(url.hostname, "A");
        const ipv6 = await resolveDNS(url.hostname, "AAAA");
        const ns = await resolveDNS(url.hostname, "NS");
        const mx = await resolveDNS(url.hostname, "MX");

        // Update the UI
        ipv4Element.textContent = ipv4.join(", ") || "Not Found";
        ipv6Element.textContent = ipv6.join(", ") || "Not Found";
        nsElement.textContent = ns.join(", ") || "Not Found";
        mxElement.textContent = mx.join(", ") || "Not Found";
    } catch (error) {
        console.error(error);
        urlElement.textContent = "Error: Unable to load.";
        ipv4Element.textContent = "Error loading data.";
        ipv6Element.textContent = "Error loading data.";
        nsElement.textContent = "Error loading data.";
        mxElement.textContent = "Error loading data.";
    }
}