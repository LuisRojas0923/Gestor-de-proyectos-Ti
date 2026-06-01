import json
import os
import sys

sys.path.insert(0, '.')
from auditoria.scanners.security_audit import scan_reliability_issues

root_dir = os.path.join(os.getcwd(), 'backend_v2')
results = scan_reliability_issues(root_dir)

with open('audit_sec_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
