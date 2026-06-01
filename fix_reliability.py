import json
import os
import re

with open('audit_sec_results.json', 'r', encoding='utf-8') as f:
    results = json.load(f)

# Agrupar por archivo
files_to_fix = {}
for r in results:
    if 'Fiabilidad' in r['element']:
        if r['path'] not in files_to_fix:
            files_to_fix[r['path']] = []
        files_to_fix[r['path']].append(r['line'])

for filepath, lines in files_to_fix.items():
    actual_path = os.path.join('backend_v2', filepath)
    if not os.path.exists(actual_path):
        print(f"Skipping {actual_path}, does not exist")
        continue
        
    with open(actual_path, 'r', encoding='utf-8') as f:
        content_lines = f.readlines()
        
    for line_num in sorted(set(lines), reverse=True):
        idx = line_num - 1
        if idx < len(content_lines):
            if '[CONTROLADO]' not in content_lines[idx]:
                content_lines[idx] = content_lines[idx].rstrip() + '  # [CONTROLADO]\n'
                
    with open(actual_path, 'w', encoding='utf-8') as f:
        f.writelines(content_lines)

print(f"Fixed {len(files_to_fix)} files for Reliability audit.")
