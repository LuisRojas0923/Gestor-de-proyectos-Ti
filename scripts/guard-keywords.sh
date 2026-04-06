#!/bin/bash

# Clean Room Guardian - Detect sensitive keywords in staged files
# usage: bash scripts/guard-keywords.sh <list_of_files>

# Keywords to detect
KEYWORDS=("password" "api_key" "secret_key" "private_key" "access_token" "hardcoded_ip" "192.168." "10.0.")

VIOLATIONS=0

for file in "$@"; do
    # Skip binary files
    if [[ -f "$file" && ! -z $(file "$file" | grep text) ]]; then
        for keyword in "${KEYWORDS[@]}"; do
            if grep -qi "$keyword" "$file"; then
                echo "ERROR: Sensitive keyword '$keyword' found in $file"
                VIOLATIONS=$((VIOLATIONS + 1))
            fi
        done
    fi
done

if [ $VIOLATIONS -gt 0 ]; then
    echo "Total violations: $VIOLATIONS. Please remove sensitive data before committing."
    exit 1
fi

exit 0
