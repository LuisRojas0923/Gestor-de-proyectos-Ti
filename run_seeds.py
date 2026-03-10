import subprocess
import os

def run_command(cmd):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
    return result.returncode

print("Checking docker version...")
run_command("docker --version")

print("\nChecking running containers...")
run_command("docker ps")

print("\nRunning SQL seed...")
cp_cmd = "docker cp INICIALIZAR_DATOS_SISTEMA.sql gestor-de-proyectos-ti-db:/tmp/"
run_cmd = "docker exec gestor-de-proyectos-ti-db psql -U user -d project_manager -f /tmp/INICIALIZAR_DATOS_SISTEMA.sql"

if run_command(cp_cmd) == 0:
    run_command(run_cmd)
else:
    print("Failed to copy SQL file. Trying with WSL sync...")
    # Add WSL sync logic if needed
