# -*- coding: utf-8 -*-
# Copyright (c) 2024 LawnCare Pro — MIT License
"""
Route Map Page Controller
=========================
Provides server-side API for route visualization.

URL: /route-map (optional ?date=YYYY-MM-DD)
"""

import frappe
from frappe import _


@frappe.whitelist()
def get_route_data(date=None):
    """
    Fetch Job Schedules with route_order for a given date.
    
    Args:
        date (str): Date in YYYY-MM-DD format. Defaults to today's date.
    
    Returns:
        list: List of job schedule data with route order and coordinates
    """
    if not date:
        date = frappe.utils.today()
    
    # Query Job Schedules with route_order set for the given date
    jobs = frappe.db.sql("""
        SELECT
            js.name as job_name,
            js.route_order,
            js.status,
            js.scheduled_date,
            js.property,
            p.latitude,
            p.longitude,
            p.name as property_name,
            c.name as customer_name,
            c.customer_name as customer_display
        FROM `tabJob Schedule` js
        LEFT JOIN `tabProperty` p ON js.property = p.name
        LEFT JOIN `tabCustomer` c ON p.customer = c.name
        WHERE js.scheduled_date = %(date)s
            AND js.route_order IS NOT NULL
            AND js.route_order > 0
            AND p.latitude IS NOT NULL
            AND p.longitude IS NOT NULL
        ORDER BY js.route_order ASC
    """, {"date": date}, as_dict=True)
    
    # Format response
    result = []
    for job in jobs:
        result.append({
            "job_name": job.job_name,
            "route_order": job.route_order,
            "latitude": float(job.latitude) if job.latitude else None,
            "longitude": float(job.longitude) if job.longitude else None,
            "customer": job.customer_display or job.customer_name or "Unknown",
            "property": job.property_name or job.property or "Unknown",
            "status": job.status or "Scheduled",
            "scheduled_date": job.scheduled_date
        })
    
    return result
