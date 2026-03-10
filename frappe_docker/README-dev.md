# LawnCare Pro - Development Docker Environment

This directory contains a Docker-based development environment for the LawnCare Pro Frappe application. It builds on the [frappe_docker](https://github.com/frappe/frappe_docker) project.

## Directory Structure

```
frappe_docker/
├── docker-compose.dev.yaml    # Development compose file
├── .env                       # Environment variables
├── scripts/
│   ├── setup.sh              # Complete first-time setup
│   ├── create-site.sh        # Create a new Frappe site
│   └── install-app.sh        # Install lawn_care_pro app
├── workspace/                # Mounted workspace (symlinked to app)
│   └── lawn_care_pro -> ../../lawn_care_pro
└── README-dev.md            # This file
```

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2+
- 8GB RAM recommended
- 20GB disk space

## Quick Start

```bash
# 1. Start all services
docker compose -f docker-compose.dev.yaml up -d

# 2. Wait for services to be healthy (check with)
docker compose -f docker-compose.dev.yaml ps

# 3. Create a new site (first time only)
docker compose -f docker-compose.dev.yaml run --rm dev bench new-site dev.lawncarepro.local \
  --mariadb-user-host-login-scope='%' \
  --admin-password=admin \
  --db-root-username=root \
  --db-root-password=admin

# 4. Install the lawn_care_pro app
docker compose -f docker-compose.dev.yaml run --rm dev bench get-app lawn_care_pro /workspace/lawn_care_pro

# 5. Install app on site
docker compose -f docker-compose.dev.yaml run --rm dev bench --site dev.lawncarepro.local install-app lawn_care_pro

# 6. Access the site
# Visit http://dev.lawncarepro.local (add to /etc/hosts)
# Login: Administrator / admin
```

## Services

- **db**: MariaDB 11.8 (persists to `db-data` volume)
- **redis-cache**: Redis 6.2 (caching)
- **redis-queue**: Redis 6.2 (job queue, persists to `redis-queue-data`)
- **backend**: Frappe/ERPNext backend (port 8000)
- **frontend**: Nginx reverse proxy (port 8080)
- **websocket**: Socket.IO server (port 9000)
- **queue-short**: Short queue worker
- **queue-long**: Long queue worker
- **scheduler**: Scheduled tasks
- **dev**: Development container with bench CLI and mounted source

## Environment Variables

See `.env` file. Default values work for development.

## Development Workflow

### Running Bench Commands

```bash
# Enter development container
docker compose -f docker-compose.dev.yaml exec dev bash

# Run bench commands inside
bench --site dev.lawncarepro.local list-apps
bench --site dev.lawncarepro.local migrate
bench --site dev.lawncarepro.local reinstall
```

### Mounted Directories

- `./workspace` → `/workspace` in dev container (for app source)
- `./sites` → `/home/frappe/frappe-bench/sites` (site data)
- `./logs` → `/home/frappe/frappe-bench/logs` (log files)

### Adding Your App

The `lawn_care_pro` app is already mounted from the host. To make changes:

1. Make changes in `../lawn_care_pro` on your host
2. Inside the container, run:
   ```bash
   bench --site dev.lawncarepro.local build
   bench --site dev.lawncarepro.local migrate
   ```

### Stopping and Starting

```bash
# Stop (data persists)
docker compose -f docker-compose.dev.yaml down

# Start again
docker compose -f docker-compose.dev.yaml up -d

# Full reset (removes database!)
docker compose -f docker-compose.dev.yaml down -v
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose -f docker-compose.dev.yaml logs -f

# Check service health
docker compose -f docker-compose.dev.yaml ps
```

### Database connection issues

Wait for MariaDB to be fully ready:
```bash
docker compose -f docker-compose.dev.yaml logs db
# Look for "ready for connections"
```

### Can't access the site

Add to `/etc/hosts`:
```
127.0.0.1 dev.lawncarepro.local
```

Then visit http://dev.lawncarepro.local:8080

### Reset everything

```bash
docker compose -f docker-compose.dev.yaml down -v
docker volume prune -f
# Then run the quick start commands again
```
