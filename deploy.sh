#!/bin/bash

cd /srv/portal-test

echo "Pulling latest code..."
git pull

echo "Stopping old container..."
docker stop portal-test || true
docker rm portal-test || true

echo "Building new image..."
docker build -t portal-test .

echo "Starting container..."
docker run -d -p 3000:80 --name portal-test portal-test

echo "Deploy completed."

