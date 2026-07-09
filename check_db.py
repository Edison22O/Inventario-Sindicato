import os
import django
import sys

sys.path.append(r'c:\Users\godoy\Downloads\Inventario-Sindicato\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventory_api.settings')
django.setup()

from api.models import Product

p = Product.objects.get(id=637)
print(f"Product ID: {p.id}")
print(f"Estado: '{p.estado}'")
print(f"Fecha: '{p.fecha_ultimo_mantenimiento}'")
