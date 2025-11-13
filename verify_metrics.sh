#!/bin/bash

# Script to verify Docker container metrics and compare with app

echo "🔍 Verifying Docker Container Metrics"
echo "======================================"
echo ""

CONTAINER_NAME="test-ubuntu-server"

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "❌ Container $CONTAINER_NAME is not running!"
    echo "   Start it with: docker start $CONTAINER_NAME"
    exit 1
fi

echo "✅ Container is running"
echo ""

# Get Docker stats
echo "📊 Docker Container Stats:"
echo "---------------------------"
docker stats $CONTAINER_NAME --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
echo ""

# SSH into container and get detailed metrics
echo "📈 Detailed Metrics from Container (via SSH):"
echo "----------------------------------------------"

# CPU Usage
echo "🖥️  CPU Usage:"
docker exec $CONTAINER_NAME bash -c "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\([0-9.]*\)%* id.*/\1/' | awk '{print 100 - \$1}'" 2>/dev/null || \
docker exec $CONTAINER_NAME bash -c "grep 'cpu ' /proc/stat | awk '{usage=(\$2+\$4)*100/(\$2+\$3+\$4+\$5)} END {print usage}'"
echo ""

# CPU Cores
echo "🔢 CPU Cores:"
docker exec $CONTAINER_NAME nproc
echo ""

# Load Average
echo "⚖️  Load Average:"
docker exec $CONTAINER_NAME cat /proc/loadavg | awk '{print "1min: "$1", 5min: "$2", 15min: "$3}'
echo ""

# Memory Usage
echo "💾 Memory Usage:"
docker exec $CONTAINER_NAME free -h
echo ""
docker exec $CONTAINER_NAME free -m | awk 'NR==2{printf "Usage: %.2f%% (%.2f GB / %.2f GB)\n", $3*100/$2, $3/1024, $2/1024}'
echo ""

# Disk Usage
echo "💿 Disk Usage:"
docker exec $CONTAINER_NAME df -h /
echo ""
docker exec $CONTAINER_NAME df -h / | awk 'NR==2{printf "Usage: %s (%.2f GB / %.2f GB)\n", $5, $3, $2}'
echo ""

# Uptime
echo "⏱️  Uptime:"
docker exec $CONTAINER_NAME uptime -p 2>/dev/null || docker exec $CONTAINER_NAME uptime
echo ""

# Network Stats
echo "🌐 Network Stats:"
docker exec $CONTAINER_NAME cat /proc/net/dev | awk 'NR>2 {rx+=$2; tx+=$10} END {printf "Received: %.2f MB\nSent: %.2f MB\n", rx/1024/1024, tx/1024/1024}'
echo ""

echo "✅ Verification complete!"
echo ""
echo "💡 Compare these values with what you see in your app:"
echo "   - Dashboard page"
echo "   - Metrics page"
echo "   - Servers page"
echo ""

