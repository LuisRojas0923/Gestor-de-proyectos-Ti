import json
r = json.load(open('audit_results.json', encoding='utf-8'))
for x in r:
    if x['tag'] in ['minor', 'important', 'critical']:
        print(f"{x['path']}:{x['line']} - {x['element']}")
