# ExMM (Exploit Mitigation and Monitoring)

![ExMM Logo](media/icon128.png)

A comprehensive browser extension for web security testing that provides an all-in-one solution for penetration testers, security professionals, and developers. ExMM integrates multiple security testing tools directly into your browser to streamline your workflow and enhance your productivity.

## 🔍 Features

ExMM offers a powerful suite of tools accessible through a user-friendly browser interface:

### 1. DNS Information Scanner
- **Security Headers Analysis**: Checks for the implementation of essential security headers
- **SSL/TLS Analysis**: Evaluates the security of the site's SSL/TLS configuration
- **JavaScript Security Analysis**: Identifies potential security issues in JavaScript code
- **Input Field Analysis**: Examines form fields for security vulnerabilities

### 2. Software Composition Analysis (SCA)
- **Library Detection**: Identifies libraries and frameworks used by the website
- **Vulnerability Scanning**: Detects known vulnerabilities (CVEs) in detected components
- **Third-Party Analysis**: Evaluates the security implications of third-party components
- **Scan on Demand**: One-click scanning to generate up-to-date results

### 3. Input Validation Tester
- **Automated Testing**: Tests input fields with various payloads
- **XSS Detection**: Identifies cross-site scripting vulnerabilities
- **SQL Injection Testing**: Checks for SQL injection weaknesses
- **Visual Progress Tracking**: Provides real-time progress updates during testing

### 4. Subdomain Scanner
- **Comprehensive Discovery**: Identifies subdomains associated with the target domain
- **Status Checking**: Determines if subdomains are active or inactive
- **Error Analysis**: Provides information on why subdomains may be inactive
- **IP Address Resolution**: Shows IP addresses for discovered subdomains

### 5. Endpoint Parser
- **Automatic Endpoint Detection**: Identifies URLs from DOM elements, JavaScript files, and network requests
- **Endpoint Classification**: Categorizes endpoints by type (API, static resource, etc.)
- **Scope Determination**: Classifies URLs as internal, external, or subdomain
- **Request Testing**: Send GET/POST requests to endpoints and analyze responses
- **Export Capabilities**: Export endpoints in JSON or TXT format for further analysis

## 🚀 Installation

1. Download or clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. The ExMM icon should appear in your browser toolbar

## 📋 Usage

### Main Dashboard
- Click the ExMM icon in your browser toolbar to open the main dashboard
- View the technology stack, WAF/CDN information, and storage/authentication details of the current site
- Navigate between different tools using the tab menu at the top

### DNS Information Scanner
1. Open the extension and select the "DNS Info" tab
2. The scanner will automatically analyze the current website
3. View detailed information about security headers, SSL/TLS configuration, and JavaScript security

### SCA Scanner
1. Navigate to the "Vulnerabilities" tab
2. Click "Scan Now" to start the vulnerability analysis
3. Review identified libraries and associated vulnerabilities

### Input Validation Tester
1. Go to the "Input Validation" tab
2. Click "Test Input Field Security" to begin automated testing
3. Monitor the progress bar as the extension tests various input fields
4. Review detailed results of security tests for each input field

### Subdomain Scanner
1. Select the "Subdomain Scanner" tab
2. The extension connects to a Flask server to perform subdomain enumeration
3. View discovered subdomains with their status and IP addresses

### Endpoint Parser
1. Navigate to the "Endpoints" tab
2. The extension automatically scans the current page for endpoints
3. Use the filter to search for specific endpoints
4. Click "Details Panel" for comprehensive endpoint analysis
5. Export findings for further analysis

## ⚙️ Server Setup for Subdomain Scanner

The Subdomain Scanner feature requires a Flask server to handle scanning operations:

1. Navigate to the `server` directory
2. Install the required Python packages:
   ```
   pip install flask flask-cors dnspython requests urllib3
   ```
3. Start the Flask server:
   ```
   python flask_server.py
   ```
4. The server runs on `http://localhost:5000` by default
5. Make sure the server is running before using the Subdomain Scanner tab

## 🔧 How It Works

### DNS Information Scanner
Analyzes HTTP response headers, evaluates SSL/TLS configuration, and scans for security issues in JavaScript code and input fields.

### SCA Scanner
Detects libraries and frameworks loaded on the page and cross-references them with vulnerability databases to identify potential security risks.

### Input Validation Tester
Automatically identifies form fields and tests them with various payloads to detect input validation weaknesses.

### Subdomain Scanner
Combines multiple techniques (DNS queries, certificate transparency logs, etc.) through a Flask server to discover subdomains associated with the target domain.

### Endpoint Parser
Uses multiple techniques to discover endpoints:
- **DOM Analysis**: Scans all DOM elements that might contain URLs
- **JavaScript Parsing**: Analyzes JavaScript files to extract hardcoded URLs
- **Network Monitoring**: Intercepts network requests to capture endpoints in real-time
- **Classification Engine**: Categorizes endpoints based on their structure and purpose

## 🛠️ Advanced Configuration

For advanced users, ExMM offers customization options in the code:
- Modify server configurations in `flask_server.py`
- Customize scanning parameters in JavaScript files
- Add custom tests for input validation

## 🧠 Use Cases

- **Penetration Testing**: Quickly identify potential vulnerabilities and entry points
- **Security Audits**: Perform comprehensive security assessments of web applications
- **Development Support**: Test security during development to catch issues early
- **Education**: Learn about web security concepts and vulnerability detection


## 🙏 Acknowledgements

- The ExMM team: Gan Yi Heng Joel, Tan Wei Ming, Ng Ray En Ryan, Tay Hao Xiang Ryan, Lim Hui Fang
- Singapore Institute of Technology
