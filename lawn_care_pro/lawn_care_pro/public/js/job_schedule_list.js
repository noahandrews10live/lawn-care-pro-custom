// -*- coding: utf-8 -*-
// Copyright (c) 2024 LawnCare Pro — MIT License
/**
 * Job Schedule List View Customizations
 * Adds "Optimize Route" button to the toolbar
 * 
 * This file is loaded via desk_js in hooks.py
 */

frappe.listview_settings['Job Schedule'] = {
    onload: function(listview) {
        // Add custom button to the toolbar
        listview.page.add_action_item(__('Optimize Route'), function() {
            // Get selected job schedules
            var checked = listview.get_checked_items();
            
            if (checked.length < 2) {
                frappe.msgprint(__('Please select at least 2 Job Schedules to optimize the route.'));
                return;
            }
            
            // Extract job schedule names
            var job_names = checked.map(function(item) {
                return item.name;
            });
            
            // Call the server-side API
            frappe.call({
                method: 'lawn_care_pro.lawn_care_pro.utils.route_optimizer.enqueue_route_optimization',
                args: {
                    job_schedule_names: JSON.stringify(job_names)
                },
                callback: function(r) {
                    if (r.message.status === 'queued') {
                        frappe.show_alert({
                            message: __('Route optimization queued. Refresh in a moment.'),
                            indicator: 'green'
                        }, 5);
                        // Refresh the list after a delay
                        setTimeout(function() {
                            listview.refresh();
                        }, 10000);
                    }
                },
                error: function(r) {
                    frappe.msgprint(r.exc || __('An error occurred while queuing the route optimization.'));
                }
            });
        });
    }
};
