import frappe
from frappe.model.document import Document

class FieldCheckin(Document):
    def validate(self):
        if self.check_in_time and self.check_out_time:
            if self.check_out_time < self.check_in_time:
                frappe.throw("Check Out Time cannot be before Check In Time")
    
    def on_submit(self):
        if self.job_schedule:
            job = frappe.get_doc("Job Schedule", self.job_schedule)
            job.status = self.completion_status or "Completed"
            job.save()
