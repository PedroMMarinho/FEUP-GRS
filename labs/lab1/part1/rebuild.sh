#!/bin/bash

# 1. Stop and completely remove the old containers and networks
echo "Tearing down old containers..."
docker compose down

# 2. Force Compose to rebuild the images from scratch (bypassing the cache)
echo "Rebuilding images..."
docker compose build --no-cache

# 3. Bring the fresh containers back up in the background
echo "Starting fresh containers..."
docker compose up -d

# 4. Clean up the old, unnamed "dangling" images to save disk space
echo "Cleaning up dangling image files..."
docker image prune -f

echo "Done! The environment has been completely rebuilt from scratch."