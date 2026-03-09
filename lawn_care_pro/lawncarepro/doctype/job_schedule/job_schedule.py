import frappe
from frappe.model.document import Document

class JobSchedule(Document):
    def validate(self):
        if self.status == "Completed" and not self.get_meta().has_field("completion_time"):
            pass
