#!/bin/bash
# Script to install the lawn_care_pro app on a site

set -e

SITE_NAME="${1:-dev.lawncarepro.local}"
APP_PATH="${2:-/workspace/lawn_care_pro}"

echo "Installing lawn_care_pro app on $SITE_NAME"

# First, get the app into the bench (from mounted path)
docker compose -f docker-compose.dev.yaml run --rm dev \
  bench get-app lawn_care_pro "$APP_PATH" --overwrite

# Then install it on the site
docker compose -f docker-compose.dev.yaml run --rm dev \
  bench --site "$SITE_NAME" install-app lawn_care_pro

echo "App installed successfully!"
