from setuptools import setup, find_packages

with open("lawn_care_pro/lawn_care_pro/requirements.txt") as f:
    install_requires = f.read().strip().split("\n")

# get version from __version__ variable in lawn_care_pro/__init__.py
from lawn_care_pro import __version__ as version

setup(
    name="lawn_care_pro",
    version=version,
    description="Lawn Care CRM - Property Management, Scheduling, Field Service",
    author="LawnCare Pro",
    author_email="support@lawncarepro.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=install_requires
)
