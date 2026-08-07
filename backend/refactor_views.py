import os
import re

base_dir = r"c:\Users\godoy\Downloads\Inventario-Sindicato\backend\api\views"

viewsets_to_update = [
    'CategoryViewSet', 'DepartmentViewSet', 'ProductViewSet',
    'FurnitureCategoryViewSet', 'FurnitureDepartmentViewSet', 'FurnitureProductViewSet', 'FurnitureSupplierViewSet',
    'SupplierViewSet', 'VehicleViewSet', 'DriverProfileViewSet'
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    modified = False

    # 1. Add lookup_field
    for vs in viewsets_to_update:
        if f'class {vs}' in content and 'lookup_field' not in content:
            # find class definition block
            pattern = r"(class\s+" + vs + r"\s*\(.*?\)\s*:[\s\S]*?(?=\nclass|\Z))"
            match = re.search(pattern, content)
            if match:
                class_body = match.group(1)
                # insert lookup_field = 'public_id' after permission_classes or similar
                if 'lookup_field = \'public_id\'' not in class_body:
                    new_body = re.sub(
                        r"(queryset\s*=\s*.*?$)",
                        r"\1\n    lookup_field = 'public_id'",
                        class_body,
                        flags=re.MULTILINE
                    )
                    content = content.replace(class_body, new_body)
                    modified = True

    # 2. Update get_queryset filters
    # product_id=product_id -> product__public_id=product_id
    if 'product_id=product_id' in content:
        content = content.replace('product_id=product_id', 'product__public_id=product_id')
        modified = True
    
    # vehicle_id=vehicle_id -> vehicle__public_id=vehicle_id
    if 'vehicle_id=vehicle_id' in content:
        content = content.replace('vehicle_id=vehicle_id', 'vehicle__public_id=vehicle_id')
        modified = True
        
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {os.path.basename(filepath)}")

for filename in os.listdir(base_dir):
    if filename.endswith('.py'):
        process_file(os.path.join(base_dir, filename))
