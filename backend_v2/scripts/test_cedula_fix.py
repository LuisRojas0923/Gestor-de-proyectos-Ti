def clean_cedula(val):
    s = str(val).strip()
    if s.endswith('.0'):
        s = s[:-2]
    return "".join(filter(str.isdigit, s))

test_cases = [
    ("14836440", "14836440"),
    (14836440.0, "14836440"),
    ("14836440.0", "14836440"),
    ("1143840049.0", "1143840049"),
]

for val, expected in test_cases:
    res = clean_cedula(val)
    print(f"Input: {repr(val)} -> Result: {repr(res)} | Expected: {repr(expected)}")
    assert res == expected, f"Failed for {val}"

print("All tests passed!")
