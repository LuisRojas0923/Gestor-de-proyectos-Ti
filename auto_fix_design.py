import json
import os
import re

with open('audit_results.json', 'r', encoding='utf-8') as f:
    results = json.load(f)

# Agrupar por archivo
files_to_fix = {}
for r in results:
    if r['tag'] in ['minor', 'important', 'critical']:
        if r['path'] not in files_to_fix:
            files_to_fix[r['path']] = []
        files_to_fix[r['path']].append(r)

def calculate_import_path(filepath):
    # relative path from frontend/src/... to frontend/src/components/atoms
    # filepath is like frontend/src/pages/...
    parts = filepath.replace('\\', '/').split('/')
    depth = len(parts) - 3
    if depth <= 0:
        return './components/atoms'
    return '../' * depth + 'components/atoms'

count = 0
for filepath, issues in files_to_fix.items():
    actual_path = os.path.join('frontend', filepath)
    if not os.path.exists(actual_path):
        print(f"Skipping {actual_path}, does not exist")
        continue
        
    with open(actual_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original_content = content
    needed_imports = set()
    
    # Reemplazar componentes nativos
    for issue in issues:
        element = issue['element']
        if 'Nativo: <button>' in element:
            content = re.sub(r'<button(\s|>)', r'<Button\1', content)
            content = re.sub(r'</button>', r'</Button>', content)
            needed_imports.add('Button')
        elif 'Nativo: <span>' in element:
            content = re.sub(r'<span(\s|>)', r'<Text as="span"\1', content)
            content = re.sub(r'</span>', r'</Text>', content)
            needed_imports.add('Text')
        elif 'Nativo: <p>' in element:
            content = re.sub(r'<p(\s|>)', r'<Text as="p"\1', content)
            content = re.sub(r'</p>', r'</Text>', content)
            needed_imports.add('Text')
        elif 'Nativo: <label>' in element:
            content = re.sub(r'<label(\s|>)', r'<Text as="label"\1', content)
            content = re.sub(r'</label>', r'</Text>', content)
            needed_imports.add('Text')
        elif 'Nativo: <input>' in element:
            content = re.sub(r'<input(\s|>)', r'<Input\1', content)
            needed_imports.add('Input')
        elif 'Nativo: <select>' in element:
            content = re.sub(r'<select(\s|>)', r'<Select\1', content)
            content = re.sub(r'</select>', r'</Select>', content)
            needed_imports.add('Select')
        elif 'Nativo: <textarea>' in element:
            content = re.sub(r'<textarea(\s|>)', r'<Textarea\1', content)
            content = re.sub(r'</textarea>', r'</Textarea>', content)
            needed_imports.add('Textarea')
        elif 'Estilo Inline' in element:
            # Eliminar inline styles o dejarlos para arreglo manual
            # For now let's just let it be, but print a warning
            pass
            
    if content != original_content and needed_imports:
        import_path = calculate_import_path(actual_path)
        
        # Check if there is an existing import from components/atoms
        existing_import = re.search(r'import\s+{([^}]+)}\s+from\s+[\'"](.*components/atoms)[\'"]', content)
        if existing_import:
            existing_items = set([i.strip() for i in existing_import.group(1).split(',') if i.strip()])
            existing_items.update(needed_imports)
            new_import_str = f"import {{ {', '.join(sorted(existing_items))} }} from '{existing_import.group(2)}'"
            content = content[:existing_import.start()] + new_import_str + content[existing_import.end():]
        else:
            import_stmt = f"import {{ {', '.join(sorted(needed_imports))} }} from '{import_path}';\n"
            imports = list(re.finditer(r'^import .*;?$', content, flags=re.MULTILINE))
            if imports:
                last_import = imports[-1]
                content = content[:last_import.end()] + '\n' + import_stmt + content[last_import.end():]
            else:
                content = import_stmt + content
                
        with open(actual_path, 'w', encoding='utf-8') as f:
            f.write(content)
        count += 1

print(f"Fixed {count} files.")
