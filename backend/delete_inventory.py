import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventory_api.settings')
django.setup()

from api.models import Product, MaintenanceLog

print(f"Borrando {MaintenanceLog.objects.count()} mantenimientos...")
MaintenanceLog.objects.all().delete()

print(f"Borrando {Product.objects.count()} productos...")
Product.objects.all().delete()

print("¡Inventario borrado con éxito! Los usuarios y roles se mantienen intactos.")
