from flask import Flask, request, jsonify
from flask_cors import CORS
import dns.resolver
import dns.query
import dns.zone
import logging
import concurrent.futures

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

    return list(all_subdomains)

@app.route('/scan', methods=['GET'])
def scan():
    domain = request.args.get('domain')
    if not domain:
        return jsonify({"error": "Missing domain parameter"}), 400

    logging.info(f"Scanning domain: {domain}")
    try:
        subdomains = find_subdomains(domain)
        logging.info(f"Found {len(subdomains)} subdomains")
        return jsonify({"subdomains": sorted(subdomains)})
    except Exception as e:
        logging.error(f"Scan error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
