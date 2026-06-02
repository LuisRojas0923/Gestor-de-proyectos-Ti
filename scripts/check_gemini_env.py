from pathlib import Path
import os
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[1] / ".env"
for name in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
    found = False
    for line in env_path.read_text(encoding="utf-8-sig").splitlines():
        if line.strip().startswith(name + "="):
            val = line.split("=", 1)[1].strip().strip('"').strip("'")
            preview = val[:7] + "..." if len(val) > 7 else "(vacío o muy corto)"
            print(f"{name} en .env: len={len(val)} preview={preview}")
            found = True
            break
    if not found:
        print(f"{name} en .env: NO ENCONTRADA")

load_dotenv(env_path, override=False)
for name in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
    val = os.environ.get(name, "")
    print(f"os.environ {name}: len={len(val)}")

from graphify.llm import detect_backend, _get_backend_api_key

backend = detect_backend()
key = _get_backend_api_key(backend) if backend else ""
print(f"graphify backend: {backend}")
print(f"clave activa len: {len(key or '')}")
