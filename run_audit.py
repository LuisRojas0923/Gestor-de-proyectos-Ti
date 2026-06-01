import sys
import json
import os
sys.path.insert(0, '.')
from auditoria.scanners.design_audit import scan_design_issues

root_dir = os.path.join(os.getcwd(), 'frontend')
results = scan_design_issues(root_dir)

with open('audit_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
