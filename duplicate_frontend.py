import os
import shutil

src_base = "c:/Users/godoy/Downloads/Inventario-Sindicato/frontend/src/modules"
dst_base = "c:/Users/godoy/Downloads/Inventario-Sindicato/frontend/src/modules/furniture"

folders = ['dashboard', 'inventory', 'maintenance', 'suppliers', 'reports']

endpoints = ['products', 'categories', 'departments', 'suppliers', 'maintenances']

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update API endpoints
    for ep in endpoints:
        content = content.replace(f"api.get('/{ep}", f"api.get('/furniture/{ep}")
        content = content.replace(f"api.post('/{ep}", f"api.post('/furniture/{ep}")
        content = content.replace(f"api.put('/{ep}", f"api.put('/furniture/{ep}")
        content = content.replace(f"api.delete('/{ep}", f"api.delete('/furniture/{ep}")
        content = content.replace(f"api.get(`/{ep}", f"api.get(`/furniture/{ep}")
        content = content.replace(f"api.post(`/{ep}", f"api.post(`/furniture/{ep}")
        content = content.replace(f"api.put(`/{ep}", f"api.put(`/furniture/{ep}")
        content = content.replace(f"api.delete(`/{ep}", f"api.delete(`/furniture/{ep}")

    # Update frontend routes (e.g. to="/products" -> to="/furniture/products")
    routes = ['/products', '/categories', '/departments', '/suppliers', '/maintenances', '/discarded', '/reports']
    for route in routes:
        content = content.replace(f"to=\"{route}", f"to=\"/furniture{route}")
        content = content.replace(f"to=`{route}", f"to=`/furniture{route}")
        content = content.replace(f"navigate('{route}", f"navigate('/furniture{route}")
        content = content.replace(f"navigate(\"{route}", f"navigate(\"/furniture{route}")
        content = content.replace(f"navigate(`{route}", f"navigate(`/furniture{route}")
        # also for link to category inventory etc
        content = content.replace(f"to={{`{route}", f"to={{`/furniture{route}")

    # Update absolute imports
    for folder in folders:
        content = content.replace(f"@/modules/{folder}/", f"@/modules/furniture/{folder}/")

    # Update specific text fields
    content = content.replace("modelo:", "material:")
    content = content.replace(".modelo", ".material")
    content = content.replace("serie:", "dimensiones:")
    content = content.replace(".serie", ".dimensiones")
    content = content.replace("Modelo:", "Material:")
    content = content.replace("Serie:", "Dimensiones:")
    content = content.replace("Modelo", "Material")
    content = content.replace("Serie", "Dimensiones")
    
    # UI Texts
    content = content.replace("Equipos Tecnológicos", "Muebles")
    content = content.replace("Equipos", "Muebles")
    content = content.replace("equipos", "muebles")
    content = content.replace("Equipo", "Mueble")
    content = content.replace("equipo", "mueble")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

if not os.path.exists(dst_base):
    os.makedirs(dst_base)

for folder in folders:
    src_folder = os.path.join(src_base, folder)
    dst_folder = os.path.join(dst_base, folder)
    
    if os.path.exists(dst_folder):
        shutil.rmtree(dst_folder)
        
    shutil.copytree(src_folder, dst_folder)
    
    for root, dirs, files in os.walk(dst_folder):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                replace_in_file(os.path.join(root, file))

print("Furniture frontend modules duplicated and adapted.")
