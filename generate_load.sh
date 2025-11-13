#!/bin/bash

# Script to generate load on Docker container to test UI changes

CONTAINER_NAME="test-ubuntu-server"

echo "🔥 Generating Load on Container"
echo "================================"
echo ""

# Check if stress-ng is installed, if not install it
echo "📦 Installing stress-ng (if needed)..."
docker exec $CONTAINER_NAME bash -c "which stress-ng > /dev/null 2>&1 || (apt-get update -qq && apt-get install -y -qq stress-ng > /dev/null 2>&1)" 2>/dev/null

echo "✅ Ready to generate load"
echo ""
echo "Choose load type:"
echo "1) CPU Load (high CPU usage)"
echo "2) Memory Load (high memory usage)"
echo "3) Both CPU + Memory"
echo "4) Stop all load"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🔥 Starting CPU load (2 cores, 30 seconds)..."
        docker exec -d $CONTAINER_NAME stress-ng --cpu 2 --timeout 30s
        echo "✅ CPU load started! Watch your app's CPU usage increase."
        echo "   It will stop automatically after 30 seconds."
        ;;
    2)
        echo ""
        echo "🔥 Starting Memory load (1GB, 30 seconds)..."
        docker exec -d $CONTAINER_NAME stress-ng --vm 1 --vm-bytes 1G --timeout 30s
        echo "✅ Memory load started! Watch your app's memory usage increase."
        echo "   It will stop automatically after 30 seconds."
        ;;
    3)
        echo ""
        echo "🔥 Starting CPU + Memory load (30 seconds)..."
        docker exec -d $CONTAINER_NAME stress-ng --cpu 2 --vm 1 --vm-bytes 512M --timeout 30s
        echo "✅ Load started! Watch both CPU and Memory increase in your app."
        echo "   It will stop automatically after 30 seconds."
        ;;
    4)
        echo ""
        echo "🛑 Stopping all stress processes..."
        docker exec $CONTAINER_NAME pkill -f stress-ng 2>/dev/null || echo "No stress processes running"
        echo "✅ All load stopped"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "💡 Tips:"
echo "   - Refresh your app's Dashboard/Metrics page to see changes"
echo "   - Or wait a few seconds and metrics will auto-update"
echo "   - Run './verify_metrics.sh' to see current Docker stats"
echo ""

