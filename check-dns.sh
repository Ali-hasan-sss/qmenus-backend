#!/bin/bash

# Script to check if DNS is configured correctly for SSL certificate generation
# Domain: api.qmenussy.com
# Expected IP: 72.62.157.251

DOMAIN="api.qmenussy.com"
EXPECTED_IP="72.62.157.251"

echo "=========================================="
echo "DNS Configuration Check"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Expected IP: $EXPECTED_IP"
echo "=========================================="
echo ""

# Check A record
echo "1. Checking A Record..."
ACTUAL_IP=$(dig +short $DOMAIN A | head -n 1)

if [ -z "$ACTUAL_IP" ]; then
    echo "❌ ERROR: No A record found for $DOMAIN"
    echo "   You need to add an A record in your DNS settings:"
    echo "   Type: A"
    echo "   Name: api"
    echo "   Value: $EXPECTED_IP"
    echo "   TTL: 3600 (or default)"
    exit 1
else
    echo "✅ A record found: $ACTUAL_IP"
    
    if [ "$ACTUAL_IP" == "$EXPECTED_IP" ]; then
        echo "✅ IP matches expected IP: $EXPECTED_IP"
    else
        echo "⚠️  WARNING: IP does not match!"
        echo "   Expected: $EXPECTED_IP"
        echo "   Found: $ACTUAL_IP"
        echo "   Please update your A record to point to $EXPECTED_IP"
        exit 1
    fi
fi

echo ""

# Check if domain is reachable
echo "2. Checking if domain is reachable via HTTP..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://$DOMAIN/.well-known/acme-challenge/test 2>/dev/null || echo "000")

if [ "$HTTP_CODE" == "404" ] || [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Domain is reachable (HTTP code: $HTTP_CODE)"
elif [ "$HTTP_CODE" == "000" ]; then
    echo "⚠️  Domain is not reachable yet (connection timeout)"
    echo "   This might be due to:"
    echo "   - DNS propagation not complete (wait 5-30 minutes)"
    echo "   - Firewall blocking port 80"
    echo "   - Nginx not running"
else
    echo "⚠️  Unexpected HTTP code: $HTTP_CODE"
fi

echo ""

# Check port 80 accessibility
echo "3. Checking if port 80 is accessible..."
if timeout 5 bash -c "echo >/dev/tcp/$DOMAIN/80" 2>/dev/null; then
    echo "✅ Port 80 is accessible"
else
    echo "❌ Port 80 is not accessible"
    echo "   Please check:"
    echo "   - Firewall settings"
    echo "   - Nginx is running: docker compose ps nginx"
fi

echo ""

# Summary
echo "=========================================="
if [ "$ACTUAL_IP" == "$EXPECTED_IP" ] && [ "$HTTP_CODE" != "000" ]; then
    echo "✅ DNS is configured correctly!"
    echo "   You can proceed with SSL certificate generation."
    echo ""
    echo "   Next step:"
    echo "   cd /opt/qmenus/qmenus-backend"
    echo "   ./nginx/init-letsencrypt.sh"
else
    echo "⚠️  DNS configuration needs attention"
    echo "   Please fix the issues above before generating SSL certificates"
fi
echo "=========================================="
