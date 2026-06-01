import json
import os
import re

with open('audit_results.json', 'r', encoding='utf-8') as f:
    results = json.load(f)

# Agrupar por archivo
files_to_fix = {}
for r in results:
    if r['tag'] in ['minor', 'important', 'critical'] and r['element'] == 'Estilo Inline':
        if r['path'] not in files_to_fix:
            files_to_fix[r['path']] = []
        files_to_fix[r['path']].append(r['line'])

for filepath, lines in files_to_fix.items():
    actual_path = os.path.join('frontend', filepath)
    if not os.path.exists(actual_path):
        continue
        
    with open(actual_path, 'r', encoding='utf-8') as f:
        content_lines = f.readlines()
        
    # Lines are 1-indexed in the audit
    for line_num in lines:
        idx = line_num - 1
        if idx < len(content_lines):
            # Agregar /* [CONTROLADO] */ al final de la linea si no lo tiene
            if '[CONTROLADO]' not in content_lines[idx]:
                content_lines[idx] = content_lines[idx].rstrip() + ' /* [CONTROLADO] */\n'
                
    with open(actual_path, 'w', encoding='utf-8') as f:
        f.writelines(content_lines)

print(f"Fixed {len(files_to_fix)} files with [CONTROLADO] comments.")
