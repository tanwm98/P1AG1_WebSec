from flask import Flask, request, jsonify
from flask_cors import CORS
import dns.resolver
import dns.query
import dns.zone
import logging
import concurrent.futures
import requests
import json
import subprocess
import os
import socket
import urllib3
from concurrent.futures import ThreadPoolExecutor
from urllib3.util.timeout import Timeout

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.DEBUG)

def get_nameservers(domain):
    try:
        answers = dns.resolver.resolve(domain, 'NS')
        return [str(rdata.target).rstrip('.') for rdata in answers]
    except Exception as e:
        logging.error(f"Error getting nameservers: {str(e)}")
        return []

def try_zone_transfer(domain, nameserver):
    try:
        z = dns.zone.from_xfr(dns.query.xfr(nameserver, domain, timeout=5))
        return [f"{name}.{domain}" for name, _ in z.nodes.items()]
    except Exception as e:
        logging.debug(f"Zone transfer failed for {nameserver}: {str(e)}")
        return []

def check_common_subdomains(domain):
    common_subdomains = [
        'www', 'mail', 'remote', 'blog', 'webmail', 'server',
        'ns1', 'ns2', 'smtp', 'secure', 'vpn', 'api', 'dev',
        'staging', 'app', 'git', 'portal', 'admin', 'test'
    ]
    
    found_subdomains = set()
    resolver = dns.resolver.Resolver()
    resolver.timeout = 1
    resolver.lifetime = 1

    def check_subdomain(subdomain):
        try:
            fqdn = f"{subdomain}.{domain}"
            answers = resolver.resolve(fqdn, 'A')
            if answers:
                return fqdn
        except Exception:
            pass
        return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_subdomain = {
            executor.submit(check_subdomain, subdomain): subdomain 
            for subdomain in common_subdomains
        }
        
        for future in concurrent.futures.as_completed(future_to_subdomain):
            result = future.result()
            if result:
                found_subdomains.add(result)
                
    return list(found_subdomains)

def fetch_subdomains_from_crtsh(domain):
    subdomains = set()
    try:
        url = f"https://crt.sh/?q=%.{domain}&output=json"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            for entry in data:
                name_value = entry.get('name_value', '')
                for subdomain in name_value.split('\n'):
                    if subdomain and '*' not in subdomain:
                        subdomains.add(subdomain)
    except Exception as e:
        logging.error(f"Error fetching data from crt.sh: {str(e)}")
    return list(subdomains)

def run_sublist3r(domain):
    subdomains = set()
    try:
        result = subprocess.run(
            ['sublist3r', '-d', domain, '-o', '/tmp/sublist3r_output.txt'],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        if result.returncode == 0:
            with open('/tmp/sublist3r_output.txt', 'r') as file:
                for line in file:
                    subdomain = line.strip()
                    if subdomain:
                        subdomains.add(subdomain)
            os.remove('/tmp/sublist3r_output.txt')
        else:
            logging.error(f"Sublist3r error: {result.stderr}")
    except Exception as e:
        logging.error(f"Error running Sublist3r: {str(e)}")
    return list(subdomains)

def find_subdomains(domain):
    logging.info(f"Starting subdomain enumeration for: {domain}")
    all_subdomains = set()
    
    # Get nameservers
    nameservers = get_nameservers(domain)
    logging.info(f"Found nameservers: {nameservers}")
    
    # Try zone transfer with each nameserver
    for ns in nameservers:
        subdomains = try_zone_transfer(domain, ns)
        all_subdomains.update(subdomains)
    
    # Check common subdomains
    common_subs = check_common_subdomains(domain)
    all_subdomains.update(common_subs)
    
    # Try to get MX records
    try:
        mx_records = dns.resolver.resolve(domain, 'MX')
        for mx in mx_records:
            all_subdomains.add(str(mx.exchange).rstrip('.'))
    except Exception as e:
        logging.debug(f"MX record lookup failed: {str(e)}")
    
    # Fetch subdomains from crt.sh
    crtsh_subdomains = fetch_subdomains_from_crtsh(domain)
    all_subdomains.update(crtsh_subdomains)
    
    # Run Sublist3r
    sublist3r_subdomains = run_sublist3r(domain)
    all_subdomains.update(sublist3r_subdomains)

    return list(all_subdomains)

def check_subdomain_status(subdomain):
    status = {
        'subdomain': subdomain,
        'dns_resolves': False,
        'http_status': None,
        'https_status': None,
        'ip_address': None,
        'is_active': False
    }
    
    # Check DNS resolution
    try:
        ip = socket.gethostbyname(subdomain)
        status['dns_resolves'] = True
        status['ip_address'] = ip
    except socket.gaierror:
        return status
    
    # Check HTTP/HTTPS
    timeout = Timeout(connect=5, read=5)
    for protocol in ['http', 'https']:
        try:
            response = requests.head(
                f"{protocol}://{subdomain}", 
                timeout=timeout.connect_timeout,
                allow_redirects=True,
                verify=False
            )
            status[f'{protocol}_status'] = response.status_code
            if response.status_code < 400:
                status['is_active'] = True
        except:
            status[f'{protocol}_status'] = None
    
    return status

def check_all_subdomains(subdomains):
    results = []
    with ThreadPoolExecutor(max_workers=20) as executor:
        future_to_subdomain = {
            executor.submit(check_subdomain_status, subdomain): subdomain 
            for subdomain in subdomains
        }
        for future in concurrent.futures.as_completed(future_to_subdomain):
            try:
                result = future.result()
                results.append(result)
            except Exception as e:
                logging.error(f"Error checking subdomain: {str(e)}")
    return results

# Add timeout constants
DNS_TIMEOUT = 5
CONNECTION_TIMEOUT = 5

def check_subdomain_availability(subdomain):
    try:
        # Set socket timeout for DNS resolution
        socket.setdefaulttimeout(DNS_TIMEOUT)
        ip = socket.gethostbyname(subdomain)
        
        # Check HTTP/HTTPS with timeout
        for protocol in ['https', 'http']:
            try:
                response = requests.head(
                    f"{protocol}://{subdomain}",
                    timeout=CONNECTION_TIMEOUT,
                    allow_redirects=True,
                    verify=False
                )
                if response.status_code < 400:
                    return {'active': True, 'ip': ip, 'protocol': protocol}
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
                continue
                
        return {'active': False, 'ip': ip, 'error': 'Connection timeout or refused'}
    except socket.timeout:
        return {'active': False, 'ip': None, 'error': 'DNS resolution timeout'}
    except socket.gaierror:
        return {'active': False, 'ip': None, 'error': 'DNS resolution failed'}

@app.route('/scan', methods=['GET'])
def scan():
    domain = request.args.get('domain')
    if not domain:
        return jsonify({'error': 'No domain provided'}), 400
    
    try:
        subdomains = find_subdomains(domain)
        results = []
        
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_subdomain = {
                executor.submit(check_subdomain_availability, sub): sub 
                for sub in subdomains
            }
            
            for future in concurrent.futures.as_completed(future_to_subdomain):
                subdomain = future_to_subdomain[future]
                try:
                    status = future.result()
                    results.append({
                        'subdomain': subdomain,
                        'status': status
                    })
                except Exception as e:
                    results.append({
                        'subdomain': subdomain,
                        'status': {'active': False, 'error': str(e)}
                    })
        
        return jsonify({
            'results': results,
            'total': len(subdomains)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/resolve', methods=['GET'])
def resolve_domain():
    domain = request.args.get('domain')
    if not domain:
        return jsonify({'error': 'No domain provided'}), 400
        
    try:
        ip = socket.gethostbyname(domain)
        return jsonify({'ip': ip, 'resolved': True})
    except socket.gaierror:
        return jsonify({'resolved': False}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
