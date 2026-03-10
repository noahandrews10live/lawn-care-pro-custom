// -*- coding: utf-8 -*-
// Copyright (c) 2024 LawnCare Pro — MIT License
/**
 * Route Map Page JavaScript Controller
 * Renders Leaflet map with route markers and polylines
 */

frappe.pages.route_map.onload = function(wrapper) {
    var $wrapper = $(wrapper);
    
    // Set default date to today
    var today = frappe.datetime ? frappe.datetime.today() : new Date().toISOString().split('T')[0];
    $('#route-date').val(today);
    
    // Wait for Leaflet to be loaded (from HTML template)
    if (typeof L === 'undefined') {
        // Load Leaflet if not already loaded
        $('<link>').attr({
            rel: 'stylesheet',
            href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        }).appendTo('head');
        
        $.getScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', function() {
            initializeMap();
        });
    } else {
        initializeMap();
    }
};

function initializeMap() {
    // Default to NYC area
    var map = L.map('route-map').setView([40.7128, -74.0060], 10);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Store map reference globally
    window.routeMap = map;
    window.routeMarkers = [];
    window.routeMarkersById = {};
    window.routePolyline = null;
    
    // Load initial route
    loadRoute();
}

function loadRoute() {
    var date = $('#route-date').val() || frappe.datetime.today();
    
    frappe.call({
        method: 'lawn_care_pro.lawn_care_pro.lawncarepro.page.route_map.route_map.get_route_data',
        args: {
            date: date
        },
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                displayRoute(r.message);
            } else {
                frappe.show_alert({
                    message: __('No optimized routes for this date'),
                    indicator: 'orange'
                }, 3);
                clearRoute();
            }
        },
        error: function() {
            frappe.show_alert({
                message: __('Error loading route data'),
                indicator: 'red'
            }, 3);
        }
    });
}

function displayRoute(jobs) {
    clearRoute();
    
    var coords = [];
    
    jobs.forEach(function(job) {
        if (job.latitude && job.longitude) {
            var latLng = [job.latitude, job.longitude];
            coords.push(latLng);
            
            // Create green circle marker with number
            var circleMarker = L.circleMarker(latLng, {
                radius: 15,
                fillColor: '#2ecc71',
                color: '#27ae60',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(window.routeMap);
            
            // Add popup with job details
            circleMarker.bindPopup(
                '<strong>Stop #' + job.route_order + '</strong><br>' +
                '<b>Customer:</b> ' + (job.customer || 'Unknown') + '<br>' +
                '<b>Property:</b> ' + (job.property || 'Unknown') + '<br>' +
                '<b>Status:</b> ' + (job.status || 'Scheduled') + '<br>' +
                '<b>Job:</b> ' + job.job_name
            );
            
            // Add number label using DivIcon
            var numberIcon = L.divIcon({
                className: 'route-number-icon',
                html: '<div class="route-number">' + job.route_order + '</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            L.marker(latLng, {icon: numberIcon}).addTo(window.routeMap);
            
            window.routeMarkers.push(circleMarker);
            window.routeMarkersById[job.job_name] = circleMarker;
        }
    });
    
    // Draw dashed polyline connecting all stops
    if (coords.length > 1) {
        window.routePolyline = L.polyline(coords, {
            color: '#3498db',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10',
            lineJoin: 'round'
        }).addTo(window.routeMap);
        
        // Fit bounds to show all markers
        window.routeMap.fitBounds(window.routePolyline.getBounds(), {
            padding: [50, 50]
        });
    } else if (coords.length === 1) {
        window.routeMap.setView(coords[0], 15);
    }
}

function clearRoute() {
    // Remove all markers
    window.routeMarkers.forEach(function(marker) {
        if (marker) {
            window.routeMap.removeLayer(marker);
        }
    });
    window.routeMarkers = [];
    window.routeMarkersById = {};
    
    // Remove number label markers
    window.routeMap.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            window.routeMap.removeLayer(layer);
        }
    });
    
    // Re-add the tile layer if needed
    window.routeMap.eachLayer(function(layer) {
        if (!(layer instanceof L.TileLayer)) {
            window.routeMap.removeLayer(layer);
        }
    });
    
    // Re-add tiles if they were removed
    if (!window.routeMap.hasLayer(window.routeMap._layers[Object.keys(window.routeMap._layers)[0]])) {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(window.routeMap);
    }
    
    // Remove polyline
    if (window.routePolyline) {
        window.routeMap.removeLayer(window.routePolyline);
        window.routePolyline = null;
    }
}
