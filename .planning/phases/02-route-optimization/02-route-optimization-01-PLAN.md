---
phase: 02-route-optimization
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lawn_care_pro/lawn_care_pro/fixtures/client_script.json
autonomous: true
requirements: [ROUTE-02]
must_haves:
  truths:
    - "Job Schedule list view shows 'Optimize Route' button in toolbar"
    - "Selecting >= 2 jobs and clicking button queues optimization job"
    - "Toast notification confirms 'Route optimization queued'"
    - "After ~10 seconds, Route Order column updates with sequence"
  artifacts:
    - path: "lawn_care_pro/lawn_care_pro/fixtures/client_script.json"
      provides: "Job Schedule list view button integration"
      contains: "Optimize Route"
    - path: "lawn_care_pro/lawn_care_pro/public/js/job_schedule_list.js"
      provides: "Client-side JavaScript for list view button"
      exports: "frappe.ui.toolbar"
  key_links:
    - from: "job_schedule_list.js"
      to: "lawn_care_pro.lawn_care_pro.utils.route_optimizer.enqueue_route_optimization"
      via: "frappe.call"
      pattern: "frappe\\.call.*enqueue_route_optimization"
---

<objective>
Add "Optimize Route" button to Job Schedule list view and integrate with existing route_optimizer

Purpose: Allow dispatchers to select multiple job schedules and queue them for route optimization
Output: Client script that adds button to list toolbar and calls server-side API
</objective>

<context>
@lawn_care_pro/lawn_care_pro/utils/route_optimizer.py
@lawn_care_pro/lawn_care_pro/lawncarepro/doctype/job_schedule/job_schedule.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Client Script fixture for Job Schedule list view button</name>
  <files>lawn_care_pro/lawn_care_pro/fixtures/client_script.json</files>
  <action>
Create Client Script fixture in JSON format. The script should:
- Add "Optimize Route" button to Job Schedule list view toolbar
- On click, validate that >= 2 rows are selected
- Call frappe.call to enqueue_route_optimization with selected job names as JSON
- Show success toast: "Route optimization queued. Refresh in a moment."
- Show error alert if < 2 rows selected

Reference the existing enqueue_route_optimization whitelist function in route_optimizer.py.
The client script should be for DocType "Job Schedule", view "List".
  </action>
  <verify>
    <automated>python -c "import json; f=open('lawn_care_pro/lawn_care_pro/fixtures/client_script.json'); d=json.load(f); print('script' in d and 'Optimize Route' in d['script'])"</automated>
  </verify>
  <done>Client Script JSON fixture created with button logic</done>
</task>

<task type="auto">
  <name>Task 2: Create standalone JavaScript file for list view</name>
  <files>lawn_care_pro/lawn_care_pro/public/js/job_schedule_list.js</files>
  <action>
Create a JavaScript file that extends frappe.ui.toolbar.AppLauncher to add the "Optimize Route" button to the Job Schedule list view toolbar. This file will be loaded by the Client Script.

The JS should:
1. Hook into frappe.ui.toolbar or use list_view_actions event if available
2. Add "Optimize Route" button to the list toolbar
3. On click, get selected rows using cur_list.get_checked_items() or similar
4. Call frappe.call to /api/method/lawn_care_pro.lawn_care_pro.utils.route_optimizer.enqueue_route_optimization
5. Show frappe.show_alert for success/error

Note: Frappe list views typically use cur_list for row selection. Use frappe.ui.handler to register the action.
  </action>
  <verify>
    <automated>test -f lawn_care_pro/lawn_care_pro/public/js/job_schedule_list.js && echo "exists"</automated>
  </verify>
  <done>JavaScript file created with button click handler</done>
</task>

<task type="auto">
  <name>Task 3: Add web include to load the JavaScript</name>
  <files>lawn_care_pro/lawn_care_pro/lawncarepro/page/route_map/route_map.json</files>
  <action>
Create a web template or web page include to load the job_schedule_list.js file on Job Schedule list view. Alternatively, add the script path to hooks.py as desk_js or create a proper AppPlayer include.

The simplest approach for Frappe is to add a custom script via the Client Script DocType fixture that loads the external JS file.
  </action>
  <verify>
    <automated>grep -q "job_schedule_list" lawn_care_pro/lawn_care_pro/hooks.py 2>/dev/null || echo "Need to add include"</automated>
  </verify>
  <done>JavaScript is loaded when Job Schedule list view renders</done>
</task>

</tasks>

<verification>
Verify the button appears in the toolbar and calls the API correctly
</verification>

<success_criteria>
- Client Script fixture created for Job Schedule list view
- "Optimize Route" button appears in toolbar when viewing Job Schedule list
- Clicking button with >= 2 selected jobs calls enqueue_route_optimization
- Success toast shows "Route optimization queued"
- Error shows if < 2 jobs selected
</success_criteria>

<output>
After completion, create `.planning/phases/02-route-optimization/02-route-optimization-01-SUMMARY.md`
</output>
