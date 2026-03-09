# Route Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a nearest-neighbor route optimizer to LawnCare Pro that reorders selected Job Schedules into the most efficient driving sequence and renders the result on a Leaflet map page.

**Architecture:** A pure-Python utility (`route_optimizer.py`) implements the Nearest Neighbor algorithm using Haversine distance; a whitelisted Frappe endpoint enqueues it as a background job; a Frappe Client Script adds the "Optimize Route" button to the Job Schedule list view; a Frappe Page at `/route-map` renders stops on a Leaflet map.

**Tech Stack:** Python 3.10+, Frappe v14+, Leaflet.js (CDN, no install), `frappe.enqueue` for async execution, `frappe.db.set_value` for writes.

---

## File Map (all paths relative to repo root)

| Role | Path |
|---|---|
| Optimizer + API | `lawn_care_pro/lawn_care_pro/utils/route_optimizer.py` |
| Utils `__init__` | `lawn_care_pro/lawn_care_pro/utils/__init__.py` |
| Unit tests | `lawn_care_pro/lawn_care_pro/tests/test_route_optimizer.py` |
| Page definition | `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.json` |
| Page controller | `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.py` |
| Page HTML | `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.html` |
| Page JS | `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.js` |
| Client Script fixture | `lawn_care_pro/lawn_care_pro/fixtures/client_script.json` |
| Owner instructions | `docs/ROUTE_OPTIMIZATION.md` |
| Hooks (modify) | `lawn_care_pro/lawn_care_pro/hooks.py` |

---

## Task 1: Haversine + Nearest Neighbor utility (pure Python, testable)

**Files:**
- Create: `lawn_care_pro/lawn_care_pro/utils/__init__.py`
- Create: `lawn_care_pro/lawn_care_pro/utils/route_optimizer.py`
- Create: `lawn_care_pro/lawn_care_pro/tests/__init__.py`
- Create: `lawn_care_pro/lawn_care_pro/tests/test_route_optimizer.py`

### Step 1: Create the utils package

```bash
mkdir -p lawn_care_pro/lawn_care_pro/utils
touch lawn_care_pro/lawn_care_pro/utils/__init__.py
mkdir -p lawn_care_pro/lawn_care_pro/tests
touch lawn_care_pro/lawn_care_pro/tests/__init__.py
```

### Step 2: Write the failing test

Create `lawn_care_pro/lawn_care_pro/tests/test_route_optimizer.py`:

```python
# -*- coding: utf-8 -*-
"""Tests for the route optimizer utility (pure-Python logic, no Frappe DB needed)."""

import math
import unittest
from unittest.mock import patch, MagicMock

# ---------------------------------------------------------------------------
# We import the module under test directly — Frappe is mocked where needed.
# ---------------------------------------------------------------------------
from lawn_care_pro.lawn_care_pro.utils.route_optimizer import (
    _haversine_km,
    _nearest_neighbor_sort,
)


class TestHaversine(unittest.TestCase):
    def test_same_point_is_zero(self):
        assert _haversine_km(0, 0, 0, 0) == 0.0

    def test_known_distance(self):
        # NYC (40.7128, -74.0060) → LA (34.0522, -118.2437) ≈ 3940 km
        km = _haversine_km(40.7128, -74.0060, 34.0522, -118.2437)
        assert 3900 < km < 4000, f"Expected ~3940 km, got {km:.1f}"

    def test_symmetry(self):
        a = _haversine_km(10, 20, 30, 40)
        b = _haversine_km(30, 40, 10, 20)
        assert math.isclose(a, b, rel_tol=1e-9)


class TestNearestNeighborSort(unittest.TestCase):
    def test_simple_linear_route(self):
        # Three points on a roughly straight north-south line.
        # Optimal from point 0: 0 → 1 → 2
        stops = [
            {"name": "A", "lat": 30.0, "lng": -90.0},
            {"name": "B", "lat": 31.0, "lng": -90.0},
            {"name": "C", "lat": 32.0, "lng": -90.0},
        ]
        result = _nearest_neighbor_sort(stops)
        assert [s["name"] for s in result] == ["A", "B", "C"]

    def test_single_stop_unchanged(self):
        stops = [{"name": "X", "lat": 10.0, "lng": 10.0}]
        result = _nearest_neighbor_sort(stops)
        assert [s["name"] for s in result] == ["X"]

    def test_empty_returns_empty(self):
        assert _nearest_neighbor_sort([]) == []

    def test_preserves_all_keys(self):
        stops = [
            {"name": "J1", "lat": 1.0, "lng": 1.0, "job": "job-001"},
            {"name": "J2", "lat": 2.0, "lng": 1.0, "job": "job-002"},
        ]
        result = _nearest_neighbor_sort(stops)
        assert all("job" in s for s in result)
```

### Step 3: Run the test — it must FAIL (module not found)

```bash
cd /workspaces/lawn-care-pro-custom
python -m pytest lawn_care_pro/lawn_care_pro/tests/test_route_optimizer.py -v 2>&1 | head -30
```

Expected: `ModuleNotFoundError` or `ImportError`.

### Step 4: Implement `route_optimizer.py`

Create `lawn_care_pro/lawn_care_pro/utils/route_optimizer.py`:

```python
# -*- coding: utf-8 -*-
# Copyright (c) 2024 LawnCare Pro — MIT License
"""
Route Optimization Utility
==========================
Implements a Nearest Neighbor TSP heuristic using Haversine distance.
No external APIs required — pure Python.

Public surface:
    optimize_route(job_schedule_names)   — called by background worker
    enqueue_route_optimization(...)      — whitelisted Frappe endpoint
"""

import json
import math

import frappe


# ---------------------------------------------------------------------------
# Pure-Python geometry helpers (no Frappe dependency — easy to unit-test)
# ---------------------------------------------------------------------------

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in kilometres between two lat/lng points."""
    R = 6371.0  # Earth radius km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _nearest_neighbor_sort(stops: list[dict]) -> list[dict]:
    """
    Given a list of dicts each containing at least {"lat": float, "lng": float},
    return a new list ordered by the Nearest Neighbor greedy heuristic.
    Starts from the first element (index 0) of the input list.
    """
    if len(stops) <= 1:
        return list(stops)

    unvisited = list(stops)
    ordered = [unvisited.pop(0)]  # start from first stop

    while unvisited:
        last = ordered[-1]
        nearest = min(
            unvisited,
            key=lambda s: _haversine_km(last["lat"], last["lng"], s["lat"], s["lng"]),
        )
        ordered.append(nearest)
        unvisited.remove(nearest)

    return ordered


# ---------------------------------------------------------------------------
# Frappe-aware functions
# ---------------------------------------------------------------------------

def optimize_route(job_schedule_names: list[str]) -> list[str]:
    """
    Fetch lat/lng for each Job Schedule, sort by Nearest Neighbor,
    and write route_order (1-based) back to each record.

    Jobs missing coordinates are skipped with a warning logged.
    Returns the ordered list of job schedule names.
    """
    stops = []

    for name in job_schedule_names:
        prop = frappe.db.get_value("Job Schedule", name, "property")
        if not prop:
            frappe.logger().warning(f"LawnCare Pro Route: Job {name!r} has no property — skipped.")
            continue

        coords = frappe.db.get_value("Property", prop, ["latitude", "longitude"], as_dict=True)
        if not coords or not coords.latitude or not coords.longitude:
            frappe.logger().warning(
                f"LawnCare Pro Route: Property {prop!r} has no coordinates — job {name!r} skipped."
            )
            continue

        try:
            stops.append({
                "name": name,
                "lat": float(coords.latitude),
                "lng": float(coords.longitude),
            })
        except (TypeError, ValueError):
            frappe.logger().warning(
                f"LawnCare Pro Route: Property {prop!r} has invalid coordinates — job {name!r} skipped."
            )

    if not stops:
        frappe.logger().warning("LawnCare Pro Route: No valid stops found; nothing to optimize.")
        return []

    ordered = _nearest_neighbor_sort(stops)

    for order, stop in enumerate(ordered, start=1):
        frappe.db.set_value("Job Schedule", stop["name"], "route_order", order)

    frappe.db.commit()
    return [s["name"] for s in ordered]


@frappe.whitelist()
def enqueue_route_optimization(job_schedule_names: str) -> dict:
    """
    Whitelisted endpoint called from the browser.
    Accepts a JSON-encoded list of Job Schedule names,
    enqueues optimize_route as a background job, and returns immediately.
    """
    names = json.loads(job_schedule_names) if isinstance(job_schedule_names, str) else job_schedule_names

    if not names or len(names) < 2:
        frappe.throw("Select at least 2 Job Schedules to optimize a route.")

    frappe.enqueue(
        "lawn_care_pro.lawn_care_pro.utils.route_optimizer.optimize_route",
        job_schedule_names=names,
        queue="short",
        timeout=300,
    )

    return {"status": "queued", "count": len(names)}
```

### Step 5: Run tests — must PASS

```bash
python -m pytest lawn_care_pro/lawn_care_pro/tests/test_route_optimizer.py -v
```

Expected output:
```
test_route_optimizer.py::TestHaversine::test_known_distance PASSED
test_route_optimizer.py::TestHaversine::test_same_point_is_zero PASSED
test_route_optimizer.py::TestHaversine::test_symmetry PASSED
test_route_optimizer.py::TestNearestNeighborSort::test_empty_returns_empty PASSED
test_route_optimizer.py::TestNearestNeighborSort::test_preserves_all_keys PASSED
test_route_optimizer.py::TestNearestNeighborSort::test_simple_linear_route PASSED
test_route_optimizer.py::TestNearestNeighborSort::test_single_stop_unchanged PASSED
7 passed
```

### Step 6: Commit

```bash
git add lawn_care_pro/lawn_care_pro/utils/ lawn_care_pro/lawn_care_pro/tests/
git commit -m "feat: add route optimizer utility with nearest-neighbor algorithm

Pure Python Haversine + greedy sort; whitelisted enqueue endpoint.
7 unit tests cover geometry helpers and sort logic.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Client Script fixture (List View button)

**Files:**
- Create: `lawn_care_pro/lawn_care_pro/fixtures/client_script.json`
- Modify: `lawn_care_pro/lawn_care_pro/hooks.py`

### Step 1: Create the fixtures directory

```bash
mkdir -p lawn_care_pro/lawn_care_pro/fixtures
```

### Step 2: Create `client_script.json`

Create `lawn_care_pro/lawn_care_pro/fixtures/client_script.json`:

```json
[
  {
    "doctype": "Client Script",
    "name": "Job Schedule List — Optimize Route",
    "dt": "Job Schedule",
    "view": "List",
    "enabled": 1,
    "script": "frappe.listview_settings['Job Schedule'] = frappe.listview_settings['Job Schedule'] || {};\n\nfrappe.listview_settings['Job Schedule'].onload = function(listview) {\n    listview.page.add_action_item(__('Optimize Route'), function() {\n        var selected = listview.get_checked_items(true);\n        if (!selected || selected.length < 2) {\n            frappe.msgprint({\n                title: __('Selection Required'),\n                message: __('Please select at least 2 Job Schedules to optimize a route.'),\n                indicator: 'orange'\n            });\n            return;\n        }\n\n        frappe.call({\n            method: 'lawn_care_pro.lawn_care_pro.utils.route_optimizer.enqueue_route_optimization',\n            args: {\n                job_schedule_names: JSON.stringify(selected)\n            },\n            callback: function(r) {\n                if (r.message && r.message.status === 'queued') {\n                    frappe.show_alert({\n                        message: __('Route optimization queued for {0} jobs. Refresh the list in a moment to see updated Route Order.', [r.message.count]),\n                        indicator: 'green'\n                    }, 7);\n                }\n            },\n            error: function(r) {\n                frappe.msgprint({\n                    title: __('Error'),\n                    message: __('Failed to queue route optimization. Check the Error Log.'),\n                    indicator: 'red'\n                });\n            }\n        });\n    });\n};"
  }
]
```

### Step 3: Register the fixture in `hooks.py`

Open `lawn_care_pro/lawn_care_pro/hooks.py` and change:

```python
fixtures = []
```

to:

```python
fixtures = [
    {
        "doctype": "Client Script",
        "filters": [["name", "=", "Job Schedule List — Optimize Route"]]
    }
]
```

### Step 4: Commit

```bash
git add lawn_care_pro/lawn_care_pro/fixtures/client_script.json lawn_care_pro/lawn_care_pro/hooks.py
git commit -m "feat: add Optimize Route button to Job Schedule list view

Client Script fixture adds toolbar action; validates ≥2 selected,
calls enqueue_route_optimization, shows success toast.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Route Map Frappe Page

**Files:**
- Create: `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.json`
- Create: `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.py`
- Create: `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.html`
- Create: `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.js`

### Step 1: Create the page directory

```bash
mkdir -p lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map
```

### Step 2: Create `route_map.json`

```json
{
  "doctype": "Page",
  "module": "LawnCare Pro",
  "name": "route-map",
  "page_name": "route-map",
  "title": "Route Map",
  "roles": [
    {"role": "LawnCare Pro User"}
  ]
}
```

### Step 3: Create `route_map.py`

```python
# -*- coding: utf-8 -*-
# Copyright (c) 2024 LawnCare Pro — MIT License
"""
Server-side controller for the Route Map page.
Provides get_route_data() as a whitelisted API consumed by route_map.js.
"""

import frappe


@frappe.whitelist()
def get_route_data(date: str | None = None) -> list[dict]:
    """
    Return a list of Job Schedule stops with coordinates and route order.
    Filters to non-cancelled jobs for `date` if provided, else returns all
    jobs that have a route_order set.

    Each item: {job_name, route_order, lat, lng, customer, property_name, status, scheduled_date}
    """
    filters = [
        ["Job Schedule", "status", "!=", "Cancelled"],
        ["Job Schedule", "route_order", ">", 0],
    ]
    if date:
        filters.append(["Job Schedule", "scheduled_date", "=", date])

    jobs = frappe.get_all(
        "Job Schedule",
        filters=filters,
        fields=["name", "property", "status", "scheduled_date", "route_order"],
        order_by="route_order asc",
    )

    result = []
    for job in jobs:
        prop = frappe.db.get_value(
            "Property",
            job.property,
            ["latitude", "longitude", "customer"],
            as_dict=True,
        )
        if not prop or not prop.latitude or not prop.longitude:
            continue
        try:
            result.append({
                "job_name": job.name,
                "route_order": job.route_order,
                "lat": float(prop.latitude),
                "lng": float(prop.longitude),
                "customer": prop.customer,
                "property_name": job.property,
                "status": job.status,
                "scheduled_date": str(job.scheduled_date),
            })
        except (TypeError, ValueError):
            continue

    return result
```

### Step 4: Create `route_map.html`

```html
<div class="route-map-container" style="display:flex; flex-direction:column; height:calc(100vh - 120px);">
  <div class="row" style="padding: 10px 0; flex-shrink:0;">
    <div class="col-sm-4">
      <div class="input-group">
        <span class="input-group-addon"><i class="fa fa-calendar"></i></span>
        <input type="date" id="route-date-filter" class="form-control"
               placeholder="Filter by date (optional)" />
        <span class="input-group-btn">
          <button class="btn btn-default" id="route-load-btn">Load Map</button>
        </span>
      </div>
    </div>
    <div class="col-sm-8">
      <p class="text-muted" id="route-status" style="line-height:34px; margin:0;">
        Enter a date and click Load Map, or leave blank to show all optimized routes.
      </p>
    </div>
  </div>
  <div id="route-map" style="flex:1; border-radius:6px; border:1px solid #d1d8dd;"></div>
</div>
```

### Step 5: Create `route_map.js`

```javascript
frappe.pages['route-map'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Route Map',
        single_column: true
    });

    // Inject Leaflet CSS + JS from CDN (loaded once)
    if (!window._leafletLoaded) {
        $('head').append('<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>');
        $.getScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', function() {
            window._leafletLoaded = true;
        });
    }

    $(frappe.render_template('route_map', {})).appendTo(page.body);

    var map = null;
    var markersLayer = null;
    var polylineLayer = null;

    function initMap() {
        if (map) return;
        map = L.map('route-map').setView([39.5, -98.35], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);
        polylineLayer = L.layerGroup().addTo(map);
    }

    function loadRouteData() {
        var date = $('#route-date-filter').val() || null;
        $('#route-status').text('Loading…');

        frappe.call({
            method: 'lawn_care_pro.lawn_care_pro.lawncarepro.page.route_map.route_map.get_route_data',
            args: { date: date },
            callback: function(r) {
                var stops = r.message || [];
                if (!stops.length) {
                    $('#route-status').text('No optimized routes found' + (date ? ' for ' + date : '') + '. Run "Optimize Route" from the Job Schedule list first.');
                    return;
                }
                renderMap(stops);
                $('#route-status').text(stops.length + ' stop(s) shown' + (date ? ' for ' + date : '') + '.');
            }
        });
    }

    function renderMap(stops) {
        initMap();
        markersLayer.clearLayers();
        polylineLayer.clearLayers();

        var latlngs = [];

        stops.forEach(function(stop) {
            var ll = [stop.lat, stop.lng];
            latlngs.push(ll);

            // Numbered marker using DivIcon
            var icon = L.divIcon({
                className: '',
                html: '<div style="background:#2ecc71;color:#fff;border-radius:50%;width:28px;height:28px;' +
                      'display:flex;align-items:center;justify-content:center;font-weight:bold;' +
                      'font-size:13px;border:2px solid #27ae60;box-shadow:0 1px 4px rgba(0,0,0,.4);">' +
                      stop.route_order + '</div>',
                iconSize: [28, 28],
                iconAnchor: [14, 14],
            });

            var statusColor = {
                'Scheduled': '#3498db',
                'In Progress': '#f39c12',
                'Completed': '#27ae60',
                'Cancelled': '#e74c3c'
            }[stop.status] || '#666';

            L.marker(ll, { icon: icon })
                .bindPopup(
                    '<b>Stop #' + stop.route_order + '</b><br>' +
                    '<b>Job:</b> ' + stop.job_name + '<br>' +
                    '<b>Customer:</b> ' + (stop.customer || '—') + '<br>' +
                    '<b>Property:</b> ' + stop.property_name + '<br>' +
                    '<b>Date:</b> ' + stop.scheduled_date + '<br>' +
                    '<b>Status:</b> <span style="color:' + statusColor + '">' + stop.status + '</span>'
                )
                .addTo(markersLayer);
        });

        // Draw route polyline
        if (latlngs.length > 1) {
            L.polyline(latlngs, { color: '#2ecc71', weight: 3, opacity: 0.7, dashArray: '8,6' })
                .addTo(polylineLayer);
        }

        // Fit map to markers
        map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    }

    // Wire up button + Enter key
    page.body.on('click', '#route-load-btn', loadRouteData);
    page.body.on('keydown', '#route-date-filter', function(e) {
        if (e.key === 'Enter') loadRouteData();
    });
};
```

### Step 6: Commit

```bash
git add lawn_care_pro/lawn_care_pro/lawncarepro/page/
git commit -m "feat: add Route Map Frappe page with Leaflet visualization

Whitelisted get_route_data() endpoint, date filter, numbered markers,
dashed polyline connecting stops in route_order sequence.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Owner Instructions doc

**Files:**
- Create: `docs/ROUTE_OPTIMIZATION.md`

Create `docs/ROUTE_OPTIMIZATION.md`:

```markdown
# Route Optimization — Owner Instructions

## What This Does

The Route Optimization feature reorders a set of Job Schedules into the most
efficient driving sequence using the **Nearest Neighbor** algorithm. It updates
the **Route Order** field on each job and displays the results on an interactive
map.

---

## How to Optimize a Route

1. Open **LawnCare Pro → Job Schedule** (the list view).
2. Filter the list to the date and/or crew you want to optimize (use the list
   filters in the top bar).
3. **Check the checkbox** next to each job you want to include (minimum 2).
4. Click the **"Optimize Route"** button that appears in the actions toolbar
   (three-dot menu or top bar depending on screen size).
5. A green toast will confirm: *"Route optimization queued for N jobs. Refresh
   the list in a moment."*
6. Wait 5–15 seconds, then refresh the list. The **Route Order** column will
   now show 1, 2, 3 … in the optimized sequence.

> **Note:** Jobs without latitude/longitude set on their Property are skipped
> silently. Check `Error Log` if a job's Route Order remains blank.

---

## How to View the Route Map

1. In the Frappe search bar (Ctrl+G), type **"Route Map"** and press Enter.
   Alternatively, navigate directly to `/route-map`.
2. Optionally enter a date in the **date filter** and click **Load Map**.
   Leave the field blank to show all jobs that have been optimized.
3. The map displays:
   - **Numbered green pins** — each stop in route order
   - **Dashed green polyline** — the driving path between stops
   - **Click any pin** — see job name, customer, property, date, and status

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Optimize Route" button not visible | Make sure ≥2 rows are checked |
| Route Order not updating after 30s | Check **Error Log** for background job failure |
| Pins missing on map | Set `latitude` + `longitude` on the Property record |
| Map shows wrong area | Verify coordinates are decimal degrees (e.g. `30.2672`, `-97.7431`) |
```

### Commit

```bash
git add docs/ROUTE_OPTIMIZATION.md
git commit -m "docs: add route optimization owner instructions

Covers: how to run optimizer, how to view map, troubleshooting table.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Smoke-test checklist (manual, post-deploy)

Since Frappe integration tests require a running instance, verify these manually
after `bench migrate` and `bench build`:

- [ ] Navigate to `/route-map` — page loads without JS errors
- [ ] In Job Schedule list, check 2+ rows → "Optimize Route" button is visible
- [ ] Click button with < 2 rows selected → orange warning dialog appears
- [ ] Click button with 2+ valid rows → green toast appears
- [ ] After ~10s, refresh list → Route Order column populated correctly
- [ ] Open Route Map, enter today's date → pins appear in numbered order
- [ ] Click a pin → popup shows correct customer / job / status

---

## Frappe Installation Notes

After pulling this code:

```bash
bench --site <site> migrate          # imports Page + Client Script fixtures
bench build                          # rebuilds frontend assets
bench restart                        # picks up new Python modules
```

The Client Script is loaded via the `fixtures` array in `hooks.py`; it will be
automatically imported on `bench migrate`.
