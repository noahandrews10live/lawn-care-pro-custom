app_version = "0.0.1"

app_name = "lawn_care_pro"
app_title = "LawnCare Pro"
app_publisher = "LawnCare Pro"
app_description = "Lawn Care CRM - Property Management, Scheduling, Field Service"
app_icon = "fa fa-leaf"
app_color = "#2ecc71"
app_email = "support@lawncarepro.com"
app_license = "MIT"

fixtures = [
    "Client Script"
]

# ---------------------------------------------------------------------------
# App Includes
# ---------------------------------------------------------------------------
# Load custom JavaScript on desk (admin interface)
desk_js = "/assets/lawn_care_pro/js/job_schedule_list.js"

# Page JavaScript
app_include_js = [
    "/assets/lawn_care_pro/lawncarepro/page/route_map/route_map.js"
]

# ---------------------------------------------------------------------------
# Scheduled Jobs
# ---------------------------------------------------------------------------
# Runs nightly at 02:00 server time (cron syntax, Frappe v14+).
# Creates Job Schedule records for the upcoming week from active Service Plans.
scheduler_events = {
    "cron": {
        "0 2 * * *": [
            "lawn_care_pro.lawn_care_pro.lawncarepro.scheduler.create_weekly_job_schedules"
        ]
    }
}

# ---------------------------------------------------------------------------
# Document Events
# ---------------------------------------------------------------------------
# before_save on Job Schedule is implemented directly in the DocType controller
# (JobSchedule.before_save in job_schedule.py) — no doc_events entry needed.
