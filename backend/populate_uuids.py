import os
import django
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventory_api.settings')
django.setup()

from api.models.core import DriverProfile
from api.models.inventory import Category, Department, Product
from api.models.furniture import FurnitureCategory, FurnitureDepartment, FurnitureProduct, FurnitureSupplier
from api.models.suppliers import Supplier
from api.models.vehicles import Vehicle

models_list = [
    DriverProfile, Category, Department, Product,
    FurnitureCategory, FurnitureDepartment, FurnitureProduct, FurnitureSupplier,
    Supplier, Vehicle
]

for model in models_list:
    objects = model.objects.all()
    count = 0
    for obj in objects:
        obj.public_id = uuid.uuid4()
        obj.save()
        count += 1
    print(f"Updated {count} {model.__name__} objects.")

print("Finished populating UUIDs")
