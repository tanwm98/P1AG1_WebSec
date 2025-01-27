document.getElementById('runTest').addEventListener('click', () => {
    const testCases = {
        "text": ["", "ValidText", "<script>alert('XSS')</script>", "123456789012345678901234567890"],
        "email": ["invalidemail", "test@domain.com", "test@.com", "123@abc.xyz"],
        "number": ["-1", "0", "1000", "abc"],
        "password": ["short", "VeryStrongPassword123!", "password", "12345"],
        "url": ["invalid-url", "https://example.com", "ftp://example.com", "http://localhost"],
        "date": ["2025-01-01", "invalid-date", "12/31/2025", ""]
    };

    let inputs = document.querySelectorAll('input, textarea');
    let resultsDiv = document.getElementById('resultsList');
    resultsDiv.innerHTML = ""; // Clear previous results

    inputs.forEach(input => {
        let type = input.getAttribute("type") || "text";
        let values = testCases[type] || testCases["text"];

        values.forEach(value => {
            input.value = value;
            input.dispatchEvent(new Event('input'));

            let validationResult = input.validationMessage || (input.checkValidity() ? "Valid" : "Invalid");
            
            // Create result item to display
            let resultItem = document.createElement('li');
            resultItem.textContent = `Field: ${input.name || 'Unnamed'} | Type: ${type} | Value: "${value}" | Result: ${validationResult}`;
            resultsDiv.appendChild(resultItem);
        });
    });

    alert("Validation testing completed. See results below.");
});
