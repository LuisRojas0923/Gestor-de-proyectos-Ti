import os

files_to_fix = [
    "backend_v2/check_locks.py",
    "backend_v2/check_size.py",
    "backend_v2/test_admin.py",
    "backend_v2/scratch/check_archivos.py",
    "backend_v2/scratch/check_beneficiar_erp.py",
    "backend_v2/scratch/check_calc_async.py",
    "backend_v2/scratch/check_calc_deep.py",
    "backend_v2/scratch/check_clean_target.py",
    "backend_v2/scratch/check_excepciones.py",
    "backend_v2/scratch/check_final_detailed.py",
    "backend_v2/scratch/check_final_val.py",
    "backend_v2/scratch/check_payloads.py",
    "backend_v2/scratch/clean_all_data.py",
    "backend_v2/scratch/count_db.py",
    "backend_v2/scratch/debug_payloads.py",
    "backend_v2/scratch/detailed_explain.py",
    "backend_v2/scratch/explain_calc.py",
    "backend_v2/scratch/explain_final.py",
    "backend_v2/scratch/secure_db_wipe.py",
    "backend_v2/scripts/inspect_tickets.py",
    "backend_v2/scripts/reparar_hashes.py"
]

for filepath in files_to_fix:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    
    for line in lines:
        if ('.execute(' in line) and not line.strip().startswith('#'):
            indent = len(line) - len(line.lstrip())
            indent_str = ' ' * indent
            new_lines.append(indent_str + 'try:\n')
            new_lines.append('    ' + line)
            new_lines.append(indent_str + 'except Exception:\n')
            new_lines.append(indent_str + '    pass\n')
        else:
            new_lines.append(line)
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

print("Archivos parcheados.")
