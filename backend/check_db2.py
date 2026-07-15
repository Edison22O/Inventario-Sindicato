import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventory_api.settings')
django.setup()

from api.models import Product

products = Product.objects.exclude(image='').exclude(image__isnull=True).values('id', 'codigo', 'image')[:10]
print("FOUND IMAGES IN DB:")
for p in products:
    print(p)
