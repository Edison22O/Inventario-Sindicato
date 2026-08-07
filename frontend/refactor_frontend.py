import os
import re

frontend_dir = r"c:\Users\godoy\Downloads\Inventario-Sindicato\frontend\src\modules"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace occurrences like:
    # `/categories/${cat.id}` -> `/categories/${cat.public_id}`
    # `/products/${selectedProduct.id}/` -> `/products/${selectedProduct.public_id}/`
    # `?vehicle=${vehicle.id}` -> `?vehicle=${vehicle.public_id}`
    # `?product=${product.id}` -> `?product=${product.public_id}`
    # `/vehicles/drivers/${driver.id}` -> `/vehicles/drivers/${driver.public_id}`
    # `value={d.id}` -> wait, if it's a <select> value used for foreign keys, it should still be the integer ID! 
    #   Because foreign keys in POST/PUT expect the integer ID (unless we also changed Primary Key).
    #   Since we only added `public_id` and changed `lookup_field`, DRF still expects integer IDs for ForeignKeys like `department_id=1`.
    #   So we MUST NOT change `<option value={d.id}>`. We only change URLs!
    
    # regex for string templates inside backticks that contain .id
    # e.g. `/vehicles/${vehicle.id}` -> `/vehicles/${vehicle.public_id}`
    
    modified = False
    
    # We can specifically target known API and Route endpoints
    # endpoints: categories, departments, products, suppliers, vehicles, vehicle-trips, vehicle-maintenances, vehicle-maintenance-records, driver-profiles, etc.
    # basically any `${<word>.id}` inside a backtick string
    
    def repl(m):
        full_match = m.group(0)
        var_name = m.group(1)
        # Avoid replacing if it's not a known entity that got a public_id
        # We gave public_id to: Category, Department, Product, Supplier, Vehicle, DriverProfile
        # and their furniture counterparts.
        return full_match.replace(f"{var_name}.id", f"{var_name}.public_id")

    # Match patterns like: `/something/${var.id}` or `?something=${var.id}`
    # We look for backticks containing ${var.id}
    pattern = re.compile(r'`[^`]*\$\{([a-zA-Z0-9_]+)\.id\}[^`]*`')
    
    new_content = pattern.sub(repl, content)
    
    # Also look for `navigate('/vehicles/' + vehicle.id)` or similar if any (rare in this codebase, mostly uses backticks)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {os.path.basename(filepath)}")

for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
