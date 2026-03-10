---
phase: 02-route-optimization
plan: 02
type: execute
wave: 2
depends_on: [02-route-optimization-01]
files_modified:
  - lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.py
  - lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.js
  - lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.html
  - lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.json
autonomous: true
requirements: [ROUTE-03]
must_haves:
  truths:
    - "Route Map page (/route-map) loads and displays map"
    - "Map shows numbered green markers in route order"
    - "Dashed polyline connects stops in sequence"
    - "Clicking marker shows popup with job details"
  artifacts:
    - path: "lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.py"
      provides: "Server-side API to fetch route data"
      exports: "get_route_data"
    - path: "lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.js"
      provides: "Client-side Leaflet map rendering"
      exports: "render_map"
    - path: "lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.html"
      provides: "Map container HTML template"
    - path: "lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.json"
      provides: "Frappe Page DocType definition"
  key_links:
    - from: "route_map.js"
      to: "route_map.get_route_data"
      via: "frappe.call"
      pattern: "frappe\\.call.*get_route_data"
    - from: "route_map.js"
      to: "Leaflet CDN"
      via: "script tag"
      pattern: "leaflet"
---

<objective>
Create Route Map page with Leaflet visualization

Purpose: Display optimized route with numbered markers and polyline
Output: Complete page with server-side API and client-side map rendering
</objective>

<context>
@lawn_care_pro/lawn_care_pro/lawncarepro/doctype/job_schedule/job_schedule.json
@lawn_care_pro/lawn_care_pro/lawncarepro/doctype/property/property.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Route Map page Python controller</name>
  <files>lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.py</files>
  <action>
Create the Python controller for the Route Map page with a whitelist method:

1. Create directory: lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/
2. Create route_map.py with:
   - @frappe.whitelist() decorated get_route_data(date=None) function
   - If date not provided, use today's date
   - Query Job Schedule where:
     - scheduled_date = date
     - route_order is not null
     - route_order > 0
   - Join with Property to get lat/lng
   - Return list of: job_name, route_order, latitude, longitude, customer (from Property), property_name, status, scheduled_date

The response format should be:
[
  {
    "job_name": "JOB-001",
    "route_order": 1,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "customer": "John Smith",
    "property": "123 Main St",
    "status": "Scheduled",
    "scheduled_date": "2026-03-10"
  },
  ...
]
  </action>
  <verify>
    <automated>test -f lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.py</automated>
  </verify>
  <done>Python API returns route data sorted by route_order</done>
</task>

<task type="auto">
  <name>Task 2: Create Route Map page definition JSON</name>
  <files>lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.json</files>
  <action>
Create Frappe Page DocType definition:
- name: "route_map"
- module: "LawnCare Pro"
- title: "Route Map"
- base_template: "Web Page Template"
- content from route_map.html

This defines the page in Frappe's system.
  </action>
  <verify>
    <automated>test -f lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.json</automated>
  </verify>
  <done>Page DocType created</done>
</task>

<task type="auto">
  <name>Task 3: Create Route Map HTML template</name>
  <files>lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.html</files>
  <action>
Create HTML template with:
- Include Leaflet CSS from CDN (unpkg)
- Include Leaflet JS from CDN (unpkg)
- Include Font Awesome for marker icons
- Container div with id "route-map" (full height)
- Date filter input for selecting date
- Legend showing marker meanings

Structure:
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  #route-map { height: 600px; width: 100%; }
  .route-legend { padding: 10px; background: white; }
</style>
<div class="route-legend">
  <input type="date" id="route-date" value="{{ today }}">
  <button onclick="loadRoute()">Load Route</button>
</div>
<div id="route-map"></div>
```
  </action>
  <verify>
    <automated>test -f lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.html</automated>
  </verify>
  <done>HTML template with Leaflet CDN includes</done>
</task>

<task type="auto">
  <name>Task 4: Create Route Map JavaScript controller</name>
  <files>lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.js</files>
  <action>
Create JavaScript controller:

1. Initialize map on page load using frappe.router
2. Function loadRoute(date) that:
   - Calls frappe.call to route_map.get_route_data with date parameter
   - Clears existing markers and polylines
   - For each job in response (sorted by route_order):
     - Create green circle marker with route_order number
     - Add popup with job details (customer, property, status)
     - Add to polyline coordinates array
   - Draw polyline connecting all markers (dashed, blue)
   - Fit map bounds to show all markers
3. Handle empty response - show "No optimized routes for this date"
4. Handle errors - show frappe.throw or alert

Use custom marker icons:
- Green circle (L.circleMarker) with route number inside
- Color: #2ecc71 (green)
- Radius: 15px
- Text: route_order in white, bold
  </action>
  <verify>
    <automated>test -f lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.js</automated>
  </verify>
  <done>JavaScript renders markers and polyline</done>
</task>

</tasks>

<verification>
Verify:
- /route-map loads Leaflet map
- Markers display with route order numbers
- Popup shows job details on click
- Polyline connects markers in order
</verification>

<success_criteria>
- Route Map page accessible at /route-map
- Map shows numbered green markers
- Popup displays customer name, property address, status
- Dashed blue polyline connects stops
- Date filter changes displayed route
</success_criteria>

<output>
After completion, create `.planning/phases/02-route-optimization/02-route-optimization-02-SUMMARY.md`
</output>
