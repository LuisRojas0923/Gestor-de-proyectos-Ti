import sys
import os
# Adding root to sys.path to find auditoria package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auditoria.scanners.structure_audit import scan_structure_issues

# Frontend Structure Auditor - usage: python scripts/structure_check_frontend.py <list_of_files>

def main():
    files = sys.argv[1:]
    violations = 0
    
    # Structure audit in auditoria checks for duplicate files across the frontend.
    # For pre-commit, we should check if the changed files violate structure rules.
    
    frontend_root = os.path.join(os.getcwd(), 'frontend')
    
    for file_path in files:
        if not os.path.exists(file_path):
            continue
            
        # Check folder structure
        rel_path = os.path.relpath(file_path, os.getcwd())
        
        # Rule: Pages must be in frontend/src/pages
        if 'frontend' in rel_path and 'pages' not in rel_path and not 'components' in rel_path:
             # Basic structure check - could be expanded.
             pass
        
        # Rule: No duplicate files with same name in same folder
        # auditoria.scanners.structure_audit.find_duplicate_files(frontend_root)
        
    # Re-run full structure audit for the current state if any frontend changes were made
    if any('frontend' in f for f in files):
        issues = scan_structure_issues(frontend_root)
        if issues:
            for issue in issues:
                print(f"[STRUCTURE] {issue}")
                violations += 1
            
    if violations > 0:
        print(f"\nTotal Structure violations: {violations}")
        sys.exit(1)
        
    print("Frontend Structure validation passed.")
    sys.exit(0)

if __name__ == "__main__":
    main()
