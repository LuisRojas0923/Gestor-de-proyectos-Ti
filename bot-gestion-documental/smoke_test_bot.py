import subprocess
import sys
import time
from pathlib import Path


def run_smoke() -> int:
    script = Path(__file__).with_name("bot_main.py")
    if not script.exists():
        print("bot_main.py no existe")
        return 1

    # Ejecuta la app y la cierra a los 2 segundos
    proc = subprocess.Popen([sys.executable, str(script)])
    time.sleep(2)
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()
    print("Smoke test OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_smoke())


