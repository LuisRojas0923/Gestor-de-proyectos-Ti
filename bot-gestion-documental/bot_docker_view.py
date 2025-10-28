"""
Bot Docker View - Vista para gestión de contenedores
====================================================

Permite validar si Docker está arriba, iniciar Docker Desktop y levantar
contenedores con docker compose.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import Toplevel, messagebox
from typing import List, Callable
from datetime import datetime
import os

from bot_docker_manager import DockerManager


class DockerView(Toplevel):
    """Vista para gestionar Docker y contenedores"""

    def __init__(self, master, project_root: str, logger: Callable[[str], None]):
        super().__init__(master)
        self.title("Gestión de Docker y Contenedores")
        self.geometry("900x600")
        self.transient(master)
        self.grab_set()

        self.project_root = project_root
        self._log = logger
        self.manager = DockerManager(project_root, logger)

        self._create_ui()

    def _create_ui(self) -> None:
        main = ttk.Frame(self, padding="10")
        main.pack(fill=BOTH, expand=True)

        title = ttk.Label(main, text="🐳 Gestión de Docker", font=("Arial", 16, "bold"))
        title.pack(anchor=W, pady=(0, 10))

        buttons = ttk.Frame(main)
        buttons.pack(fill=X, pady=(0, 10))

        ttk.Button(buttons, text="🔎 Validar Docker", bootstyle=INFO, command=self._check_docker).pack(side=LEFT, padx=(0, 6))
        ttk.Button(buttons, text="🚀 Iniciar Docker Desktop", bootstyle=SECONDARY, command=self._start_desktop).pack(side=LEFT, padx=(0, 6))
        ttk.Button(buttons, text="⬆️ Levantar", bootstyle=SUCCESS, command=self._up_containers).pack(side=LEFT, padx=(0, 6))
        ttk.Button(buttons, text="🔁 Reiniciar", bootstyle=WARNING, command=self._restart_containers).pack(side=LEFT, padx=(0, 6))
        ttk.Button(buttons, text="🛑 Detener", bootstyle=DANGER, command=self._down_containers).pack(side=LEFT, padx=(0, 6))
        ttk.Button(buttons, text="❌ Cerrar", bootstyle=DANGER, command=self.destroy).pack(side=RIGHT)

        # Lista simple de contenedores
        list_frame = ttk.LabelFrame(main, text="Contenedores", padding="10")
        list_frame.pack(fill=BOTH, expand=True)

        self.tree = ttk.Treeview(list_frame, columns=("id", "image", "name", "status"), show="headings", height=12)
        self.tree.pack(side=LEFT, fill=BOTH, expand=True)

        for col, txt, w in [("id", "ID", 200), ("image", "Imagen", 250), ("name", "Nombre", 200), ("status", "Estado", 150)]:
            self.tree.heading(col, text=txt)
            self.tree.column(col, width=w)

        scrollbar = ttk.Scrollbar(list_frame, orient=VERTICAL, command=self.tree.yview)
        scrollbar.pack(side=RIGHT, fill=Y)
        self.tree.configure(yscrollcommand=scrollbar.set)

        # Log
        log_frame = ttk.LabelFrame(main, text="Registro", padding="10")
        log_frame.pack(fill=BOTH, expand=False)

        self.log_text = ttk.Text(log_frame, height=8, wrap=WORD)
        self.log_text.pack(fill=BOTH)

    def _append_log(self, message: str) -> None:
        try:
            ts = datetime.now().strftime("%H:%M:%S")
            self.log_text.insert(END, f"[{ts}] {message}\n")
            self.log_text.see(END)
        except Exception:
            pass

    def _check_docker(self) -> None:
        running = self.manager.is_docker_running()
        msg = "Docker Engine está disponible" if running else "Docker Engine NO está disponible"
        icon = "✅" if running else "❌"
        out = f"{icon} {msg}"
        self._log(out)
        self._append_log(out)
        if running:
            self._refresh_containers()

    def _start_desktop(self) -> None:
        started = self.manager.start_docker_desktop()
        if not started:
            messagebox.showerror("Docker", "No se pudo iniciar Docker Desktop. Verifique la instalación.")
            return
        ok = self.manager.wait_for_engine()
        if ok:
            messagebox.showinfo("Docker", "Docker Engine está listo.")
            self._refresh_containers()
        else:
            messagebox.showerror("Docker", "No estuvo listo a tiempo.")

    def _up_containers(self) -> None:
        if not self.manager.is_docker_running():
            self._append_log("Docker no está arriba. Intentando iniciar Desktop...")
            if not self.manager.start_docker_desktop() or not self.manager.wait_for_engine():
                messagebox.showerror("Docker", "No fue posible iniciar Docker.")
                return
        ok = self.manager.compose_up()
        if ok:
            messagebox.showinfo("Docker", "Contenedores levantados.")
            self._refresh_containers()
        else:
            messagebox.showerror("Docker", "Fallo al levantar contenedores.")

    def _restart_containers(self) -> None:
        if not self.manager.is_docker_running():
            self._append_log("Docker no está arriba. Inicie Docker primero.")
            messagebox.showwarning("Docker", "Docker no está arriba.")
            return
        ok = self.manager.compose_restart()
        if ok:
            messagebox.showinfo("Docker", "Contenedores reiniciados.")
            self._refresh_containers()
        else:
            messagebox.showerror("Docker", "Fallo al reiniciar contenedores.")

    def _down_containers(self) -> None:
        if not self.manager.is_docker_running():
            self._append_log("Docker no está arriba. Intentaré detener igualmente (no tendrá efecto).")
        ok = self.manager.compose_down(remove_volumes=False)
        if ok:
            messagebox.showinfo("Docker", "Contenedores detenidos.")
            self._refresh_containers()
        else:
            messagebox.showerror("Docker", "Fallo al detener contenedores.")

    def _refresh_containers(self) -> None:
        # Limpiar
        for i in self.tree.get_children():
            self.tree.delete(i)
        # Cargar
        containers = self.manager.list_containers(all_containers=True)
        for c in containers:
            self.tree.insert("", END, values=(c.get('ID', ''), c.get('Image', ''), c.get('Names', ''), c.get('Status', '')))


