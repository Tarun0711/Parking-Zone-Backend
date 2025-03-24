#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env.production ]; then
    source .env.production
else
    echo "Error: .env.production file not found"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Build and start the containers
echo "Building and starting containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Check if services are running
echo "Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Check application health
echo "Checking application health..."
curl -f http://localhost:5000/health || {
    echo "Application health check failed"
    docker-compose -f docker-compose.prod.yml logs app
    exit 1
}

echo "Deployment completed successfully!" 