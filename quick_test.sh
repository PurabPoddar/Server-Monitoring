#!/bin/bash

# Quick test - generate load and show how to see changes

echo "🚀 Quick UI Test - Generate Load"
echo "=================================="
echo ""

echo "📋 Instructions:"
echo "1. Open your app in browser (Dashboard or Metrics page)"
echo "2. Keep it open and watch the metrics"
echo "3. This script will generate CPU load for 30 seconds"
echo "4. Watch CPU usage increase in your app!"
echo ""
read -p "Press Enter to start load generation..."

echo ""
echo "🔥 Generating CPU load (2 cores, 30 seconds)..."
docker exec -d test-ubuntu-server stress-ng --cpu 2 --timeout 30s

echo "✅ Load started!"
echo ""
echo "👀 Now watch your app:"
echo "   - CPU usage should jump to 50-100%"
echo "   - Progress bars should turn yellow/red"
echo "   - Numbers update in real-time"
echo ""
echo "⏱️  Load will stop automatically in 30 seconds"
echo ""
echo "💡 To stop early: docker exec test-ubuntu-server pkill -f stress-ng"

