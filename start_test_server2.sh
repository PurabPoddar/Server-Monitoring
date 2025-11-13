#!/bin/bash

# Second Test Server Setup Script
# This creates another local Ubuntu SSH server for testing

echo "🚀 Starting Second Test Ubuntu SSH Server..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   macOS: https://docs.docker.com/desktop/install/mac-install/"
    echo "   Linux: https://docs.docker.com/engine/install/"
    exit 1
fi

# Stop and remove existing container if it exists
docker stop test-ubuntu-server-2 2>/dev/null
docker rm test-ubuntu-server-2 2>/dev/null

# Start new container on port 2223
echo "📦 Starting second Ubuntu container with SSH on port 2223..."
docker run -d \
  --name test-ubuntu-server-2 \
  -p 2223:22 \
  -e ROOT_PASSWORD=testpass123 \
  rastasheep/ubuntu-sshd:latest

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Second test server is running!"
    echo ""
    echo "📋 Connection Details:"
    echo "   IP Address: 127.0.0.1 (or localhost)"
    echo "   Port: 2223"
    echo "   Username: root"
    echo "   Password: testpass123"
    echo ""
    echo "🧪 Test SSH connection:"
    echo "   ssh -p 2223 root@localhost"
    echo ""
    echo "📝 Register in your app with:"
    echo "   - IP: 127.0.0.1"
    echo "   - Port: 2223"
    echo "   - Username: root"
    echo "   - Auth Type: Password"
    echo "   - Password: testpass123"
    echo ""
    echo "🛑 To stop the server:"
    echo "   docker stop test-ubuntu-server-2"
    echo "   docker rm test-ubuntu-server-2"
else
    echo "❌ Failed to start container"
    exit 1
fi

