# Route Optimization Feature — Design Doc

**Date:** 2026-03-09
**Status:** Approved

---

## Overview

Add route optimization to LawnCare Pro so dispatchers can reorder a day's Job Schedules
into the most efficient driving sequence without any external paid APIs.

---

## Decisions Made

| Question | Decision |
|---|---|
| Button scope | Selected rows in List View (user checks rows first) |
| Map location | Dedicated Frappe Page at `/route-map` |
| Algorithm | Nearest Neighbor (Haversine distance, pure Python) |
| Execution | Async via `frappe.enqueue` (background job) |
| Missing coords | Skip + log warning, continue with remaining jobs |

---

## Components

### 1. Route Optimizer Utility

**File:** `lawn_care_pro/lawn_care_pro/utils/route_optimizer.py`

- `optimize_route(job_schedule_names: list[str]) -> list[str]`
  - Fetches `property` from each Job Schedule
  - Joins to `latitude` / `longitude` from linked Property
  - Skips jobs missing coordinates (logs warning)
  - Runs Nearest Neighbor: start from first job (alphabetically), greedily pick closest unvisited using Haversine
  - Writes `route_order` (1-based int) back to each Job Schedule via `frappe.db.set_value`
  - Returns ordered list of job names

- `enqueue_route_optimization(job_schedule_names: str)` _(whitelisted)_
  - Accepts JSON string from client
  - Calls `frappe.enqueue(optimize_route, ...)`
  - Returns immediately with `{"status": "queued"}`

### 2. List View Button (Client Script)

**Mechanism:** Frappe Client Script DocType record (no separate JS file)
**DocType:** Job Schedule, view: List

Behavior:
- Adds "Optimize Route" button to the list toolbar
- On click: validates ≥ 2 rows selected, calls `frappe.call` → `enqueue_route_optimization`
- Shows success toast: "Route optimization queued. Refresh in a moment."
- Shows error alert if < 2 rows selected

### 3. Route Map Page

**Files:**
- `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.json` — Page definition
- `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.py` — Python controller (`get_route_data`)
- `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.html` — Leaflet map template
- `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.js` — Page JS (fetches data, renders map)

URL: `/route-map` (optional `?date=YYYY-MM-DD`)

Behavior:
- Python `get_route_data(date=None)` (whitelisted) returns JSON: list of `{job_name, route_order, lat, lng, customer, property, status}`
- JS loads Leaflet from CDN, renders numbered markers sorted by `route_order`, draws polyline
- Date filter input on page allows changing the view without navigating away

### 4. Owner Instructions

Delivered as a section in `docs/ROUTE_OPTIMIZATION.md`.

---

## Data Flow

```
User selects Job Schedule rows in list view
  → clicks "Optimize Route"
  → frappe.call → enqueue_route_optimization(names)
  → frappe.enqueue → optimize_route(names) [background worker]
    → fetch lat/lng per job
    → nearest-neighbor sort
    → db.set_value route_order on each record
User navigates to /route-map?date=today
  → JS calls get_route_data(date)
  → Python queries Job Schedules with route_order set
  → Leaflet renders numbered pins + polyline
```

---

## Out of Scope

- Real driving distance (Google Maps / OSRM) — Haversine straight-line is sufficient
- Auto-assignment of crews — route_order only
- Mobile-native map — Leaflet in browser is sufficient
