from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)
CORS(app)
# Function to perform Google Dorking and scrape subdomains
def google_dork_subdomains(domain):
    query = f"site:{domain} -www"
    search_url = f"https://www.google.com/search?q={query}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(search_url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract links containing subdomains
        subdomains = set()
        for link in soup.find_all('a', href=True):
            href = link['href']
            if 'http' in href and domain in href:
                clean_url = href.split('&')[0].replace('/url?q=', '')
                subdomain = clean_url.split('/')[2]
                if subdomain.endswith(domain):
                    subdomains.add(subdomain)

        return list(subdomains)

    except requests.exceptions.RequestException as e:
        return {"error": str(e)}

@app.route('/scan', methods=['GET'])
def scan():
    domain = request.args.get('domain')
    if not domain:
        return jsonify({"error": "Missing domain parameter"}), 400

    subdomains = google_dork_subdomains(domain)
    return jsonify({"subdomains": subdomains})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
