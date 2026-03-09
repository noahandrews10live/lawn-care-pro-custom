import frappe
from frappe.model.document import Document

class Property(Document):
    def validate(self):
        if self.customer:
            customer = frappe.get_doc("Customer", self.customer)
            if customer and customer.primary_address:
                address = frappe.get_doc("Address", customer.primary_address)
                if not self.address:
                    self.address = address.address_title + "\n" + address.address_line1 + "\n" + address.city + ", " + address.state + " " + address.pincode
