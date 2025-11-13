#!/bin/bash

# Test API metrics endpoint and compare with Docker

echo "🧪 Testing API Metrics Endpoint"
echo "================================"
echo ""

# Get server ID from API
echo "📋 Getting server list..."
SERVERS=$(curl -s http://localhost:5001/api/servers -H "X-Data-Mode: live")
SERVER_ID=$(echo $SERVERS | python3 -c "import sys, json; data=json.load(sys.stdin); print([s['id'] for s in data if s.get('ip') == '127.0.0.1'][0] if any(s.get('ip') == '127.0.0.1' for s in data) else '')" 2>/dev/null)

if [ -z "$SERVER_ID" ]; then
    echo "❌ No server found with IP 127.0.0.1"
    echo "   Make sure you've registered the test server in the app"
    exit 1
fi

echo "✅ Found server ID: $SERVER_ID"
echo ""

# Test metrics endpoint
echo "📊 Fetching metrics from API..."
echo "--------------------------------"
METRICS=$(curl -s "http://localhost:5001/api/servers/$SERVER_ID/metrics?password=testpass123&port=2222" -H "X-Data-Mode: live")

if echo "$METRICS" | grep -q "error"; then
    echo "❌ Error fetching metrics:"
    echo "$METRICS" | python3 -m json.tool 2>/dev/null || echo "$METRICS"
    exit 1
fi

echo "$METRICS" | python3 -m json.tool
echo ""

# Extract key values for comparison
echo "📈 Key Metrics Summary:"
echo "-----------------------"
CPU=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('cpu', {}).get('usage_percent', 'N/A'))" 2>/dev/null)
MEM=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('memory', {}).get('usage_percent', 'N/A'))" 2>/dev/null)
DISK=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('disk', {}).get('usage_percent', 'N/A'))" 2>/dev/null)

echo "CPU Usage:    ${CPU}%"
echo "Memory Usage: ${MEM}%"
echo "Disk Usage:   ${DISK}%"
echo ""

echo "✅ API test complete!"
echo ""
echo "💡 Compare these with:"
echo "   1. Docker container stats (run ./verify_metrics.sh)"
echo "   2. Your app's Dashboard/Metrics/Servers pages"
echo ""

