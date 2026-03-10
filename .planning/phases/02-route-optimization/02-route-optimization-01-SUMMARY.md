---
phase: 02-route-optimization
plan: 01
subsystem: route-optimization
tags: [frappe, client-script, route-optimization]
dependency_graph:
  requires: []
  provides: [ROUTE-02]
  affects: [job-schedule-list-view, route-optimization]
tech_stack:
  added: [frappe-client-script, frappe-listview]
  patterns: [client-script-integration, listview-customization]
key_files:
  created:
    - lawn_care_pro/lawn_care_pro/fixtures/client_script.json
    - lawn_care_pro/lawn_care_pro/public/js/job_schedule_list.js
  modified:
    - lawn_care_pro/lawn_care_pro/hooks.py
decisions:
  - "Use Client Script DocType fixture for button integration"
  - "Use frappe.listview_settings for list view customization"
  - "Use frappe.call to invoke server-side enqueue_route_optimization"
---

# Phase 2 Plan 1 Summary: Job Schedule List View Button

## Objective

Add "Optimize Route" button to Job Schedule list view toolbar and integrate with existing route_optimizer.

## Tasks Completed

| Task | Name | Status |
|------|------|--------|
| 1 | Create Client Script fixture JSON | ✅ Complete |
| 2 | Create standalone JavaScript file | ✅ Complete |
| 3 | Add hooks for JS loading | ✅ Complete |

## Key Changes

### Client Script Fixture
- **File:** `lawn_care_pro/lawn_care_pro/fixtures/client_script.json`
- Uses Frappe's `frappe.listview_settings['Job Schedule']` to customize the list view
- Adds "Optimize Route" action item to the toolbar
- Validates >= 2 rows selected before calling API
- Shows success toast: "Route optimization queued. Refresh in a moment."
- Auto-refreshes list after 10 seconds

### JavaScript Loading
- **desk_js** in hooks.py loads `job_schedule_list.js` for desk interface
- Client Script fixture ensures the list view settings are applied

### Integration Points
- Calls `lawn_care_pro.lawn_care_pro.utils.route_optimizer.enqueue_route_optimization`
- Passes selected job names as JSON string
- Returns `{"status": "queued", "count": N}` on success

## Verification Results

✅ Client Script JSON fixture created successfully
✅ "Optimize Route" logic validates >= 2 selections
✅ Calls correct server-side method
✅ Shows success toast notification
✅ JS file created at `public/js/job_schedule_list.js`

## Notes

- The client script fixture can be imported via `bench get-app` or manually
- The existing `route_optimizer.enqueue_route_optimization` was already implemented (ROUTE-01)
- After the background job runs (~10 seconds), the route_order field updates
