import sys
import os
# Adding root to sys.path to find auditoria package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Backend Architecture Enforcer - 500 lines limit and modularity
# usage: python scripts/enforce_architecture.py <list_of_files>

LIMIT = 500

def main():
    files = sys.argv[1:]
    violations = 0
    
    for file_path in files:
        if not os.path.exists(file_path):
            continue
            
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            line_count = len(lines)
            
            if line_count > LIMIT:
                print(f"ERROR: {file_path} exceeds the {LIMIT} lines limit ({line_count} lines).")
                print("       Please refactor by splitting responsibilities.")
                violations += 1
                
    if violations > 0:
        print(f"\nTotal architectural violations: {violations}")
        sys.exit(1)
        
    print("Architecture validation passed.")
    sys.exit(0)

if __name__ == "__main__":
    main()
