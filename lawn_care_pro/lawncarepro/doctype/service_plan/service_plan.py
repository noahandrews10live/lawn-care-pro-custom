import frappe
from frappe.model.document import Document

class ServicePlan(Document):
    def validate(self):
        if self.start_date and self.end_date:
            if self.start_date > self.end_date:
                frappe.throw("Start Date cannot be after End Date")
