import os
import shutil
import re

base_dir = r"c:\Users\godoy\Downloads\Inventario-Sindicato\frontend"
src_dir = os.path.join(base_dir, "src")

file_map = {
    # Auth
    "pages/Login.tsx": "modules/auth/pages/Login.tsx",
    "components/ProtectedRoute.tsx": "modules/auth/components/ProtectedRoute.tsx",
    
    # Inventory
    "pages/Products.tsx": "modules/inventory/pages/Products.tsx",
    "pages/DiscardedProducts.tsx": "modules/inventory/pages/DiscardedProducts.tsx",
    "pages/Departments.tsx": "modules/inventory/pages/Departments.tsx",
    "pages/Categories.tsx": "modules/inventory/pages/Categories.tsx",
    "pages/DepartmentInventory.tsx": "modules/inventory/pages/DepartmentInventory.tsx",
    "pages/CategoryInventory.tsx": "modules/inventory/pages/CategoryInventory.tsx",
    "components/ProductModal.tsx": "modules/inventory/components/ProductModal.tsx",
    "components/ProductViewModal.tsx": "modules/inventory/components/ProductViewModal.tsx",
    "components/DepartmentModal.tsx": "modules/inventory/components/DepartmentModal.tsx",
    "components/CategoryModal.tsx": "modules/inventory/components/CategoryModal.tsx",
    "utils/productPdfGenerator.ts": "modules/inventory/utils/productPdfGenerator.ts",
    "hooks/useInventoryWebSocket.ts": "modules/inventory/hooks/useInventoryWebSocket.ts",

    # Maintenance
    "pages/Maintenances.tsx": "modules/maintenance/pages/Maintenances.tsx",
    "components/MaintenanceModal.tsx": "modules/maintenance/components/MaintenanceModal.tsx",

    # Suppliers
    "pages/Suppliers.tsx": "modules/suppliers/pages/Suppliers.tsx",
    "components/SupplierModal.tsx": "modules/suppliers/components/SupplierModal.tsx",
    "components/SupplierViewModal.tsx": "modules/suppliers/components/SupplierViewModal.tsx",

    # Reports
    "pages/Reports.tsx": "modules/reports/pages/Reports.tsx",

    # Dashboard
    "pages/Dashboard.tsx": "modules/dashboard/pages/Dashboard.tsx",

    # Shared
    "components/Sidebar.tsx": "shared/components/Sidebar.tsx",
    "services/api.ts": "shared/services/api.ts",
    "utils/getImageUrl.ts": "shared/utils/getImageUrl.ts",
    "utils/pdfHelper.ts": "shared/utils/pdfHelper.ts",
    "types/index.ts": "shared/types/index.ts",
}

# 1. Move files
moved_files = []
for old_rel, new_rel in file_map.items():
    old_full = os.path.normpath(os.path.join(src_dir, old_rel))
    new_full = os.path.normpath(os.path.join(src_dir, new_rel))
    if os.path.exists(old_full):
        os.makedirs(os.path.dirname(new_full), exist_ok=True)
        shutil.move(old_full, new_full)
        moved_files.append(new_full)
        print(f"Moved {old_rel} to {new_rel}")

# Helper: new_rel path resolution without extension
def get_new_rel_path(old_rel):
    if old_rel in file_map:
        return file_map[old_rel]
    for k, v in file_map.items():
        if k.rsplit('.', 1)[0] == old_rel:
            return v.rsplit('.', 1)[0]
    return old_rel

# 2. Update imports
import_re = re.compile(r'(import\s+.*?from\s+[\'"])(.*?)([\'"])')
import_no_from_re = re.compile(r'(import\s+[\'"])(.*?)([\'"])')
dynamic_import_re = re.compile(r'(import\s*\(\s*[\'"])(.*?)([\'"]\s*\))')

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find old file path to resolve relative imports
    old_file_path = file_path
    for old, new_ in file_map.items():
        if os.path.normpath(os.path.join(src_dir, new_)) == os.path.normpath(file_path):
            old_file_path = os.path.normpath(os.path.join(src_dir, old))
            break
            
    old_file_dir = os.path.dirname(old_file_path)
    
    def replacer(match):
        prefix = match.group(1)
        import_path = match.group(2)
        suffix = match.group(3)
        
        if not import_path.startswith('.'):
            return match.group(0)
            
        # absolute imported path before move
        abs_import = os.path.normpath(os.path.join(old_file_dir, import_path))
        
        # relative to src_dir
        try:
            rel_to_src = os.path.relpath(abs_import, src_dir).replace('\\', '/')
        except ValueError:
            return match.group(0)
            
        if rel_to_src.startswith('..'):
            return match.group(0) # Not in src
            
        # check if it matches file map
        new_rel_to_src = get_new_rel_path(rel_to_src)
        
        # also handle cases where it imports a directory like '../components' which has an index.ts
        if new_rel_to_src == rel_to_src:
            # check if rel_to_src + "/index.ts" in file_map
            if rel_to_src + "/index.ts" in file_map:
                new_rel_to_src = file_map[rel_to_src + "/index.ts"].rsplit('/', 1)[0]
                
        return prefix + "@/" + new_rel_to_src + suffix

    new_content = import_re.sub(replacer, content)
    new_content = import_no_from_re.sub(replacer, new_content)
    new_content = dynamic_import_re.sub(replacer, new_content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated imports in {file_path}")

for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            process_file(os.path.join(root, f))

print("Done refactoring frontend imports.")
