# LawnCare Pro - Roadmap

## Phases

- [ ] **Phase 1: Docker Development Environment** - Set up local Docker environment for Frappe development
- [ ] **Phase 2: Route Optimization Completion** - Complete route map page and list view button
- [ ] **Phase 3: Data Model Enhancements** - Crew DocType, Field Checkin enhancements, Customer fields
- [ ] **Phase 4: Mobile Interface** - Field Tech Dashboard with offline support
- [ ] **Phase 5: Testing & Polish** - Unit tests and manual verification

## Phase Details

### Phase 1: Docker Development Environment

**Goal**: Local Frappe development environment running in Docker

**Depends on**: Nothing

**Requirements**: DOCKER-01, DOCKER-02

**Success Criteria** (what must be TRUE):
1. Docker Compose starts all services (MariaDB, Redis, Frappe bench, worker)
2. Bench CLI is accessible in development container
3. New site can be created and app installed via script
4. Development files mount live (changes reflect without rebuild)
5. Database persists between restarts

**Plans**: 1 plan

- [ ] 01-docker-dev-PLAN.md — Docker development environment setup

---

### Phase 2: Route Optimization Completion

**Goal**: Complete route optimization feature with map visualization and list view button

**Depends on**: Phase 1

**Requirements**: ROUTE-02, ROUTE-03

**Success Criteria** (what must be TRUE):
1. Job Schedule list view shows "Optimize Route" button in toolbar
2. Selecting >= 2 jobs and clicking button queues optimization job
3. Toast notification confirms "Route optimization queued"
4. After ~10 seconds, Route Order column updates with sequence
5. Route Map page (/route-map) loads and displays map
6. Map shows numbered green markers in route order
7. Dashed polyline connects stops in sequence
8. Clicking marker shows popup with job details

**Plans**: 2 plans

- [x] 02-route-optimization-01-PLAN.md — Job Schedule list view button
- [x] 02-route-optimization-02-PLAN.md — Route Map page with Leaflet

---

### Phase 3: Data Model Enhancements

**Goal**: Create Crew management and enhance existing DocTypes for mobile support

**Depends on**: Phase 2

**Requirements**: CREW-01, CREW-02, CREW-03, CHECKIN-01, CHECKIN-02, SMS-01

**Success Criteria** (what must be TRUE):
1. Crew DocType exists with crew_name, crew_leader, is_active fields
2. Crew Members child table allows adding multiple users to a crew
3. User form shows default_crew dropdown (custom field)
4. Job Schedule form shows assigned_crew as Link to Crew (not Data)
5. Field Checkin form supports multiple photos (JSON storage)
6. Field Checkin shows checkin_status (Pending/Completed)
7. Customer form shows send_sms_notifications checkbox
8. All new fields have proper permissions for LawnCare Pro User role

**Plans**: TBD

---

### Phase 4: Mobile Interface

**Goal**: Field Tech Dashboard page for mobile check-in/check-out workflow

**Depends on**: Phase 3

**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03, MOBILE-04, MOBILE-05, MOBILE-06, SMS-02

**Success Criteria** (what must be TRUE):
1. Field Tech Dashboard page loads at /app/field-tech-dashboard
2. Page displays today's jobs for user's assigned crew
3. Jobs show in route order with property address, customer name
4. User can tap "Check In" to record arrival time
5. User can upload multiple photos (compressed to <2MB each)
6. User can add notes and tap "Mark Complete"
7. Offline indicator shows when disconnected
8. Actions queue in IndexedDB when offline
9. Auto-sync triggers when connection restored
10. Completing job creates Communication record (SMS stub)
11. Page works on mobile (48px touch targets, responsive)

**Plans**: TBD

---

### Phase 5: Testing & Polish

**Goal**: Verify all components work correctly through automated and manual testing

**Depends on**: Phase 4

**Requirements**: TEST-01, TEST-02, TEST-03

**Success Criteria** (what must be TRUE):
1. Unit tests exist for Crew DocType operations
2. Unit tests exist for Field Tech API endpoints
3. JavaScript tests exist for offline sync logic
4. Page load time < 2 seconds
5. Photo compression < 1 second per photo
6. All manual smoke-test items pass:
   - Route optimization from list view
   - Route map displays correctly
   - Crew creation and assignment
   - Field tech check-in workflow
   - Photo upload and display
   - Offline sync on reconnect
   - SMS stub creates Communication

**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Docker Development Environment | 1/1 | Planned | - |
| 2. Route Optimization Completion | 2/2 | ✅ Complete | - |
| 3. Data Model Enhancements | 0/4 | Not started | - |
| 4. Mobile Interface | 0/6 | Not started | - |
| 5. Testing & Polish | 0/3 | Not started | - |

---

## Coverage

**Total Requirements**: 22
**Completed**: 5 (ROUTE-01, ROUTE-02, ROUTE-03, SCHED-01, SCHED-02)
**Pending**: 17
**Mapped to Phases**: 22/22 ✓

### Mapping

| Requirement | Phase |
|-------------|-------|
| DOCKER-01 | Phase 1 |
| DOCKER-02 | Phase 1 |
| ROUTE-02 | Phase 2 |
| ROUTE-03 | Phase 2 |
| CREW-01 | Phase 3 |
| CREW-02 | Phase 3 |
| CREW-03 | Phase 3 |
| CHECKIN-01 | Phase 3 |
| CHECKIN-02 | Phase 3 |
| SMS-01 | Phase 3 |
| MOBILE-01 | Phase 4 |
| MOBILE-02 | Phase 4 |
| MOBILE-03 | Phase 4 |
| MOBILE-04 | Phase 4 |
| MOBILE-05 | Phase 4 |
| MOBILE-06 | Phase 4 |
| SMS-02 | Phase 4 |
| TEST-01 | Phase 5 |
| TEST-02 | Phase 5 |
| TEST-03 | Phase 5 |

Note: ROUTE-01, SCHED-01, SCHED-02 already implemented (not in phase breakdown)
