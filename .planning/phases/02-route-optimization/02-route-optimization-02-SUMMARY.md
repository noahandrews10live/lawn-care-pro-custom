---
phase: 02-route-optimization
plan: 02
subsystem: route-optimization
tags: [frappe, page, leaflet, map]
dependency_graph:
  requires: [02-route-optimization-01]
  provides: [ROUTE-03]
  affects: [route-map-page]
tech_stack:
  added: [frappe-page, leaflet, openstreetmap]
  patterns: [page-controller, map-visualization]
key_files:
  created:
    - lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.py
    - lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.json
    - lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.js
    - lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.html
  modified:
    - lawn_care_pro/lawn_care_pro/hooks.py
decisions:
  - "Use Frappe Page DocType for route map"
  - "Use Leaflet from CDN for map rendering"
  - "Use OpenStreetMap tiles (free, no API key)"
  - "Use green circle markers with route numbers"
  - "Use dashed blue polyline for route path"
---

# Phase 2 Plan 2 Summary: Route Map Page

## Objective

Create Route Map page with Leaflet visualization showing optimized route with numbered markers and polylines.

## Tasks Completed

| Task | Name | Status |
|------|------|--------|
| 1 | Create Route Map Python controller | ✅ Complete |
| 2 | Create Page DocType JSON | ✅ Complete |
| 3 | Create HTML template | ✅ Complete |
| 4 | Create JavaScript controller | ✅ Complete |

## Key Changes

### Python Controller
- **File:** `lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.py`
- `@frappe.whitelist()` decorated `get_route_data(date=None)` function
- Queries Job Schedules with route_order for the given date
- Joins with Property to get latitude/longitude
- Joins with Customer for display name
- Returns list of: job_name, route_order, lat, lng, customer, property, status, scheduled_date

### Page Definition
- **File:** `route_map.json` - Frappe Page DocType
- Title: "Route Map"
- Icon: "fa fa-map-marker"
- Uses app_include_js to load the route_map.js

### JavaScript Controller
- **File:** `route_map.js`
- Initializes Leaflet map on page load
- Fetches route data via `frappe.call` to `get_route_data`
- Creates green circle markers (L.circleMarker) with route numbers
- Uses L.divIcon for numbered labels
- Draws dashed blue polyline connecting all stops
- Popup shows: Stop #, Customer, Property, Status, Job Name

### HTML Template
- **File:** `route_map.html`
- Includes Leaflet CSS and JS from CDN
- Date input for filtering routes
- Legend showing marker and polyline meanings

### JavaScript Loading
- **app_include_js** in hooks.py loads route_map.js globally

## Data Flow

```
User navigates to /route-map
  → JS initializes Leaflet map
  → Calls get_route_data with today's date
  → Python queries Job Schedules with route_order
  → Returns: [{job_name, route_order, lat, lng, customer, property, status}]
  → JS renders green numbered markers + dashed polyline
  → Popup shows job details on click
```

## Verification Results

✅ Python API returns route data sorted by route_order
✅ Page DocType created
✅ Leaflet loaded from CDN
✅ Green markers with route numbers
✅ Dashed blue polyline connects stops
✅ Popup displays job details

## Notes

- OpenStreetMap tiles are free and don't require an API key
- Leaflet is lightweight and mobile-friendly
- The page is accessible at `/route-map` after app installation
- Optional `?date=YYYY-MM-DD` parameter can be added to pre-filter
