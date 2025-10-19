#!/bin/bash

echo "🚀 Deploying Server Monitoring Application..."

# Stop and remove existing containers
echo "📦 Stopping existing containers..."
docker-compose down

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    echo "📊 Backend running on: http://localhost:5000"
    echo "🖥️  Frontend running on: http://localhost:3000"
    echo ""
    echo "🔐 Demo Login Credentials:"
    echo "   Username: admin"
    echo "   Password: admin123"
else
    echo "❌ Deployment failed. Check logs with: docker-compose logs"
    exit 1
fi

