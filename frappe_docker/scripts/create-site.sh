#!/bin/bash
# Script to create a new Frappe site

set -e

SITE_NAME="${1:-dev.lawncarepro.local}"
ADMIN_PASSWORD="${2:-admin}"
DB_PASSWORD="${3:-admin}"

echo "Creating site: $SITE_NAME"

docker compose -f docker-compose.dev.yaml run --rm dev \
  bench new-site "$SITE_NAME" \
  --mariadb-user-host-login-scope='%' \
  --admin-password="$ADMIN_PASSWORD" \
  --db-root-username=root \
  --db-root-password="$DB_PASSWORD" \
  --install-app erpnext

echo "Site created successfully!"
echo "Access at: http://$SITE_NAME:${HTTP_PORT:-8080}"
echo "Login: Administrator / $ADMIN_PASSWORD"
