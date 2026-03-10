---
phase: 01-docker-dev
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frappe_docker/docker-compose.dev.yaml
  - frappe_docker/.env
  - frappe_docker/scripts/setup.sh
  - frappe_docker/scripts/create-site.sh
  - frappe_docker/scripts/install-app.sh
  - frappe_docker/README-dev.md
  - frappe_docker/workspace/lawn_care_pro (symlink)
autonomous: true
requirements:
  - DOCKER-01
  - DOCKER-02
must_haves:
  truths:
    - Docker Compose starts all services (MariaDB, Redis, Frappe bench, worker)
    - Bench CLI is accessible in development container
    - New site can be created and app installed via script
    - Development files mount live (changes reflect without rebuild)
    - Database persists between restarts
  artifacts:
    - path: "frappe_docker/docker-compose.dev.yaml"
      provides: "All Docker services configuration"
      contains: "services:"
    - path: "frappe_docker/.env"
      provides: "Environment configuration"
      contains: "ERPNEXT_VERSION"
    - path: "frappe_docker/scripts/setup.sh"
      provides: "Automated setup script"
      contains: "bench new-site"
    - path: "frappe_docker/workspace/"
      provides: "Development file mount"
      contains: "lawn_care_pro symlink"
  key_links:
    - from: "frappe_docker/workspace/lawn_care_pro"
      to: "frappe_docker/docker-compose.dev.yaml dev service"
      via: "volume mount ./workspace:/workspace"
      pattern: "workspace:/workspace"
    - from: "frappe_docker/.env"
      to: "frappe_docker/docker-compose.dev.yaml"
      via: "env_file"
      pattern: "env_file.*\\.env"
---

<objective>
Set up a complete Docker-based development environment for the LawnCare Pro Frappe application with MariaDB, Redis, Frappe bench, workers, and a development container with bench CLI.
</objective>

<context>
@frappe_docker/docker-compose.dev.yaml
@frappe_docker/.env
@frappe_docker/scripts/setup.sh
@frappe_docker/README-dev.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create docker-compose.dev.yaml</name>
  <files>frappe_docker/docker-compose.dev.yaml</files>
  <action>
    Created development compose file with:
    - MariaDB service (db) with healthcheck and persistent volume
    - Redis cache and queue services with persistent volumes
    - Backend, frontend (nginx), websocket services
    - Queue workers (short, long) and scheduler
    - Development container (dev) with bench CLI and tty
    - Volume mounts for sites, logs, and workspace
  </action>
  <verify>
    <automated>docker compose -f frappe_docker/docker-compose.dev.yaml config --quiet</automated>
  </verify>
  <done>Compose file is valid and defines all required services</done>
</task>

<task type="auto">
  <name>Task 2: Create environment configuration</name>
  <files>frappe_docker/.env</files>
  <action>
    Created .env file with:
    - ERPNEXT_VERSION=v16.8.2
    - DB_PASSWORD=admin
    - DB_HOST=db, DB_PORT=3306
    - REDIS_CACHE and REDIS_QUEUE configuration
    - HTTP_PORT=8080
    - Site name header configuration
  </action>
  <verify>
    <automated>test -f frappe_docker/.env && grep -q "ERPNEXT_VERSION" frappe_docker/.env</automated>
  </verify>
  <done>Environment file exists with required variables</done>
</task>

<task type="auto">
  <name>Task 3: Create setup scripts</name>
  <files>
    frappe_docker/scripts/setup.sh
    frappe_docker/scripts/create-site.sh
    frappe_docker/scripts/install-app.sh
  </files>
  <action>
    Created three executable scripts:
    - setup.sh: Complete automated first-time setup (starts services, creates site, installs app)
    - create-site.sh: Creates new Frappe site with erpnext
    - install-app.sh: Gets and installs lawn_care_pro app
  </action>
  <verify>
    <automated>test -x frappe_docker/scripts/setup.sh && test -x frappe_docker/scripts/create-site.sh && test -x frappe_docker/scripts/install-app.sh</automated>
  </verify>
  <done>All scripts are executable</done>
</task>

<task type="auto">
  <name>Task 4: Create workspace and symlink</name>
  <files>frappe_docker/workspace/</files>
  <action>
    Created workspace directory with symlink to lawn_care_pro app at ../lawn_care_pro, allowing live mounting of development files
  </action>
  <verify>
    <automated>test -L frappe_docker/workspace/lawn_care_pro && test -e frappe_docker/workspace/lawn_care_pro</automated>
  </verify>
  <done>Workspace symlink points to app source</done>
</task>

<task type="auto">
  <name>Task 5: Create documentation</name>
  <files>frappe_docker/README-dev.md</files>
  <action>
    Created comprehensive README with:
    - Directory structure
    - Quick start instructions
    - Service descriptions
    - Development workflow
    - Troubleshooting guide
  </action>
  <verify>
    <automated>test -f frappe_docker/README-dev.md && grep -q "Quick Start" frappe_docker/README-dev.md</automated>
  </verify>
  <done>Documentation exists with quick start guide</done>
</task>

</tasks>

<verification>
# Success Criteria Verification

1. **Docker Compose starts all services**
   - Compose file defines: db, redis-cache, redis-queue, backend, frontend, websocket, queue-short, queue-long, scheduler, configurator, dev
   - All services use appropriate images and configurations

2. **Bench CLI is accessible in development container**
   - Dev container uses frappe/erpnext image with bench CLI
   - Container has tty and stdin_open for interactive access
   - Can run: docker compose -f frappe_docker/docker-compose.dev.yaml exec dev bench --version

3. **New site can be created and app installed via script**
   - scripts/create-site.sh creates site with erpnext
   - scripts/install-app.sh gets and installs lawn_care_pro
   - scripts/setup.sh automates full setup

4. **Development files mount live**
   - Workspace directory mounted to /workspace in dev container
   - Sites volume mounted for live development
   - Changes in lawn_care_pro symlink reflect in container

5. **Database persists between restarts**
   - db-data volume defined and used by MariaDB
   - redis-queue-data volume defined for Redis persistence
   - Using named volumes (not anonymous), data survives restart
</verification>

<success_criteria>
Phase 1 complete when:
- [x] docker-compose.dev.yaml defines all required services
- [x] Dev container has bench CLI accessible
- [x] Scripts exist for site creation and app installation
- [x] Development files can be mounted live
- [x] Database volumes persist between restarts
- [ ] Docker environment can be started and verified (requires user execution)
</success_criteria>

<output>
After completion, create `.planning/phases/01-docker-dev/01-docker-dev-SUMMARY.md`
</output>
