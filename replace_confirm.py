import os
import glob

frontend_dir = r"c:\Users\godoy\Downloads\Inventario-Sindicato\frontend\src"

files = glob.glob(os.path.join(frontend_dir, "**", "*.tsx"), recursive=True)

import_statement = "import { confirmDialog } from '@/shared/utils/confirmDialog';\n"

modified_count = 0

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'window.confirm(' in content:
        # replace window.confirm with await confirmDialog
        content = content.replace('window.confirm(', 'await confirmDialog(')
        
        # inject import after the last import statement or at the top
        lines = content.split('\n')
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import_idx = i
                
        if last_import_idx != -1:
            lines.insert(last_import_idx + 1, import_statement.strip())
        else:
            lines.insert(0, import_statement.strip())
            
        new_content = '\n'.join(lines)
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        modified_count += 1
        print(f"Updated {file}")

print(f"Total files updated: {modified_count}")
