import os
import sys
import csv
import json
import threading
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Dict, Tuple

import tkinter as tk
from tkinter import ttk, messagebox, filedialog

try:
    import requests
except ImportError:
    requests = None


@dataclass
class DevelopmentRecord:
    remedy_id: str
    name: str
    state: str


@dataclass
class PlannedAction:
    action_type: str  # 'move' | 'create' | 'noop'
    remedy_id: str
    development_name: str
    source_path: Optional[str]
    target_path: str
    note: str


class DocumentManagementBotApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Bot de Gestión Documental - Desarrollos")
        self.root.geometry("1000x650")

        self.api_base_var = tk.StringVar(value="http://localhost:8000/api/v1")
        self.base_path_var = tk.StringVar(value=r"C:\\Users\\lerv8093\\OneDrive - Grupo Coomeva\\PROYECTOS DESARROLLOS\\Desarrollos")
        self.auth_header_var = tk.StringVar(value="")

        self.developments: List[DevelopmentRecord] = []
        self.planned_actions: List[PlannedAction] = []

        self._build_ui()

    def _build_ui(self) -> None:
        top_frame = ttk.Frame(self.root, padding=10)
        top_frame.pack(fill=tk.X)

        ttk.Label(top_frame, text="API Base URL:").grid(row=0, column=0, sticky=tk.W, padx=4, pady=4)
        ttk.Entry(top_frame, textvariable=self.api_base_var, width=50).grid(row=0, column=1, sticky=tk.W, padx=4, pady=4)

        ttk.Label(top_frame, text="Header Authorization (opcional):").grid(row=0, column=2, sticky=tk.W, padx=4, pady=4)
        ttk.Entry(top_frame, textvariable=self.auth_header_var, width=40).grid(row=0, column=3, sticky=tk.W, padx=4, pady=4)

        ttk.Label(top_frame, text="Ruta base local:").grid(row=1, column=0, sticky=tk.W, padx=4, pady=4)
        base_entry = ttk.Entry(top_frame, textvariable=self.base_path_var, width=50)
        base_entry.grid(row=1, column=1, sticky=tk.W, padx=4, pady=4)
        ttk.Button(top_frame, text="Elegir...", command=self._choose_folder).grid(row=1, column=2, sticky=tk.W, padx=4, pady=4)

        ttk.Button(top_frame, text="Cargar desarrollos", command=self._load_developments).grid(row=2, column=0, sticky=tk.W, padx=4, pady=8)
        ttk.Button(top_frame, text="Analizar carpeta local", command=self._analyze).grid(row=2, column=1, sticky=tk.W, padx=4, pady=8)
        ttk.Button(top_frame, text="Ejecutar acciones", command=self._execute).grid(row=2, column=2, sticky=tk.W, padx=4, pady=8)

        # Tabla de desarrollos
        dev_frame = ttk.LabelFrame(self.root, text="Desarrollos (desde API)", padding=10)
        dev_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

        self.dev_tree = ttk.Treeview(dev_frame, columns=("remedy", "name", "state"), show="headings", height=8)
        self.dev_tree.heading("remedy", text="Remedy ID")
        self.dev_tree.heading("name", text="Nombre")
        self.dev_tree.heading("state", text="Estado")
        self.dev_tree.column("remedy", width=150)
        self.dev_tree.column("name", width=550)
        self.dev_tree.column("state", width=120)
        self.dev_tree.pack(fill=tk.BOTH, expand=True)

        # Tabla de acciones
        actions_frame = ttk.LabelFrame(self.root, text="Acciones planificadas", padding=10)
        actions_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

        self.actions_tree = ttk.Treeview(actions_frame, columns=("type", "remedy", "name", "source", "target", "note"), show="headings", height=10)
        for col, title, w in [
            ("type", "Acción", 80),
            ("remedy", "Remedy", 120),
            ("name", "Nombre", 300),
            ("source", "Origen", 260),
            ("target", "Destino", 260),
            ("note", "Nota", 200),
        ]:
            self.actions_tree.heading(col, text=title)
            self.actions_tree.column(col, width=w)
        self.actions_tree.pack(fill=tk.BOTH, expand=True)

        # Barra de estado
        self.status_var = tk.StringVar(value="Listo")
        status_bar = ttk.Label(self.root, textvariable=self.status_var, anchor=tk.W)
        status_bar.pack(fill=tk.X, padx=10, pady=(0, 8))

    def _choose_folder(self) -> None:
        chosen = filedialog.askdirectory(initialdir=self.base_path_var.get() or os.getcwd())
        if chosen:
            self.base_path_var.set(chosen)

    def _set_status(self, msg: str) -> None:
        self.status_var.set(msg)
        self.root.update_idletasks()

    def _load_developments(self) -> None:
        if requests is None:
            messagebox.showerror("Dependencia faltante", "Falta el paquete 'requests'. Ejecute: pip install requests")
            return

        def worker():
            try:
                self._set_status("Cargando desarrollos del API...")
                base = self.api_base_var.get().rstrip('/')
                url = f"{base}/developments/"
                headers: Dict[str, str] = {}
                if self.auth_header_var.get().strip():
                    headers["Authorization"] = self.auth_header_var.get().strip()
                resp = requests.get(url, headers=headers, timeout=20)
                resp.raise_for_status()
                data = resp.json()

                parsed: List[DevelopmentRecord] = []
                # Intentamos mapear campos esperados: id Remedy + nombre + estado
                for item in data:
                    # Campos comunes en el backend del proyecto: id, name, general_status
                    remedy = str(item.get("id") or item.get("incident_id") or item.get("remedy_id") or "").strip()
                    name = str(item.get("name") or item.get("title") or "").strip()
                    state = str(item.get("general_status") or item.get("status") or "Pendiente").strip()
                    if not remedy or not name:
                        continue
                    parsed.append(DevelopmentRecord(remedy_id=remedy, name=name, state=state))

                self.developments = parsed
                self._reload_devs_table()
                self._set_status(f"Cargados {len(self.developments)} desarrollos")
            except Exception as e:
                messagebox.showerror("Error API", f"No se pudo cargar desarrollos: {e}")
                self._set_status("Error al cargar desarrollos")

        threading.Thread(target=worker, daemon=True).start()

    def _reload_devs_table(self) -> None:
        for row in self.dev_tree.get_children():
            self.dev_tree.delete(row)
        for d in self.developments:
            self.dev_tree.insert("", tk.END, values=(d.remedy_id, d.name, d.state))

    def _analyze(self) -> None:
        base = self.base_path_var.get().strip()
        if not base:
            messagebox.showwarning("Ruta base requerida", "Ingrese o elija la ruta base")
            return
        if not os.path.isdir(base):
            messagebox.showerror("Ruta inválida", f"No existe la ruta: {base}")
            return
        if not self.developments:
            if not messagebox.askyesno("Sin desarrollos", "No hay desarrollos cargados. ¿Analizar solo estructura local?"):
                return

        self._set_status("Analizando estructura local...")
        existing_map = self._index_existing_two_levels(base)
        planned: List[PlannedAction] = []

        for dev in self.developments:
            target_state_dir = os.path.join(base, dev.state)
            desired_name = f"{dev.remedy_id}_{dev.name}"

            found_path = existing_map.get(dev.remedy_id)
            if found_path:
                # Si ya existe, mover si el padre (estado) no coincide
                current_parent = os.path.dirname(found_path)
                if os.path.normcase(current_parent) != os.path.normcase(target_state_dir):
                    target_path = os.path.join(target_state_dir, os.path.basename(found_path))
                    planned.append(PlannedAction(
                        action_type="move",
                        remedy_id=dev.remedy_id,
                        development_name=dev.name,
                        source_path=found_path,
                        target_path=target_path,
                        note=f"Mover a estado '{dev.state}'"
                    ))
                else:
                    planned.append(PlannedAction(
                        action_type="noop",
                        remedy_id=dev.remedy_id,
                        development_name=dev.name,
                        source_path=found_path,
                        target_path=found_path,
                        note="Sin cambios"
                    ))
            else:
                # Crear nueva estructura bajo estado
                target_path = os.path.join(target_state_dir, desired_name)
                planned.append(PlannedAction(
                    action_type="create",
                    remedy_id=dev.remedy_id,
                    development_name=dev.name,
                    source_path=None,
                    target_path=target_path,
                    note=f"Crear carpeta y subcarpetas en '{dev.state}'"
                ))

        self.planned_actions = planned
        self._reload_actions_table()
        self._set_status(f"Análisis completado. Acciones: {len(self.planned_actions)}")

    def _reload_actions_table(self) -> None:
        for row in self.actions_tree.get_children():
            self.actions_tree.delete(row)
        for a in self.planned_actions:
            self.actions_tree.insert("", tk.END, values=(
                a.action_type,
                a.remedy_id,
                a.development_name,
                a.source_path or "-",
                a.target_path,
                a.note,
            ))

    def _index_existing_two_levels(self, base: str) -> Dict[str, str]:
        remedy_to_path: Dict[str, str] = {}
        # Recorre primer nivel (estados) y segundo nivel (desarrollos)
        try:
            for lvl1_name in os.listdir(base):
                lvl1_path = os.path.join(base, lvl1_name)
                if not os.path.isdir(lvl1_path):
                    continue
                for lvl2_name in os.listdir(lvl1_path):
                    lvl2_path = os.path.join(lvl1_path, lvl2_name)
                    if not os.path.isdir(lvl2_path):
                        continue
                    # Intentar extraer remedy id: prefijo antes del primer '_'
                    parts = lvl2_name.split('_', 1)
                    if parts and parts[0]:
                        remedy_candidate = parts[0].strip()
                        # Aceptamos si tiene dígitos/letras, no validamos formato
                        if remedy_candidate:
                            remedy_to_path[remedy_candidate] = lvl2_path
        except Exception:
            pass
        return remedy_to_path

    def _execute(self) -> None:
        if not self.planned_actions:
            messagebox.showinfo("Sin acciones", "No hay acciones planificadas para ejecutar")
            return
        if not messagebox.askyesno("Confirmar", "¿Ejecutar las acciones planificadas?\nSe crearán/moverán carpetas."):
            return

        base = self.base_path_var.get().strip()
        log_rows: List[Tuple[str, str, str, str, str]] = []  # fecha, accion, remedy, estado/carpeta, detalle

        for action in self.planned_actions:
            try:
                if action.action_type == "noop":
                    log_rows.append((self._now(), "NOOP", action.remedy_id, action.target_path, action.note))
                    continue

                target_parent = os.path.dirname(action.target_path)
                if not os.path.isdir(target_parent):
                    os.makedirs(target_parent, exist_ok=True)

                if action.action_type == "move":
                    if action.source_path and os.path.isdir(action.source_path):
                        os.replace(action.source_path, action.target_path)
                        log_rows.append((self._now(), "MOVE", action.remedy_id, action.target_path, action.note))
                    else:
                        log_rows.append((self._now(), "SKIP", action.remedy_id, action.target_path, "Origen no existe"))

                elif action.action_type == "create":
                    if not os.path.isdir(action.target_path):
                        os.makedirs(action.target_path, exist_ok=True)
                        for sub in ("Correos", "Formatos", "Documentos"):
                            os.makedirs(os.path.join(action.target_path, sub), exist_ok=True)
                        log_rows.append((self._now(), "CREATE", action.remedy_id, action.target_path, action.note))
                    else:
                        log_rows.append((self._now(), "SKIP", action.remedy_id, action.target_path, "Ya existía"))
            except Exception as e:
                log_rows.append((self._now(), "ERROR", action.remedy_id, action.target_path, str(e)))

        # Guardar log CSV en la carpeta del bot
        try:
            log_dir = os.path.join(os.path.dirname(__file__), "logs")
            os.makedirs(log_dir, exist_ok=True)
            log_path = os.path.join(log_dir, f"bot_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
            with open(log_path, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["fecha", "accion", "remedy", "ruta", "detalle"])
                for row in log_rows:
                    writer.writerow(row)
            messagebox.showinfo("Completado", f"Acciones ejecutadas. Log: {log_path}")
        except Exception as e:
            messagebox.showwarning("Log no guardado", f"No se pudo guardar el log: {e}")

        self._set_status("Ejecución terminada")

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def main() -> None:
    root = tk.Tk()
    app = DocumentManagementBotApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()


