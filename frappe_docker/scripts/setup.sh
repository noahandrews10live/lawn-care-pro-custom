#!/bin/bash
# Complete setup script for LawnCare Pro development environment
# This script creates the site and installs the app

set -e

SITE_NAME="${1:-dev.lawncarepro.local}"
ADMIN_PASSWORD="${2:-admin}"
DB_PASSWORD="${3:-admin}"

echo "=========================================="
echo "LawnCare Pro - Development Setup"
echo "=========================================="

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running"
    exit 1
fi

echo ""
echo "Step 1: Starting services..."
docker compose -f docker-compose.dev.yaml up -d

echo ""
echo "Step 2: Waiting for services to be healthy..."
echo "  - This may take a few minutes on first run..."

# Wait for db to be ready
echo "  Waiting for database..."
until docker compose -f docker-compose.dev.yaml exec -T db mysqladmin ping -h localhost --password="$DB_PASSWORD" --silent 2>/dev/null; do
    sleep 2
done
echo "  Database is ready!"

# Wait for configurator to complete
echo "  Waiting for configurator..."
sleep 10

echo ""
echo "Step 3: Creating site: $SITE_NAME"
docker compose -f docker-compose.dev.yaml run --rm dev \
  bench new-site "$SITE_NAME" \
  --mariadb-user-host-login-scope='%' \
  --admin-password="$ADMIN_PASSWORD" \
  --db-root-username=root \
  --db-root-password="$DB_PASSWORD" \
  --install-app erpnext

echo ""
echo "Step 4: Getting lawn_care_pro app..."
docker compose -f docker-compose.dev.yaml run --rm dev \
  bench get-app lawn_care_pro /workspace/lawn_care_pro --overwrite

echo ""
echo "Step 5: Installing lawn_care_pro on site..."
docker compose -f docker-compose.dev.yaml run --rm dev \
  bench --site "$SITE_NAME" install-app lawn_care_pro

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Access the site at: http://${SITE_NAME}:8080"
echo "Login: Administrator / $ADMIN_PASSWORD"
echo ""
echo "To access the development container:"
echo "  docker compose -f docker-compose.dev.yaml exec dev bash"
echo ""
echo "To stop the environment:"
echo "  docker compose -f docker-compose.dev.yaml down"
echo ""
echo "To start again:"
echo "  docker compose -f docker-compose.dev.yaml up -d"
