"""
Bot Docker Manager - Gestión de Docker y contenedores
=====================================================

Valida si Docker Engine está arriba; si no, inicia Docker Desktop y levanta
los contenedores usando docker compose.
"""

import os
import time
import json
import subprocess
from typing import List, Dict, Any, Callable, Optional


class DockerManager:
    """Gestor para validar e iniciar Docker y contenedores"""

    def __init__(self, project_root: str, logger: Callable[[str], None]):
        self.project_root = project_root
        self._log = logger

    # -------------------- Docker Engine --------------------
    def is_docker_running(self) -> bool:
        """Retorna True si el demonio de Docker está disponible."""
        try:
            completed = subprocess.run(
                ["docker", "info"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0,
            )
            return completed.returncode == 0
        except FileNotFoundError:
            return False
        except Exception:
            return False

    def start_docker_desktop(self) -> bool:
        """Intenta iniciar Docker Desktop en Windows, retorna True si lanzó el proceso."""
        possible_paths = [
            r"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe",
            r"C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe",
            os.path.expandvars(r"%UserProfile%\\AppData\\Local\\Docker\\Docker\\Docker Desktop.exe"),
        ]

        for exe_path in possible_paths:
            if exe_path and os.path.exists(exe_path):
                try:
                    self._log(f"🚀 Iniciando Docker Desktop: {exe_path}")
                    subprocess.Popen([exe_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    return True
                except Exception as e:
                    self._log(f"❌ No se pudo iniciar Docker Desktop: {e}")
        self._log("❌ No se encontró Docker Desktop. Verifique la instalación.")
        return False

    def wait_for_engine(self, timeout_seconds: int = 180, poll_interval: float = 3.0) -> bool:
        """Espera hasta que el engine esté listo o agote el tiempo."""
        self._log("⏳ Esperando a que Docker Engine esté listo...")
        start = time.time()
        while time.time() - start < timeout_seconds:
            if self.is_docker_running():
                self._log("✅ Docker Engine disponible")
                return True
            time.sleep(poll_interval)
        self._log("❌ Timeout esperando Docker Engine")
        return False

    # -------------------- Contenedores --------------------
    def list_containers(self, all_containers: bool = True) -> List[Dict[str, Any]]:
        """Lista contenedores vía docker ps (retorna lista de dicts)."""
        fmt = "{{json .}}"
        cmd = ["docker", "ps", "--format", fmt]
        if all_containers:
            cmd.insert(2, "-a")
        try:
            completed = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0,
            )
            lines = [l for l in completed.stdout.splitlines() if l.strip()]
            result: List[Dict[str, Any]] = []
            for line in lines:
                try:
                    result.append(json.loads(line))
                except Exception:
                    continue
            return result
        except Exception as e:
            self._log(f"❌ Error listando contenedores: {e}")
            return []

    def compose_up(self, services: Optional[List[str]] = None) -> bool:
        """Ejecuta docker compose up -d en el proyecto."""
        compose_file = os.path.join(self.project_root, "docker-compose.yml")
        if not os.path.exists(compose_file):
            self._log(f"❌ No existe docker-compose.yml en: {compose_file}")
            return False

        cmd = ["docker", "compose", "-f", compose_file, "up", "-d"]
        if services:
            cmd.extend(services)

        self._log("🐳 Ejecutando docker compose up -d ...")
        try:
            completed = subprocess.run(
                cmd,
                cwd=self.project_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                check=False,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0,
            )
            if completed.returncode == 0:
                self._log("✅ Contenedores levantados (compose up)")
                return True
            self._log(f"❌ Error en compose up: {completed.stdout}")
            return False
        except Exception as e:
            self._log(f"❌ Excepción en compose up: {e}")
            return False

    def ensure_containers_running(self, services: Optional[List[str]] = None) -> bool:
        """Valida Docker; si no está, intenta iniciar Desktop y espera; luego levanta contenedores."""
        if not self.is_docker_running():
            self._log("🐳 Docker Engine no disponible. Intentando iniciar Docker Desktop...")
            started = self.start_docker_desktop()
            if not started:
                return False
            if not self.wait_for_engine():
                return False

        # Engine arriba: levantar contenedores
        return self.compose_up(services)

    def compose_down(self, remove_volumes: bool = False) -> bool:
        """Ejecuta docker compose down (opcionalmente con -v)."""
        compose_file = os.path.join(self.project_root, "docker-compose.yml")
        if not os.path.exists(compose_file):
            self._log(f"❌ No existe docker-compose.yml en: {compose_file}")
            return False

        cmd = ["docker", "compose", "-f", compose_file, "down"]
        if remove_volumes:
            cmd.append("-v")

        self._log("🛑 Ejecutando docker compose down ...")
        try:
            completed = subprocess.run(
                cmd,
                cwd=self.project_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                check=False,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0,
            )
            if completed.returncode == 0:
                self._log("✅ Contenedores detenidos (compose down)")
                return True
            self._log(f"❌ Error en compose down: {completed.stdout}")
            return False
        except Exception as e:
            self._log(f"❌ Excepción en compose down: {e}")
            return False

    def compose_restart(self, services: Optional[List[str]] = None) -> bool:
        """Ejecuta docker compose restart para reiniciar contenedores."""
        compose_file = os.path.join(self.project_root, "docker-compose.yml")
        if not os.path.exists(compose_file):
            self._log(f"❌ No existe docker-compose.yml en: {compose_file}")
            return False

        cmd = ["docker", "compose", "-f", compose_file, "restart"]
        if services:
            cmd.extend(services)

        self._log("🔁 Ejecutando docker compose restart ...")
        try:
            completed = subprocess.run(
                cmd,
                cwd=self.project_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                check=False,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0,
            )
            if completed.returncode == 0:
                self._log("✅ Contenedores reiniciados (compose restart)")
                return True
            self._log(f"❌ Error en compose restart: {completed.stdout}")
            return False
        except Exception as e:
            self._log(f"❌ Excepción en compose restart: {e}")
            return False


