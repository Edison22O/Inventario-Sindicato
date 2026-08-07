import os
import re

models_to_update = {
    'core.py': ['DriverProfile'],
    'inventory.py': ['Category', 'Department', 'Product'],
    'furniture.py': ['FurnitureCategory', 'FurnitureDepartment', 'FurnitureProduct', 'FurnitureSupplier'],
    'suppliers.py': ['Supplier'],
    'vehicles.py': ['Vehicle']
}

base_dir = r"c:\Users\godoy\Downloads\Inventario-Sindicato\backend\api\models"

def process_file(filename, classes):
    filepath = os.path.join(base_dir, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename}, not found.")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if 'import uuid' not in content:
        content = 'import uuid\n' + content
        
    for cls in classes:
        # regex to find class definition and insert public_id right after
        # class Vehicle(models.Model):
        pattern = r"(class\s+" + cls + r"\s*\(.*?\)\s*:\n)"
        replacement = r"\1    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)\n"
        content = re.sub(pattern, replacement, content)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filename}")

for filename, classes in models_to_update.items():
    process_file(filename, classes)
